import "server-only";

// Seamless.AI contact enrichment. Flow: POST /contacts/research returns
// requestIds (async, 1 credit each), then GET /contacts/research/poll until
// each result's status is "done". Phones come back as contactPhone1/2 and
// companyPhone1..3. Auth is the API key in a `Token` header.

const BASE = "https://api.seamless.ai/api/client/v1";

export class SeamlessError extends Error {}

function getKey(): string {
  const key = process.env.SEAMLESS_API_KEY;
  if (!key) throw new SeamlessError("No Seamless API key configured (SEAMLESS_API_KEY).");
  return key;
}

export interface SeamlessContactInput {
  name: string;
  company: string;
}

interface PollContact {
  contactPhone1?: string | null;
  contactPhone2?: string | null;
  companyPhone1?: string | null;
  companyPhone2?: string | null;
  companyPhone3?: string | null;
}

const TERMINAL = new Set([
  "done",
  "error",
  "missing",
  "not found",
  "duplicate",
  "contact-already-researched",
  "No license or credits available",
]);

// Researches the given contacts on Seamless and polls for every phone number
// it finds (both direct-contact and company numbers), de-duplicated.
export async function seamlessPhonesForContacts(
  contacts: SeamlessContactInput[]
): Promise<string[]> {
  if (contacts.length === 0) return [];
  const key = getKey();
  const headers = { "Content-Type": "application/json", accept: "application/json", Token: key };

  const research = await fetch(`${BASE}/contacts/research`, {
    method: "POST",
    headers,
    cache: "no-store",
    body: JSON.stringify({
      contacts: contacts.map((c) => ({ contactName: c.name, companyName: c.company })),
      skipDeduplicationCheck: false,
    }),
  });
  if (!research.ok) {
    throw new SeamlessError(`Seamless research failed (status ${research.status}).`);
  }
  const rj = await research.json();
  const ids: string[] = Array.isArray(rj.requestIds) ? rj.requestIds : [];
  if (ids.length === 0) return [];

  const phones = new Set<string>();
  const pending = new Set(ids);

  // Poll until everything reaches a terminal state or we run out of budget
  // (results are usually ready almost immediately).
  for (let attempt = 0; attempt < 4 && pending.size > 0; attempt++) {
    await new Promise((r) => setTimeout(r, 1300));
    const url = `${BASE}/contacts/research/poll?requestIds=${Array.from(pending).join(",")}`;
    const p = await fetch(url, { headers: { accept: "application/json", Token: key }, cache: "no-store" });
    if (!p.ok) continue;
    const pj = await p.json();
    for (const d of pj.data ?? []) {
      if (d.status === "done" && d.contact) {
        const c: PollContact = d.contact;
        for (const x of [
          c.contactPhone1,
          c.contactPhone2,
          c.companyPhone1,
          c.companyPhone2,
          c.companyPhone3,
        ]) {
          if (x) phones.add(String(x).trim());
        }
      }
      if (TERMINAL.has(d.status)) pending.delete(d.requestId);
    }
  }

  return Array.from(phones).filter(Boolean);
}
