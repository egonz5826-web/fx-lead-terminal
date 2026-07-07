const COMPANY_SUFFIXES = [
  "inc",
  "incorporated",
  "llc",
  "l l c",
  "corp",
  "corporation",
  "co",
  "company",
  "ltd",
  "limited",
  "lp",
  "llp",
  "group",
  "holdings",
];

export function normalizeCompanyName(name: string): string {
  let n = name.toLowerCase().trim();
  n = n.replace(/[.,]/g, "");
  n = n.replace(/&/g, "and");
  n = n.replace(/\s+/g, " ");

  const words = n.split(" ");
  while (words.length > 1 && COMPANY_SUFFIXES.includes(words[words.length - 1])) {
    words.pop();
  }
  return words.join(" ").trim();
}

export function normalizeDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  let d = website.toLowerCase().trim();
  d = d.replace(/^https?:\/\//, "");
  d = d.replace(/^www\./, "");
  d = d.split("/")[0];
  return d || null;
}

export interface ExistingClientRecord {
  account_name: string;
  website: string | null;
}

export function findMatchingClient(
  lead: { company_name: string; website: string | null },
  clients: ExistingClientRecord[]
): ExistingClientRecord | null {
  const leadName = normalizeCompanyName(lead.company_name);
  const leadDomain = normalizeDomain(lead.website);

  for (const client of clients) {
    const clientDomain = normalizeDomain(client.website);
    if (leadDomain && clientDomain && leadDomain === clientDomain) {
      return client;
    }
  }

  for (const client of clients) {
    if (normalizeCompanyName(client.account_name) === leadName) {
      return client;
    }
  }

  return null;
}
