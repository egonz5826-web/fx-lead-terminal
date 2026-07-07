import { NextResponse } from "next/server";
import { getLeadById, saveEnrichedContact, incrementApolloCreditsUsed } from "@/lib/data";
import { enrichContact, ApolloError } from "@/lib/apollo";

export async function POST(request: Request) {
  try {
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
