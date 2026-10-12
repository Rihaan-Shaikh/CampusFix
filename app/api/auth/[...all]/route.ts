import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import {
  signAuthorizationToken,
  serializeAuthCookie,
  serializeClearAuthCookie,
} from "@/lib/auth-token";

const baseHandler = toNextJsHandler(auth.handler);

/**
 * Intercepts Better Auth responses to synchronize the short-lived authorization JWT.
 * Better Auth remains the authoritative identity and session manager in PostgreSQL.
 * The authorization JWT is issued strictly after Better Auth verifies or establishes a session.
 */
async function syncAuthorizationCookie(req: NextRequest, res: Response): Promise<Response> {
  const pathname = req.nextUrl.pathname;
  const isProduction = process.env.NODE_ENV === "production";

  // Handle explicit sign-out requests: immediately clear authorization cookie
  if (pathname.endsWith("/sign-out")) {
    const newHeaders = new Headers(res.headers);
    newHeaders.append("Set-Cookie", serializeClearAuthCookie(isProduction));
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  }

  // Inspect Set-Cookie headers for session creation or invalidation
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];

  let createdSessionToken: string | null = null;
  let isClearingSession = false;

  for (const cookieStr of setCookies) {
    if (cookieStr.includes("better-auth.session_token")) {
      if (cookieStr.includes("Max-Age=0") || cookieStr.includes("Expires=Thu, 01 Jan 1970")) {
        isClearingSession = true;
      } else {
        const match = cookieStr.match(
          /(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/
        );
        if (match && match[1]) {
          createdSessionToken = match[1];
        }
      }
    }
  }

  if (isClearingSession) {
    const newHeaders = new Headers(res.headers);
    newHeaders.append("Set-Cookie", serializeClearAuthCookie(isProduction));
    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    });
  }

  // Case 1: Session token set in response (email sign-in, email registration, OAuth callbacks)
  if (createdSessionToken) {
    try {
      const sessionRecord = await prisma.session.findUnique({
        where: { token: createdSessionToken },
        include: { user: true },
      });

      if (sessionRecord?.user) {
        const jwt = await signAuthorizationToken({
          userId: sessionRecord.user.id,
          role: sessionRecord.user.role,
          email: sessionRecord.user.email,
        });

        const newHeaders = new Headers(res.headers);
        newHeaders.append("Set-Cookie", serializeAuthCookie(jwt, isProduction));
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: newHeaders,
        });
      }
    } catch (err) {
      console.error("Failed to issue authorization token from session record:", err);
    }
  }

  // Case 2: Session resolution endpoint (e.g. /get-session) returning active user profile
  if (res.status === 200 && (pathname.endsWith("/get-session") || pathname.endsWith("/session"))) {
    try {
      const cloned = res.clone();
      const body = await cloned.json().catch(() => null);
      if (body?.user?.id && body?.user?.email) {
        const jwt = await signAuthorizationToken({
          userId: body.user.id,
          role: body.user.role || "MEMBER",
          email: body.user.email,
        });

        const newHeaders = new Headers(res.headers);
        newHeaders.append("Set-Cookie", serializeAuthCookie(jwt, isProduction));
        return new Response(res.body, {
          status: res.status,
          statusText: res.statusText,
          headers: newHeaders,
        });
      }
    } catch {
      // In case body cannot be parsed as JSON, proceed with base response
    }
  }

  return res;
}

export async function GET(req: NextRequest) {
  const res = await baseHandler.GET(req);
  return syncAuthorizationCookie(req, res);
}

export async function POST(req: NextRequest) {
  const res = await baseHandler.POST(req);
  return syncAuthorizationCookie(req, res);
}
