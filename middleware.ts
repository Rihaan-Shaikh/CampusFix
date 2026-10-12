import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, verifyAuthorizationToken } from "@/lib/auth-token";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Inspect Edge authorization token cookie
  const authCookie = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const verifiedPayload = authCookie ? await verifyAuthorizationToken(authCookie) : null;

  // 2. Inspect durable Better Auth session cookie
  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  const hasActiveSession = Boolean(verifiedPayload || sessionToken);

  // 3. Auth pages (/sign-in, /sign-up): prevent authenticated users from flashing login screens
  if (pathname === "/sign-in" || pathname === "/sign-up") {
    if (hasActiveSession) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/";
      return NextResponse.redirect(new URL(callbackUrl, req.url));
    }
    return NextResponse.next();
  }

  // 4. Protected Admin API endpoints (/api/admin/*)
  if (pathname.startsWith("/api/admin")) {
    if (verifiedPayload) {
      if (verifiedPayload.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Forbidden: Requires ADMIN operational role" },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 }
      );
    }

    // If session token exists without cached JWT, proceed to server-side RBAC validation
    return NextResponse.next();
  }

  // 5. Protected Admin pages (/admin, /admin/*)
  if (pathname.startsWith("/admin")) {
    if (verifiedPayload) {
      if (verifiedPayload.role !== "ADMIN") {
        // Fast edge-level RBAC block: redirect unauthorized roles to home workspace
        return NextResponse.redirect(new URL("/", req.url));
      }
      return NextResponse.next();
    }

    if (!sessionToken) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Session token exists without cached JWT: allow server AdminLayout to enforce authorization
    return NextResponse.next();
  }

  // 6. Protected Campus Workspace Root (/)
  if (pathname === "/") {
    if (!hasActiveSession) {
      return NextResponse.redirect(new URL("/sign-in", req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/admin/:path*", "/sign-in", "/sign-up"],
};
