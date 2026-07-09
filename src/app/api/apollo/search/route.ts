import { NextResponse } from "next/server";
import { getLeadById, userCanActOnLead } from "@/lib/data";
import { searchContacts, ApolloError } from "@/lib/apollo";
import { getSessionUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { leadId } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId." }, { status: 400 });
    }

    const lead = await getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (user.role !== "admin" && !(await userCanActOnLead(leadId, user.username))) {
      return NextResponse.json(
        { error: "This lead is claimed by another rep." },
        { status: 403 }
      );
    }
    if (!lead.website) {
      return NextResponse.json(
        { error: "This lead has no website on file, so Apollo can't match a company." },
        { status: 422 }
      );
    }

    const matches = await searchContacts(lead.website);

    if (matches.length === 0) {
      return NextResponse.json({ matches: [], message: "No matches found for this company." });
    }

    return NextResponse.json({ matches });
  } catch (err) {
    if (err instanceof ApolloError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Something went wrong searching Apollo." },
      { status: 500 }
    );
  }
}
