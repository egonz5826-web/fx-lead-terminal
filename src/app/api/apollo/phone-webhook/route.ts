import { NextResponse } from "next/server";
import { updateContactPhoneByApolloId } from "@/lib/data";

interface WebhookPerson {
  id: string;
  phone_numbers?: { sanitized_number?: string; raw_number?: string }[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const people: WebhookPerson[] = body.people ?? [];

    await Promise.all(
      people.map(async (p) => {
        const phone = p.phone_numbers?.[0]?.sanitized_number ?? p.phone_numbers?.[0]?.raw_number;
        if (phone) {
          await updateContactPhoneByApolloId(p.id, phone).catch(() => {});
        }
      })
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
