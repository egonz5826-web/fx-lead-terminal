import { NextResponse } from "next/server";
import { createLeadsFromDiscovery } from "@/lib/data";
import type { OrganizationSearchResult } from "@/lib/apollo";
import { getSessionUser } from "@/lib/users";
import { UNASSIGNED } from "@/lib/team";

// Discovery enriches + AI-scores each new lead, so give it room.
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { companies, corridor, currencyExposure, owner, keywords } = await request.json();

    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: "No companies selected." }, { status: 400 });
    }
    // Corridor and currency are optional — a rep can add leads without pinning
    // either (they default to "Any" / "Unspecified").

    // Discovered leads go into the shared pool so everyone can see them; a rep
    // claims one later by marking it Prospect. An admin may still assign a
    // batch directly to a specific rep.
    const assignedOwner =
      user.role === "admin" && typeof owner === "string" && owner ? owner : UNASSIGNED;

    const result = await createLeadsFromDiscovery(companies as OrganizationSearchResult[], {
      corridor: typeof corridor === "string" ? corridor : "",
      currencyExposure: typeof currencyExposure === "string" ? currencyExposure : "",
      owner: assignedOwner,
      discoveredBy: user.username,
      keywords: typeof keywords === "string" ? keywords : "",
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
