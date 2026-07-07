import { NextResponse } from "next/server";
import { discoverCompanies, ApolloError } from "@/lib/apollo";
import { getKnownDomains, incrementApolloCreditsUsed } from "@/lib/data";
import { normalizeDomain } from "@/lib/matching";

export async function POST(request: Request) {
  try {
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
    const results = rawResults.filter((r) => {
      const domain = normalizeDomain(r.website);
      return !domain || !knownDomains.has(domain);
    });
    const filteredOutCount = rawResults.length - results.length;

    const creditsUsed = await incrementApolloCreditsUsed();

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        creditsUsed,
        message:
          filteredOutCount > 0
            ? `All ${filteredOutCount} matches are already on your board or previously discarded. Try different criteria or "show different batch."`
            : "No companies matched those criteria.",
      });
    }

    return NextResponse.json({
      results,
      creditsUsed,
      ...(filteredOutCount > 0
        ? { message: `Hid ${filteredOutCount} already-known companies from these results.` }
        : {}),
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
