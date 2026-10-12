import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signAuthorizationToken, serializeAuthCookie } from "@/lib/auth-token";

export async function GET(req: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized: No active Better Auth session found" },
        { status: 401 }
      );
    }

    const role = (session.user as unknown as { role?: string }).role || "MEMBER";
    const jwt = await signAuthorizationToken({
      userId: session.user.id,
      email: session.user.email,
      role,
    });

    const isProduction = process.env.NODE_ENV === "production";
    const response = NextResponse.json({
      success: true,
      user: {
        id: session.user.id,
        email: session.user.email,
        role,
      },
    });

    response.headers.append("Set-Cookie", serializeAuthCookie(jwt, isProduction));
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate authorization token" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
