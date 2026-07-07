import { NextResponse } from "next/server";
import { discoverCompanies, ApolloError } from "@/lib/apollo";
import { incrementApolloCreditsUsed } from "@/lib/data";

export async function POST(request: Request) {
  try {
    const { location, keywords, minEmployees, maxEmployees } = await request.json();

    if (!location && !keywords) {
      return NextResponse.json(
        { error: "Enter a location or keywords to search." },
        { status: 400 }
      );
    }

    const results = await discoverCompanies({
      location: location ?? "",
      keywords: keywords ?? "",
      minEmployees,
      maxEmployees,
      perPage: 25,
    });

    const creditsUsed = await incrementApolloCreditsUsed();

    if (results.length === 0) {
      return NextResponse.json({
        results: [],
        creditsUsed,
        message: "No companies matched those criteria.",
      });
    }

    return NextResponse.json({ results, creditsUsed });
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
