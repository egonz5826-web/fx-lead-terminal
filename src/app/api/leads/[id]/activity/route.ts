import { NextResponse } from "next/server";
import { getLeadActivity, userCanActOnLead } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

export async function GET(
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
    return NextResponse.json({ events: await getLeadActivity(id) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't load activity.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
