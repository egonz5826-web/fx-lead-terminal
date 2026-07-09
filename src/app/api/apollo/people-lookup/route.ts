import { NextResponse } from "next/server";
import { searchPeopleByName, ApolloError } from "@/lib/apollo";
import { getSessionUser } from "@/lib/users";

// Free people search by name (+ optional company / title). Does not spend
// Apollo credits — revealing a person's email/phone is a separate paid step.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { name, company, title } = await request.json();
    if (
      (typeof name !== "string" || name.trim().length < 2) &&
      (typeof company !== "string" || company.trim().length < 2)
    ) {
      return NextResponse.json(
        { error: "Enter a person's name or a company." },
        { status: 400 }
      );
    }

    const results = await searchPeopleByName({
      name: typeof name === "string" ? name : "",
      company: typeof company === "string" ? company : "",
      title: typeof title === "string" ? title : "",
    });

    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof ApolloError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json(
      { error: "Something went wrong searching for people." },
      { status: 500 }
    );
  }
}
