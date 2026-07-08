import { NextResponse } from "next/server";
import { getLeadById, saveEnrichedContact, incrementApolloCreditsUsed } from "@/lib/data";
import { enrichContact, ApolloError } from "@/lib/apollo";
import { getSessionUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { leadId, apolloPersonId } = await request.json();
    if (!leadId || !apolloPersonId) {
      return NextResponse.json(
        { error: "Missing leadId or apolloPersonId." },
        { status: 400 }
      );
    }

    const lead = await getLeadById(leadId);
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    if (user.role !== "admin" && lead.owner !== user.username) {
      return NextResponse.json({ error: "Not your lead." }, { status: 403 });
    }

    const enriched = await enrichContact(apolloPersonId);
    const contact = await saveEnrichedContact(leadId, enriched);
    const creditsUsed = await incrementApolloCreditsUsed();

    return NextResponse.json({ contact, creditsUsed, phonePending: enriched.phonePending });
  } catch (err) {
    if (err instanceof ApolloError) {
      const status = err.kind === "no_match" ? 404 : 502;
      return NextResponse.json({ error: err.message }, { status });
    }
    return NextResponse.json(
      { error: "Something went wrong enriching this contact." },
      { status: 500 }
    );
  }
}
