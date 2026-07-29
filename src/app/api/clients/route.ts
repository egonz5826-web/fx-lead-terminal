import { NextResponse } from "next/server";
import { addClient, type ClientInput } from "@/lib/client-book";
import { getSessionUser } from "@/lib/users";

const FIELDS: (keyof ClientInput)[] = [
  "number", "name", "status", "on_sf", "consultant", "website", "referenciador",
  "communication", "dealer", "traded", "last_follow_up", "follow_up", "comments",
  "contact_rr",
];

export function sanitize(body: Record<string, unknown>): ClientInput {
  const out: ClientInput = {};
  for (const k of FIELDS) {
    if (k in body) (out as Record<string, unknown>)[k] = body[k];
  }
  return out;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const body = await request.json();
  if (!body?.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
  }
  try {
    const client = await addClient(sanitize(body), "jesus");
    return NextResponse.json({ client });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add client.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
