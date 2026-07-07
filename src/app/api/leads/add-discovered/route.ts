import { NextResponse } from "next/server";
import { createLeadsFromDiscovery } from "@/lib/data";
import type { OrganizationSearchResult } from "@/lib/apollo";

export async function POST(request: Request) {
  try {
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

    const added = await createLeadsFromDiscovery(companies as OrganizationSearchResult[], {
      corridor,
      currencyExposure,
      owner: owner ?? "",
    });

    return NextResponse.json({ added });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add leads.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
