// One-time full-pool rescore: mirrors src/lib/data.ts rescoreLeads(), run
// standalone against every lead instead of paginated through the admin UI.
// Costs 1 Apollo credit per lead that has a website (same as the in-app
// "Rescore" button, just run for the whole board in one pass).
// Usage: node scripts/rescore-all.mjs

import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const APOLLO_KEY = env.APOLLO_API_KEY;
const sb = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// --- trade-signal.ts, copied verbatim (term lists + assessTradeSignal) ---
const CORRIDOR_CURRENCY_VALUE = {
  "USD/MXN": 75, "USD/CNY": 65, "USD/JPY": 60, "EUR/USD": 60, "GBP/USD": 60, "USD/CAD": 55,
};
const CORRIDOR_TERMS = [
  { currency: "USD/MXN", terms: ["mexico","mexican","maquiladora","maquila","nearshoring","near-shoring","laredo","nuevo laredo","tijuana","juarez","monterrey","mexican peso"] },
  { currency: "USD/CNY", terms: ["china","chinese","shenzhen","guangzhou","yuan","renminbi","shanghai","ningbo"] },
  { currency: "EUR/USD", terms: ["europe","european union","eurozone","germany","italy","france","spain","netherlands"] },
  { currency: "USD/CAD", terms: ["canada","canadian","ontario","quebec","toronto"] },
  { currency: "USD/JPY", terms: ["japan","japanese","tokyo","osaka"] },
];
const GENERIC_TRADE_TERMS = [
  "import","imports","importer","importing","export","exports","exporter","exporting",
  "supply chain","distribution","wholesale","wholesaler",
  "manufacturer","manufacturing","sourcing","overseas supplier","international shipping",
  "cross-border","crossborder","trade compliance","tariff","incoterm","bill of lading",
  "container","ocean freight","air freight",
];
const LOGISTICS_PROVIDER_TERMS = [
  "freight forwarder","freight forwarding","logistics provider","logistics company",
  "logistics solutions","logistics services","customs broker","customs brokerage",
  "customs brokers","3pl","third-party logistics","nvocc","drayage",
  "trucking company","trucking services","warehousing services","fulfillment services",
  "ltl carrier","ftl carrier","freight carrier","cargo carrier",
  "supply chain solutions provider",
];
const LOGISTICS_NAME_WORDS = ["logistics","freight","forwarding","brokerage","trucking","drayage","cartage","warehousing","3pl","nvocc"];
const NON_TRADE_TERMS = [
  "law firm","attorney","law office","legal services","staffing agency","recruiting firm",
  "talent acquisition","marketing agency","digital marketing","advertising agency",
  "web design","software as a service","saas platform","real estate brokerage",
  "property management","insurance agency","financial advisor","wealth management",
  "dental","dentistry","medical clinic","healthcare provider","physical therapy",
  "hair salon","day spa","restaurant","catering","non-profit organization",
  "place of worship","k-12","child care","daycare","cpa firm","accounting firm",
  "tax preparation",
];
function tsClamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function findHits(haystack, terms) { return terms.filter((t) => haystack.includes(t)); }
function firstCurrencyPair(exposure) {
  const first = exposure.split(",").map((s) => s.trim()).filter(Boolean)[0];
  return first || null;
}
function assessTradeSignal(input) {
  const corpus = [input.industry ?? "", (input.keywords ?? []).join(" "), input.shortDescription ?? "", input.websiteText ?? ""].join(" • ").toLowerCase();
  const evidence = [];
  const concerns = [];
  let bestCorridor = null;
  let bestCorridorHits = 0;
  for (const set of CORRIDOR_TERMS) {
    const hits = findHits(corpus, set.terms);
    if (hits.length > 0) {
      evidence.push(`"${hits.slice(0, 3).join('", "')}" → ${set.currency} corridor`);
      if (hits.length > bestCorridorHits) { bestCorridor = set.currency; bestCorridorHits = hits.length; }
    }
  }
  const genericHits = findHits(corpus, GENERIC_TRADE_TERMS);
  if (genericHits.length > 0) evidence.push(`Trade language: "${genericHits.slice(0, 4).join('", "')}"`);
  const nonTradeHits = findHits(corpus, NON_TRADE_TERMS);
  if (nonTradeHits.length > 0) concerns.push(`Reads like a domestic service business ("${nonTradeHits[0]}") — weak fit unless proven otherwise`);
  const nameCorpus = input.companyName.toLowerCase();
  const logisticsHits = [...findHits(corpus, LOGISTICS_PROVIDER_TERMS), ...findHits(nameCorpus, LOGISTICS_NAME_WORDS)];
  if (logisticsHits.length > 0) {
    concerns.push(`Looks like a logistics/freight/customs-brokerage service provider ("${logisticsHits[0]}") — likely an intermediary that arranges shipping for other companies rather than a company with its own cross-border merchandise exposure. The importer who hires them is usually the better prospect.`);
  }
  const manualCorridorGiven = input.manualCorridor.trim().length > 0;
  const manualCurrencyGiven = input.manualCurrencyExposure.trim().length > 0;
  let score;
  let corridorGuess = bestCorridor;
  if (bestCorridor) {
    const base = CORRIDOR_CURRENCY_VALUE[bestCorridor] ?? 60;
    score = tsClamp(base + Math.min(bestCorridorHits - 1, 2) * 5, 20, 95);
  } else if (genericHits.length > 0) {
    score = tsClamp(55 + Math.min(genericHits.length, 4) * 3, 20, 80);
    if (manualCurrencyGiven) {
      corridorGuess = firstCurrencyPair(input.manualCurrencyExposure);
      evidence.push(`No specific corridor found in company data — using rep-entered "${input.manualCurrencyExposure}"`);
    }
  } else if (manualCurrencyGiven || manualCorridorGiven) {
    score = 45;
    corridorGuess = firstCurrencyPair(input.manualCurrencyExposure);
    concerns.push(`No cross-border trade language found in company data — corridor is an unverified rep guess ("${input.manualCorridor || input.manualCurrencyExposure}"); check ImportYeti before contacting`);
  } else {
    score = 35;
    concerns.push("No cross-border trade evidence found anywhere — verify real import/export activity before contacting");
  }
  if (nonTradeHits.length > 0) score = tsClamp(score - 20, 10, 95);
  if (logisticsHits.length > 0) score = tsClamp(score - 15, 10, 95);
  return { score, corridorGuess, evidence, concerns };
}
function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&(nbsp|amp|quot|#39|lt|gt);/gi, " ").replace(/\s+/g, " ").trim();
}
async function fetchWebsiteSignal(domainOrUrl) {
  if (!domainOrUrl) return "";
  const url = domainOrUrl.startsWith("http") ? domainOrUrl : `https://${domainOrUrl}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; FXLeadTerminal/1.0; +lead research)" } });
    if (!res.ok) return "";
    const html = await res.text();
    return stripHtml(html).slice(0, 3000);
  } catch {
    return "";
  }
}
// --- end trade-signal.ts copy ---

// --- scoring helpers, copied from src/lib/data.ts ---
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, Math.round(n))); }
const PEAK_REVENUE = 40_000_000;
const OVERSIZED_REVENUE = 250_000_000;
const OVERSIZED_EMPLOYEES = 2000;
function revenueCurve(revenue) {
  if (revenue <= PEAK_REVENUE) return clamp(25 + 17 * Math.log10(revenue / 100_000), 20, 92);
  const decay = 22 * Math.log10(revenue / PEAK_REVENUE);
  return clamp(92 - decay, 15, 92);
}
function volumeScore(annualRevenue, employees) {
  if (annualRevenue && annualRevenue > 0) return revenueCurve(annualRevenue);
  if (employees && employees > 0) return revenueCurve(employees * 250_000);
  return 40;
}
function isOversized(annualRevenue, employees) {
  return (annualRevenue !== null && annualRevenue > OVERSIZED_REVENUE) || (employees !== null && employees > OVERSIZED_EMPLOYEES);
}
function growthScore(growth12mo) {
  if (growth12mo === null) return 50;
  return clamp(45 + growth12mo * 175, 15, 95);
}
// --- end scoring.ts copy ---

async function enrichOrganization(domain) {
  const res = await fetch(`https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
    method: "GET",
    headers: { accept: "application/json", "x-api-key": APOLLO_KEY },
  });
  if (!res.ok) throw new Error(`apollo ${res.status}`);
  const data = await res.json();
  if (!data.organization) return null;
  return {
    city: data.organization.city ?? null,
    state: data.organization.state ?? null,
    estimated_employees: data.organization.estimated_num_employees ?? null,
    industry: data.organization.industry ?? null,
    keywords: Array.isArray(data.organization.keywords) ? data.organization.keywords : [],
    short_description: data.organization.short_description ?? null,
    phone: data.organization.sanitized_phone ?? null,
    annual_revenue: data.organization.annual_revenue ?? null,
    growth_12mo: data.organization.organization_headcount_twelve_month_growth ?? null,
  };
}

