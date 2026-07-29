import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Drafts personalized FX-sales outreach for a lead: a short cold email + a phone
// opener, tuned to the lead's corridor/currency exposure and any live market
// trigger. Uses Opus for copy quality (on-demand, ~half a cent per draft).

const MODEL = "claude-opus-4-8";

export interface OutreachInput {
  company_name: string;
  city: string;
  state: string;
  industry: string | null;
  import_corridors: string;
  currency_exposure: string;
  ai_rationale: string | null;
  latest_signal: string | null;
  trigger?: string | null; // e.g. "USD/MXN moved +1.2% today"
  contactName?: string | null;
}

export interface OutreachDraft {
  email_subject: string;
  email_body: string;
  call_opener: string;
}

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  cached ??= new Anthropic();
  return cached;
}

const SYSTEM = `You are an experienced FX sales consultant at Monex USA, a currency payments and hedging \
firm. Write outreach to a prospect that moves money across borders and is exposed to exchange-rate risk.

Voice: warm, direct, and specific — a knowledgeable peer, not a spammy SDR. No hype, no clichés \
("I hope this email finds you well", "circling back", "synergy"). Lead with THEM and a concrete reason \
you're reaching out (their corridor, their industry's FX exposure, or a live market move). Show you \
understand their business.

Deliverables:
- email_subject: under 8 words, specific, no clickbait.
- email_body: 60-110 words. Open with a relevant observation about their cross-border/FX exposure, \
connect it to a cost or risk they likely feel, and close with a low-friction ask (a short call). Sign off \
as a Monex USA consultant (leave a [Your name] placeholder). No bullet lists.
- call_opener: 2-3 sentences a rep can say when the prospect picks up — natural, permission-based.

If a market trigger is provided, weave it in naturally as the "why now." Never invent specific numbers \
about the prospect's business; speak to likely exposure, not fabricated figures.`;

const SCHEMA = {
  type: "object",
  properties: {
    email_subject: { type: "string" },
    email_body: { type: "string" },
    call_opener: { type: "string" },
  },
  required: ["email_subject", "email_body", "call_opener"],
  additionalProperties: false,
} as const;

export async function draftOutreach(input: OutreachInput): Promise<OutreachDraft> {
  const client = getClient();

  const lines = [
    `Company: ${input.company_name}`,
    `Location: ${input.city}, ${input.state}`,
    `Industry: ${input.industry ?? "unknown"}`,
    `Trade corridor: ${input.import_corridors}`,
    `Currency exposure: ${input.currency_exposure}`,
    `Why this is a fit (analyst note): ${input.ai_rationale ?? "n/a"}`,
    `Latest signal: ${input.latest_signal ?? "none"}`,
    input.contactName ? `Contact to address: ${input.contactName}` : null,
    input.trigger ? `Live market trigger (use as "why now"): ${input.trigger}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `Draft outreach for this prospect:\n${lines}` }],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block && "text" in block ? block.text : "";

  let parsed: Partial<OutreachDraft>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned unparseable outreach.");
  }

  return {
    email_subject: (parsed.email_subject ?? "").trim() || "Quick question on your FX costs",
    email_body: (parsed.email_body ?? "").trim() || "No draft returned.",
    call_opener: (parsed.call_opener ?? "").trim() || "",
  };
}
