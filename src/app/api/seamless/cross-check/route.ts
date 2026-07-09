import { NextResponse } from "next/server";
import { seamlessPhonesForContacts, SeamlessError } from "@/lib/seamless";
import {
  addSeamlessPhones,
  getLeadById,
  getContactsByLeadIds,
  userCanActOnLead,
} from "@/lib/data";
import { getSessionUser } from "@/lib/users";

// Seamless polling can take a few seconds — give the function room.
export const maxDuration = 30;

// Cross-checks a lead's known contacts against Seamless.AI and saves any phone
// numbers Apollo didn't have. Costs Seamless credits (1 per contact researched).
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { leadId } = await request.json();
    if (!leadId) return NextResponse.json({ error: "Missing leadId." }, { status: 400 });

    if (user.role !== "admin" && !(await userCanActOnLead(leadId, user.username))) {
      return NextResponse.json(
        { error: "This lead is claimed by another rep." },
        { status: 403 }
      );
    }

    const lead = await getLeadById(leadId);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    const contactsByLead = await getContactsByLeadIds([leadId]);
    const contacts = contactsByLead[leadId] ?? [];
    if (contacts.length === 0) {
      return NextResponse.json({
        added: 0,
        phones: [],
        message: "Find contacts on this lead first (Apollo), then cross-check with Seamless.",
      });
    }

    // Cap at 3 contacts to bound Seamless credit spend per click.
    const inputs = contacts
      .slice(0, 3)
      .map((c) => ({ name: c.name, company: lead.company_name }));

    const found = await seamlessPhonesForContacts(inputs);
    const { added, phones } = await addSeamlessPhones(leadId, found);

    return NextResponse.json({
      added,
      phones,
      message:
        added > 0
          ? `Added ${added} new phone number${added === 1 ? "" : "s"} from Seamless.`
          : "Seamless found no new numbers beyond what you already have.",
    });
  } catch (err) {
    if (err instanceof SeamlessError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    const message = err instanceof Error ? err.message : "Seamless cross-check failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
