export const NAME_HEADER_CANDIDATES = ["account name", "name", "company", "company name"];
export const WEBSITE_HEADER_CANDIDATES = ["website", "website url", "url", "domain"];
export const CONSULTANT_HEADER_CANDIDATES = ["consultant", "account owner", "owner"];
export const NO_CONSULTANT_VALUES = ["no consultant", "none", "unassigned", ""];

export function findHeader(headers: string[], candidates: string[]): string | null {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const candidate of candidates) {
    const idx = lower.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  return null;
}

export interface ParsedClientRow {
  account_name: string;
  website: string | null;
}

export interface ProcessCsvResult {
  rows: ParsedClientRow[];
  skippedNoConsultant: number;
  error?: string;
}

export function processClientRows(
  data: Record<string, string>[],
  headers: string[]
): ProcessCsvResult {
  const nameHeader = findHeader(headers, NAME_HEADER_CANDIDATES);
  const websiteHeader = findHeader(headers, WEBSITE_HEADER_CANDIDATES);
  const consultantHeader = findHeader(headers, CONSULTANT_HEADER_CANDIDATES);

  if (!nameHeader) {
    return {
      rows: [],
      skippedNoConsultant: 0,
      error: `Couldn't find an account name column. Found columns: ${headers.join(", ") || "(none)"}.`,
    };
  }

  let skipped = 0;

  const rows = data
    .map((row) => ({
      account_name: row[nameHeader]?.trim() ?? "",
      website: websiteHeader ? row[websiteHeader]?.trim() || null : null,
      consultant: consultantHeader ? row[consultantHeader]?.trim().toLowerCase() ?? "" : null,
    }))
    .filter((r) => r.account_name.length > 0)
    .filter((r) => {
      if (r.consultant === null) return true;
      const hasConsultant = !NO_CONSULTANT_VALUES.includes(r.consultant);
      if (!hasConsultant) skipped += 1;
      return hasConsultant;
    })
    .map(({ account_name, website }) => ({ account_name, website }));

  return { rows, skippedNoConsultant: skipped };
}
