import { NextResponse } from "next/server";
import { discoverCompanies, ApolloError } from "@/lib/apollo";
import { getKnownDomains, incrementApolloCreditsUsed } from "@/lib/data";
import { normalizeDomain } from "@/lib/matching";
import { getSessionUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { location, keywords, minEmployees, maxEmployees, page } = await request.json();

    if (!location && !keywords) {
      return NextResponse.json(
        { error: "Enter a location or keywords to search." },
        { status: 400 }
      );
    }

    const rawResults = await discoverCompanies({
      location: location ?? "",
      keywords: keywords ?? "",
      minEmployees,
      maxEmployees,
      perPage: 50,
      page: page ?? 1,
    });

    const knownDomains = await getKnownDomains();
    const deduped = rawResults.filter((r) => {
      const domain = normalizeDomain(r.website);
      return !domain || !knownDomains.has(domain);
    });
    const duplicateCount = rawResults.length - deduped.length;

    // A company with no website can never be enriched (Apollo's enrich/contact
    // lookups both key off a domain) and can never get contacts (Find Contacts
    // requires one) — it's a dead end on this board no matter how it scores.
    // Drop it here instead of letting reps waste a pick on an unworkable stub.
    const results = deduped.filter((r) => Boolean(r.website));
    const noWebsiteCount = deduped.length - results.length;
    const filteredOutCount = duplicateCount + noWebsiteCount;

    const creditsUsed = await incrementApolloCreditsUsed();

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        creditsUsed,
        message:
          filteredOutCount > 0
            ? `All ${filteredOutCount} matches are already on your board, previously discarded, or have no website on file (can't be enriched or matched to contacts). Try different criteria or "show different batch."`
            : "No companies matched those criteria.",
      });
    }

    const messageParts: string[] = [];
    if (duplicateCount > 0) messageParts.push(`${duplicateCount} already-known companies`);
    if (noWebsiteCount > 0)
      messageParts.push(`${noWebsiteCount} with no website on file (can't be enriched or matched to contacts)`);

    return NextResponse.json({
      results,
      creditsUsed,
      ...(messageParts.length > 0 ? { message: `Hid ${messageParts.join(" and ")}.` } : {}),
    });
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
