import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (but not /admin/login itself)
  if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }

  const password = process.env.ADMIN_PASSWORD;

  // If no password is set, allow through (local dev without env var)
  if (!password) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(ADMIN_COOKIE);
  if (sessionCookie?.value === password) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};

export { ADMIN_COOKIE, COOKIE_MAX_AGE };