async function getApolloCreditsUsed() {
  const r = await fetch(`${URL_}/rest/v1/apollo_usage?id=eq.1&select=credits_used`, { headers: sb });
  const rows = await r.json();
  return rows?.[0]?.credits_used ?? 0;
}
async function incrementApolloCreditsUsedBy(amount) {
  const current = await getApolloCreditsUsed();
  const next = current + amount;
  await fetch(`${URL_}/rest/v1/apollo_usage?id=eq.1`, {
    method: "PATCH", headers: sb,
    body: JSON.stringify({ credits_used: next, updated_at: new Date().toISOString() }),
  });
  return next;
}

const leads = await (
  await fetch(
    `${URL_}/rest/v1/leads?select=id,company_name,website,currency_exposure,import_corridors,industry,volume_score,growth_score,phone,city,state&order=company_name`,
    { headers: sb }
  )
).json();

console.log(`Rescoring ${leads.length} leads…`);

let updated = 0;
let enrichFailed = 0;
let enrichCalls = 0;

for (const lead of leads) {
  let details = null;
  if (lead.website) {
    try {
      details = await enrichOrganization(lead.website);
      enrichCalls += 1;
    } catch {
      enrichFailed += 1;
    }
  }
  const websiteText = await fetchWebsiteSignal(lead.website);
  const signal = assessTradeSignal({
    companyName: lead.company_name,
    industry: details?.industry ?? lead.industry ?? null,
    keywords: details?.keywords ?? [],
    shortDescription: details?.short_description ?? null,
    websiteText,
    manualCorridor: lead.import_corridors ?? "",
    manualCurrencyExposure: lead.currency_exposure ?? "",
  });

  const fields = { corridor_score: signal.score };
  if (signal.corridorGuess) fields.import_corridors = signal.corridorGuess;

  const signalParts = [];
  if (details) {
    const oversized = isOversized(details.annual_revenue, details.estimated_employees);
    fields.volume_score = volumeScore(details.annual_revenue, details.estimated_employees);
    fields.growth_score = growthScore(details.growth_12mo);
    if (details.estimated_employees) fields.est_annual_teu = details.estimated_employees * 80;
    if (!lead.phone && details.phone) fields.phone = details.phone;
    if ((!lead.city || lead.city === "Unknown") && details.city) fields.city = details.city;
    if ((!lead.state || lead.state === "Unknown") && details.state) fields.state = details.state;
    if (details.industry) signalParts.push(details.industry);
    if (details.annual_revenue) signalParts.push(`~$${(details.annual_revenue / 1_000_000).toFixed(1)}M rev`);
    if (details.growth_12mo !== null) signalParts.push(`${details.growth_12mo >= 0 ? "+" : ""}${(details.growth_12mo * 100).toFixed(0)}% HC growth`);
    if (oversized) signalParts.push("⚠ enterprise-scale — likely needs a different sales motion than a rep cold-call");
  }
  signalParts.push(...signal.evidence);
  signalParts.push(...signal.concerns);
  fields.latest_signal = signalParts.length ? signalParts.join(" · ") : "Rescored — no independent trade evidence found yet";

  const r = await fetch(`${URL_}/rest/v1/leads?id=eq.${lead.id}`, { method: "PATCH", headers: sb, body: JSON.stringify(fields) });
  if (r.ok) updated += 1;
  else enrichFailed += 1;

  process.stdout.write(`\r  rescored ${updated}/${leads.length} (${enrichFailed} enrich failures)…`);
}

if (enrichCalls > 0) {
  const total = await incrementApolloCreditsUsedBy(enrichCalls);
  console.log(`\nApollo credits used this run: ${enrichCalls} (lifetime total: ${total})`);
}

console.log(`\nDone. Updated ${updated}/${leads.length} leads.`);
