import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, COOKIE_MAX_AGE } from "@/proxy";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/admin";

  const correctPassword = process.env.ADMIN_PASSWORD;

  if (!correctPassword || password !== correctPassword) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", next);
    loginUrl.searchParams.set("error", "1");
    return NextResponse.redirect(loginUrl, { status: 303 });
  }


  const response = NextResponse.redirect(new URL(next, request.url), {
    status: 303,
  });
  response.cookies.set(ADMIN_COOKIE, correctPassword, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
