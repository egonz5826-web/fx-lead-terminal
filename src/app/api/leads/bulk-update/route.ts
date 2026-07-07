import { NextResponse } from "next/server";
import { bulkUpdateLeadOwner } from "@/lib/data";

export async function PATCH(request: Request) {
  try {
    const { leadIds, owner } = await request.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return NextResponse.json({ error: "No leads selected." }, { status: 400 });
    }
    if (typeof owner !== "string") {
      return NextResponse.json({ error: "Missing owner." }, { status: 400 });
    }

    await bulkUpdateLeadOwner(leadIds, owner);
    return NextResponse.json({ ok: true, updated: leadIds.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bulk update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
