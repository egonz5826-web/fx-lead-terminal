import { NextResponse } from "next/server";
import { releaseStaleClaims } from "@/lib/data";

// Runs daily (Vercel Cron). Returns any claimed lead that hasn't reached
// Client within 15 days of being picked back to the public pool.
// Secured with CRON_SECRET so only Vercel Cron (or an admin with the secret)
// can trigger it.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  try {
    const result = await releaseStaleClaims();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Release failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
