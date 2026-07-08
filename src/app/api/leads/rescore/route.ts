import { NextResponse } from "next/server";
import { rescoreLeads } from "@/lib/data";

// Re-scores leads in batches using live Apollo firmographics. Costs 1 Apollo
// credit per lead that has a website. Call repeatedly with increasing offset
// until `remaining` is 0.
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 25));
    const offset = Math.max(0, Number(body.offset) || 0);

    const result = await rescoreLeads(limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rescore failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
