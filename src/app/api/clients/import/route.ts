import { NextResponse } from "next/server";
import { appendExistingClients, clearExistingClients } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Admin only." }, { status: 403 });
    }

    const { rows, reset } = await request.json();

    if (!Array.isArray(rows)) {
      return NextResponse.json({ error: "Malformed batch." }, { status: 400 });
    }

    if (reset) {
      await clearExistingClients();
    }

    const inserted = await appendExistingClients(rows);
    return NextResponse.json({ inserted });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
