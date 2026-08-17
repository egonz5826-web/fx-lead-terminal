import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// AI analyst scoring for Monex USA sales leads. A single cheap Claude Haiku
// call reads everything we know about a lead and returns a 0-100 FX-opportunity
// score plus a one-line, plain-English rationale a rep can read at a glance.
// Costs a fraction of a cent per lead and uses ZERO Apollo credits — it reasons
// over the firmographics already on the lead row, not a fresh Apollo pull.

// Cheapest capable model. Haiku 4.5 supports structured JSON output, which is
// what guarantees we get back a clean {score, rationale} every time.
const MODEL = "claude-haiku-4-5";

export interface AiScoreInput {
  company_name: string;
  city: string;
  state: string;
  import_corridors: string;
  currency_exposure: string;
  volume_score: number;
  growth_score: number;
  corridor_score: number;
  est_annual_teu: number;
  latest_signal: string | null;
  contacts_count: number;
}

export interface AiScoreResult {
  score: number; // 0-100
  rationale: string; // one-line plain-English
}

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — add it to .env.local and Vercel.");
  }
  // Reuse one client across calls (keeps the HTTP agent warm for batches).
  cached ??= new Anthropic();
  return cached;
}

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

// Structured-output schema: guarantees a valid {score, rationale} object.
// (JSON-schema numeric bounds aren't enforced by the API, so we clamp in code.)
const SCHEMA = {
  type: "object",
  properties: {
    score: {
      type: "integer",
      description: "FX-opportunity score from 0 (poor fit) to 100 (ideal prospect).",
    },
    rationale: {
      type: "string",
      description:
        "One concise sentence (max ~18 words) a rep can read at a glance, e.g. '82 — mid-size Laredo freight forwarder, heavy USD/MXN flow, growing 13% YoY'.",
    },
  },
  required: ["score", "rationale"],
  additionalProperties: false,
} as const;

function clampScore(n: unknown): number {
  const num = Math.round(Number(n));
  if (!Number.isFinite(num)) return 50;
  return Math.max(0, Math.min(100, num));
}

export async function scoreLeadWithAI(input: AiScoreInput): Promise<AiScoreResult> {
  const client = getClient();

  const userText = [
    `Company: ${input.company_name}`,
    `Location: ${input.city}, ${input.state}`,
    `Import corridors: ${input.import_corridors}`,
    `Currency exposure: ${input.currency_exposure}`,
    `Volume score (0-100): ${input.volume_score}`,
    `Growth score (0-100): ${input.growth_score}`,
    `Corridor score (0-100): ${input.corridor_score}`,
    `Est. annual TEU (freight proxy): ${input.est_annual_teu}`,
    `Decision-makers identified: ${input.contacts_count}`,
    `Latest signal: ${input.latest_signal ?? "none"}`,
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: userText }],
  });

  // With structured output the model returns a single text block of valid JSON.
  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "";

  let parsed: { score?: unknown; rationale?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned unparseable output.");
  }

  return {
    score: clampScore(parsed.score),
    rationale:
      typeof parsed.rationale === "string" && parsed.rationale.trim()
        ? parsed.rationale.trim()
        : "No rationale returned.",
  };
}
