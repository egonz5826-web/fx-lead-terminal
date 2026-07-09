import { NextResponse } from "next/server";
import {
  deleteLead,
  updateLeadNotes,
  updateLeadOwner,
  updateLeadStatus,
  userCanActOnLead,
} from "@/lib/data";
import { getSessionUser } from "@/lib/users";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { id } = await context.params;
    const body = await request.json();
    const isAdmin = user.role === "admin";

    // Reps may act on shared (unclaimed) leads or ones they've claimed — but
    // never on a lead another rep has claimed (Prospect/Client).
    if (!isAdmin && !(await userCanActOnLead(id, user.username))) {
      return NextResponse.json({ error: "This lead is claimed by another rep." }, { status: 403 });
    }

    if (typeof body.status === "string") {
      await updateLeadStatus(id, body.status, user.username);
    }
    // Reassigning ownership is admin-only.
    if (typeof body.owner === "string") {
      if (!isAdmin) {
        return NextResponse.json({ error: "Only an admin can reassign." }, { status: 403 });
      }
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
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { id } = await context.params;
    if (user.role !== "admin" && !(await userCanActOnLead(id, user.username))) {
      return NextResponse.json({ error: "This lead is claimed by another rep." }, { status: 403 });
    }

    await deleteLead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
