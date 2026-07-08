import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getUserByUsername } from "@/lib/users";
import { signSession, verifyPassword } from "@/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "/");

  function fail() {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "1");
    if (from && from !== "/login") url.searchParams.set("from", from);
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!username || !password) return fail();

  const user = await getUserByUsername(username);
  if (!user) return fail();

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return fail();

  const redirectTo = from && from.startsWith("/") && from !== "/login" ? from : "/";
  const response = NextResponse.redirect(new URL(redirectTo, request.url), {
    status: 303,
  });

  response.cookies.set("fx_session", signSession(user.username), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  return response;
}
