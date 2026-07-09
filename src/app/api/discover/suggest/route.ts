import { NextResponse } from "next/server";
import { suggestKeywords } from "@/lib/ai-suggest";
import { getSessionUser } from "@/lib/users";

// AI keyword suggestions for the Discover search box. Pennies per call (Haiku),
// no Apollo credits.
export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { keywords } = await request.json();
    const seed = typeof keywords === "string" ? keywords.trim() : "";
    if (seed.length < 2) return NextResponse.json({ suggestions: [] });

    const suggestions = await suggestKeywords(seed.slice(0, 120));
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggestion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
