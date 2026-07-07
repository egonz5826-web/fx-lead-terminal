import { NextResponse } from "next/server";
import { deleteLead, updateLeadNotes, updateLeadOwner, updateLeadStatus } from "@/lib/data";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    if (typeof body.status === "string") {
      await updateLeadStatus(id, body.status);
    }
    if (typeof body.owner === "string") {
      await updateLeadOwner(id, body.owner);
    }
    if ("notes" in body || "follow_up_date" in body) {
      await updateLeadNotes(id, {
        notes: body.notes,
        follow_up_date: body.follow_up_date ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
