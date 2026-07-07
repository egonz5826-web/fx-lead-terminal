import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "fx_session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/");

  const expected = process.env.APP_PASSWORD;

  if (!expected || password !== expected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    if (from && from !== "/login") url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  }

  const redirectTo = from && from.startsWith("/") && from !== "/login" ? from : "/";
  const response = NextResponse.redirect(new URL(redirectTo, request.url), {
    status: 303,
  });

  response.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}
