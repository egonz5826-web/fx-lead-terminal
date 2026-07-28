import { NextResponse } from "next/server";
import { getFxMoves } from "@/lib/fx";

export const dynamic = "force-dynamic";

export async function GET() {
  const { date, pairs } = await getFxMoves();
  if (pairs.length === 0) {
    return NextResponse.json({ error: "Unable to fetch FX rates right now." }, { status: 502 });
  }
  return NextResponse.json({ date, pairs });
}
