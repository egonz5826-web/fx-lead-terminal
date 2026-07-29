import { NextResponse } from "next/server";
import { updateClient, deleteClient } from "@/lib/client-book";
import { getSessionUser } from "@/lib/users";
import { sanitize } from "../route";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const { id } = await context.params;
  try {
    await updateClient(id, sanitize(await request.json()));
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
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const { id } = await context.params;
  try {
    await deleteClient(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
