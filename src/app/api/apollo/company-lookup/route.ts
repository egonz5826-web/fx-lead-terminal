import { NextResponse } from "next/server";
import { searchCompanyByName, ApolloError } from "@/lib/apollo";
import { incrementApolloCreditsUsed } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

// Look up one specific company by name. Costs Apollo search credits.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { name } = await request.json();
    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Enter a company name." }, { status: 400 });
    }

    const results = await searchCompanyByName(name);
    const creditsUsed = await incrementApolloCreditsUsed();

    return NextResponse.json({ results, creditsUsed });
  } catch (err) {
    if (err instanceof ApolloError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Something went wrong looking up that company." },
      { status: 500 }
    );
  }
}
