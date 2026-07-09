import { NextResponse } from "next/server";
import { aiScoreLeads } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

// AI-scores leads in batches via Claude Haiku (pennies per lead, no Apollo
// credits). Call repeatedly with increasing offset until `remaining` is 0.
// Admin only — it touches the whole board.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const limit = Math.min(50, Math.max(1, Number(body.limit) || 20));
    const offset = Math.max(0, Number(body.offset) || 0);

    const result = await aiScoreLeads(limit, offset);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI scoring failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
