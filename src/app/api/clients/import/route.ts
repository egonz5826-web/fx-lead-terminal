import { NextResponse } from "next/server";
import { appendExistingClients, clearExistingClients } from "@/lib/data";

export async function POST(request: Request) {
  try {
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
