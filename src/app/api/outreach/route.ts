import { NextResponse } from "next/server";
import { draftOutreach } from "@/lib/ai-outreach";
import { getLeadById, userCanActOnLead } from "@/lib/data";
import { getFxMoves, hotPairs } from "@/lib/fx";
import { getSessionUser } from "@/lib/users";

export const maxDuration = 60;

// AI-drafts a cold email + phone opener for a lead, weaving in a live FX move
// as the "why now" when the lead's corridor is active today.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { leadId, contactName } = await request.json();
    if (!leadId) return NextResponse.json({ error: "Missing leadId." }, { status: 400 });

    if (user.role !== "admin" && !(await userCanActOnLead(leadId, user.username))) {
      return NextResponse.json(
        { error: "This lead is claimed by another rep." },
        { status: 403 }
      );
    }

    const lead = await getLeadById(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    // Is one of the lead's currency pairs moving sharply today?
    let trigger: string | null = null;
    try {
      const hot = hotPairs((await getFxMoves()).pairs);
      for (const p of (lead.currency_exposure ?? "").split(",").map((s) => s.trim())) {
        if (hot[p] !== undefined) {
          const mv = hot[p];
          trigger = `${p} moved ${mv >= 0 ? "+" : ""}${mv}% today`;
          break;
        }
      }
    } catch {
      trigger = null;
    }

    const draft = await draftOutreach({
      company_name: lead.company_name,
      city: lead.city,
      state: lead.state,
      industry: lead.industry,
      import_corridors: lead.import_corridors,
      currency_exposure: lead.currency_exposure,
      ai_rationale: lead.ai_rationale,
      latest_signal: lead.latest_signal,
      trigger,
      contactName: typeof contactName === "string" ? contactName : null,
    });

    return NextResponse.json({ draft, trigger });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't draft outreach.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
