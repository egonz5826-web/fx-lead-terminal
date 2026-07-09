import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "./lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/login" ||
    pathname.startsWith("/api/login") ||
    pathname === "/api/apollo/phone-webhook" ||
    pathname.startsWith("/api/cron/")
  ) {
    // Cron routes run unauthenticated (Vercel Cron has no session); they guard
    // themselves with CRON_SECRET.
    return NextResponse.next();
  }

  const session = request.cookies.get("fx_session")?.value;
  const username = verifySession(session);

  if (!username) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico)).*)",
  ],
};
