import { NextResponse } from "next/server";
import { getContactPhoneByApolloId } from "@/lib/data";
import { getSessionUser } from "@/lib/users";

// Lightweight poll endpoint: returns a contact's current phone number by Apollo
// person id, so the UI can pick up a phone Apollo reveals asynchronously
// (via webhook) without a full page refresh. No Apollo credits.
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const apolloPersonId = new URL(request.url).searchParams.get("apolloPersonId");
  if (!apolloPersonId) {
    return NextResponse.json({ error: "Missing apolloPersonId." }, { status: 400 });
  }

  const phone = await getContactPhoneByApolloId(apolloPersonId);
  return NextResponse.json({ phone });
}
