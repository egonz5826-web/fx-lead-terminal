// One-time seed: AI-score every lead on the board with Claude Haiku, writing
// ai_score + ai_rationale. Mirrors src/lib/ai-scoring.ts. In-app, the admin
// "RUN AI ANALYST" button does the same thing going forward.
// Usage: node scripts/ai-score-all.mjs

import { readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
const MODEL = "claude-haiku-4-5";

const SYSTEM = `You are an FX sales analyst for Monex USA, a currency payments and hedging firm. \
Your job is to score how strong a prospect is for FX/currency services — companies that move money across \
borders and are exposed to exchange-rate risk. The team leans toward the US–Mexico corridor (USD/MXN peso \
volatility is the sweet spot), but EUR/USD, USD/CNY, and other corridors are also valuable — do not penalize \
a strong non-peso lead.

Two important honesty notes about the numbers you're given:
- est_annual_teu is a ROUGH employee-count-based size proxy, not real customs or freight data. Never cite it \
as if it were a verified shipment count.
- "Latest signal" often contains real evidence pulled from the company's own industry tags and website copy —
  quoted trade language, matched corridor keywords — but it can also contain CONCERNS the evidence-gathering \
step already flagged, such as "no independent trade evidence found", "reads like a domestic service \
business", or "unverified rep guess". Treat those concerns as real red flags, not noise: a lead with no \
supporting evidence and a concern flag should generally score well below 50, and your rationale should say \
plainly that the cross-border fit is unconfirmed. Don't let a high volume/revenue number paper over a clear \
"no evidence" concern.
- If the signal contains an "⚠ enterprise-scale" flag, this company is likely too large for a rep-led cold \
approach (it needs an enterprise treasury sales motion instead). Cap your score accordingly and say so in the \
rationale — being huge is not the same as being a good fit for this team, right now.

Weigh these signals holistically:
- Transaction VOLUME (revenue/size proxy: volume_score, est_annual_teu) — bigger flows = bigger FX opportunity,
  but scale down for enterprise-scale companies per the note above.
- CORRIDOR value (corridor_score, currency_exposure, latest signal evidence) — more volatile pairs carry more \
hedging/savings upside, but only when there's real evidence behind the corridor, not just a rep's guess.
- GROWTH (growth_score) — fast-growing importers scale their FX spend quickly.
- Buying readiness (contacts_count) — decision-makers already identified means a warmer, more actionable lead.

A small but fast-growing Mexico importer with real evidence in its favor can outrank a large flat company with \
no cross-border evidence at all. Use judgment, not a fixed formula — and be willing to score a lead low and \
say why, rather than defaulting to a comfortable middle score.`;

const SCHEMA = {
  type: "object",
  properties: {
    score: { type: "integer", description: "FX-opportunity score from 0 to 100." },
    rationale: {
      type: "string",
      description:
        "One concise sentence (max ~18 words) a rep can read at a glance.",
    },
  },
  required: ["score", "rationale"],
  additionalProperties: false,
};

function clamp(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 50;
  return Math.max(0, Math.min(100, x));
}

// Fetch leads + contact counts.
const leads = await (
  await fetch(
    `${URL_}/rest/v1/leads?select=id,company_name,city,state,import_corridors,currency_exposure,volume_score,growth_score,corridor_score,est_annual_teu,latest_signal&order=company_name`,
    { headers: sb }
  )
).json();

const contacts = await (
  await fetch(`${URL_}/rest/v1/contacts?select=lead_id`, { headers: sb })
).json();
const contactCount = {};
for (const c of contacts) contactCount[c.lead_id] = (contactCount[c.lead_id] ?? 0) + 1;

console.log(`Scoring ${leads.length} leads with ${MODEL}…`);

let done = 0;
let failed = 0;

async function scoreOne(lead) {
  const userText = [
    `Company: ${lead.company_name}`,
    `Location: ${lead.city}, ${lead.state}`,
    `Import corridors: ${lead.import_corridors}`,
    `Currency exposure: ${lead.currency_exposure}`,
    `Volume score (0-100): ${lead.volume_score}`,
    `Growth score (0-100): ${lead.growth_score}`,
    `Corridor score (0-100): ${lead.corridor_score}`,
    `Est. annual TEU (freight proxy): ${lead.est_annual_teu}`,
    `Decision-makers identified: ${contactCount[lead.id] ?? 0}`,
    `Latest signal: ${lead.latest_signal ?? "none"}`,
  ].join("\n");

  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 300,
      system: SYSTEM,
      output_config: { format: { type: "json_schema", schema: SCHEMA } },
      messages: [{ role: "user", content: userText }],
    });
    const block = resp.content.find((b) => b.type === "text");
    const parsed = JSON.parse(block && "text" in block ? block.text : "{}");
    const score = clamp(parsed.score);
    const rationale =
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : "No rationale returned.";

    const r = await fetch(`${URL_}/rest/v1/leads?id=eq.${lead.id}`, {
      method: "PATCH",
      headers: sb,
      body: JSON.stringify({
        ai_score: score,
        ai_rationale: rationale,
        ai_scored_at: new Date().toISOString(),
      }),
    });
    if (!r.ok) throw new Error(`db ${r.status}`);
    done += 1;
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${lead.company_name}: ${e.message}`);
  }
}

// Small concurrency so it finishes quickly without hammering rate limits.
const BATCH = 6;
for (let i = 0; i < leads.length; i += BATCH) {
  await Promise.all(leads.slice(i, i + BATCH).map(scoreOne));
  process.stdout.write(`\r  scored ${done}/${leads.length} (${failed} failed)…`);
}

console.log(`\nDone. Scored ${done} leads, ${failed} failed.`);
