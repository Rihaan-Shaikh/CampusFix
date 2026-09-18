import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Better Auth session cookies
  const sessionToken =
    req.cookies.get("better-auth.session_token")?.value ||
    req.cookies.get("__Secure-better-auth.session_token")?.value;

  // Root route: when unauthenticated, redirect to /sign-in
  if (pathname === "/" && !sessionToken) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Protected Admin Routes: /admin/*
  if (pathname.startsWith("/admin")) {
    if (!sessionToken) {
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/admin/:path*"],
};

