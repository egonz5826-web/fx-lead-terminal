import "server-only";

// Real, auditable evidence for whether a company actually has cross-border
// FX exposure — replacing two things that were fabricated before:
//   1. corridor_score used to come from one free-text box the rep typed once
//      per search batch, applied identically to every result regardless of
//      whether that specific company had anything to do with it.
//   2. est_annual_teu (a "freight volume" number) was just employees * 80 —
//      no real shipment data behind it at all.
// Everything here is free: Apollo's own industry/keyword tags (already paid
// for by the existing enrichment call, previously discarded) plus a
// best-effort read of the company's own public homepage copy.

export const CORRIDOR_CURRENCY_VALUE: Record<string, number> = {
  "USD/MXN": 75,
  "USD/CNY": 65,
  "USD/JPY": 60,
  "EUR/USD": 60,
  "GBP/USD": 60,
  "USD/CAD": 55,
};

interface CorridorTermSet {
  currency: string;
  terms: string[];
}

const CORRIDOR_TERMS: CorridorTermSet[] = [
  {
    currency: "USD/MXN",
    terms: [
      "mexico", "mexican", "maquiladora", "maquila", "nearshoring", "near-shoring",
      "laredo", "nuevo laredo", "tijuana", "juarez", "monterrey", "mexican peso",
    ],
  },
  {
    currency: "USD/CNY",
    terms: ["china", "chinese", "shenzhen", "guangzhou", "yuan", "renminbi", "shanghai", "ningbo"],
  },
  {
    currency: "EUR/USD",
    terms: ["europe", "european union", "eurozone", "germany", "italy", "france", "spain", "netherlands"],
  },
  { currency: "USD/CAD", terms: ["canada", "canadian", "ontario", "quebec", "toronto"] },
  { currency: "USD/JPY", terms: ["japan", "japanese", "tokyo", "osaka"] },
];

const GENERIC_TRADE_TERMS = [
  "import", "imports", "importer", "importing", "export", "exports", "exporter", "exporting",
  "customs", "freight", "freight forwarding", "freight forwarder", "logistics", "supply chain",
  "3pl", "nvocc", "drayage", "warehousing", "distribution", "wholesale", "wholesaler",
  "manufacturer", "manufacturing", "sourcing", "overseas supplier", "international shipping",
  "cross-border", "crossborder", "trade compliance", "tariff", "incoterm", "bill of lading",
  "container", "ocean freight", "air freight", "customs broker", "customs brokerage",
];

const NON_TRADE_TERMS = [
  "law firm", "attorney", "law office", "legal services", "staffing agency", "recruiting firm",
  "talent acquisition", "marketing agency", "digital marketing", "advertising agency",
  "web design", "software as a service", "saas platform", "real estate brokerage",
  "property management", "insurance agency", "financial advisor", "wealth management",
  "dental", "dentistry", "medical clinic", "healthcare provider", "physical therapy",
  "hair salon", "day spa", "restaurant", "catering", "non-profit organization",
  "place of worship", "k-12", "child care", "daycare", "cpa firm", "accounting firm",
  "tax preparation",
];

export interface TradeSignalInput {
  industry: string | null;
  keywords: string[];
  shortDescription: string | null;
  websiteText: string;
  manualCorridor: string;
  manualCurrencyExposure: string;
}

export interface TradeSignalResult {
  score: number; // 0-100 — replaces the old batch-wide manual corridor_score
  corridorGuess: string | null; // e.g. "USD/MXN"
  evidence: string[]; // human-readable, surfaced in latest_signal
  concerns: string[]; // human-readable, surfaced in latest_signal + fed to AI
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function findHits(haystack: string, terms: string[]): string[] {
  return terms.filter((term) => haystack.includes(term));
}

function firstCurrencyPair(exposure: string): string | null {
  const first = exposure.split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first || null;
}

export function assessTradeSignal(input: TradeSignalInput): TradeSignalResult {
  const corpus = [
    input.industry ?? "",
    (input.keywords ?? []).join(" "),
    input.shortDescription ?? "",
    input.websiteText ?? "",
  ]
    .join(" • ")
    .toLowerCase();

  const evidence: string[] = [];
  const concerns: string[] = [];

  let bestCorridor: string | null = null;
  let bestCorridorHits = 0;
  for (const set of CORRIDOR_TERMS) {
    const hits = findHits(corpus, set.terms);
    if (hits.length > 0) {
      evidence.push(`"${hits.slice(0, 3).join('", "')}" → ${set.currency} corridor`);
      if (hits.length > bestCorridorHits) {
        bestCorridor = set.currency;
        bestCorridorHits = hits.length;
      }
    }
  }

  const genericHits = findHits(corpus, GENERIC_TRADE_TERMS);
  if (genericHits.length > 0) {
    evidence.push(`Trade language: "${genericHits.slice(0, 4).join('", "')}"`);
  }

  const nonTradeHits = findHits(corpus, NON_TRADE_TERMS);
  if (nonTradeHits.length > 0) {
    concerns.push(
      `Reads like a domestic service business ("${nonTradeHits[0]}") — weak fit unless proven otherwise`
    );
  }

  const manualCorridorGiven = input.manualCorridor.trim().length > 0;
  const manualCurrencyGiven = input.manualCurrencyExposure.trim().length > 0;

  let score: number;
  let corridorGuess = bestCorridor;

  if (bestCorridor) {
    const base = CORRIDOR_CURRENCY_VALUE[bestCorridor] ?? 60;
    score = clamp(base + Math.min(bestCorridorHits - 1, 2) * 5, 20, 95);
  } else if (genericHits.length > 0) {
    score = clamp(55 + Math.min(genericHits.length, 4) * 3, 20, 80);
    if (manualCurrencyGiven) {
      corridorGuess = firstCurrencyPair(input.manualCurrencyExposure);
      evidence.push(
        `No specific corridor found in company data — using rep-entered "${input.manualCurrencyExposure}"`
      );
    }
  } else if (manualCurrencyGiven || manualCorridorGiven) {
    score = 45;
    corridorGuess = firstCurrencyPair(input.manualCurrencyExposure);
    concerns.push(
      `No cross-border trade language found in company data — corridor is an unverified rep guess ` +
        `("${input.manualCorridor || input.manualCurrencyExposure}"); check ImportYeti before contacting`
    );
  } else {
    score = 35;
    concerns.push("No cross-border trade evidence found anywhere — verify real import/export activity before contacting");
  }

  if (nonTradeHits.length > 0) {
    score = clamp(score - 20, 10, 95);
  }

  return { score, corridorGuess, evidence, concerns };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(nbsp|amp|quot|#39|lt|gt);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Best-effort read of a company's own public homepage copy — free, no API
// key, no paid data source. Never throws: a blocked/slow/broken site just
// means no website evidence, not a failed lookup.
export async function fetchWebsiteSignal(domainOrUrl: string | null): Promise<string> {
  if (!domainOrUrl) return "";
  const url = domainOrUrl.startsWith("http") ? domainOrUrl : `https://${domainOrUrl}`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; FXLeadTerminal/1.0; +lead research)" },
    });
    if (!res.ok) return "";
    const html = await res.text();
    return stripHtml(html).slice(0, 3000);
  } catch {
    return "";
  }
}
