import { NextResponse } from "next/server";
import { createLeadsFromDiscovery } from "@/lib/data";
import type { OrganizationSearchResult } from "@/lib/apollo";
import { getSessionUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { companies, corridor, currencyExposure, owner } = await request.json();

    if (!Array.isArray(companies) || companies.length === 0) {
      return NextResponse.json({ error: "No companies selected." }, { status: 400 });
    }
    if (!corridor || !currencyExposure) {
      return NextResponse.json(
        { error: "Corridor and currency exposure are required." },
        { status: 400 }
      );
    }

    // Discovered leads belong to the person who found them. Only an admin may
    // assign them to someone else.
    const assignedOwner =
      user.role === "admin" && typeof owner === "string" && owner ? owner : user.username;

    const result = await createLeadsFromDiscovery(companies as OrganizationSearchResult[], {
      corridor,
      currencyExposure,
      owner: assignedOwner,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
