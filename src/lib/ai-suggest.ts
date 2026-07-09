import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Cheap Claude Haiku call that expands a rep's seed keywords into related
// prospect-search terms, each tuned toward companies with real cross-border
// payment / FX exposure, plus the currency pair that industry usually trades in.

const MODEL = "claude-haiku-4-5";

export interface KeywordSuggestion {
  term: string;
  currency: string;
}

let cached: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }
  cached ??= new Anthropic();
  return cached;
}

const SYSTEM = `You help a Monex USA FX sales rep find prospect companies that need currency \
payment or hedging services. Given seed keywords, return up to 8 related company/industry \
SEARCH TERMS that would surface companies with real cross-border payment exposure — importers, \
exporters, cross-border supply chains, freight/logistics, manufacturers sourcing abroad, etc.

Rules:
- Each term should be short (2-4 words) and work as an Apollo company-search keyword.
- Do NOT repeat the seed terms; suggest adjacent/related niches the rep might not think of.
- For each term, give the single most likely currency pair, using EXACTLY one of these strings: \
USD/MXN, EUR/USD, GBP/USD, USD/CNY, USD/JPY, USD/CAD (Mexico → USD/MXN, Europe → EUR/USD, UK → \
GBP/USD, China → USD/CNY, Japan → USD/JPY, Canada → USD/CAD). When unsure, use USD/MXN (the \
team's core corridor).`;

// The app quotes some pairs foreign-first (EUR/USD, GBP/USD); normalize the
// model's output so chips match the scoring map and the board's currency filter.
const CANONICAL: Record<string, string> = {
  "USD/EUR": "EUR/USD",
  "USD/GBP": "GBP/USD",
  "MXN/USD": "USD/MXN",
  "CNY/USD": "USD/CNY",
  "JPY/USD": "USD/JPY",
  "CAD/USD": "USD/CAD",
};

function canonicalCurrency(pair: string): string {
  const p = pair.trim().toUpperCase();
  return CANONICAL[p] ?? p;
}

const SCHEMA = {
  type: "object",
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          term: { type: "string", description: "Short Apollo-search-friendly keyword." },
          currency: { type: "string", description: "Most likely currency pair, e.g. USD/MXN." },
        },
        required: ["term", "currency"],
        additionalProperties: false,
      },
    },
  },
  required: ["suggestions"],
  additionalProperties: false,
} as const;

export async function suggestKeywords(seed: string): Promise<KeywordSuggestion[]> {
  const client = getClient();

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `Seed keywords: ${seed}` }],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block && "text" in block ? block.text : "";

  let parsed: { suggestions?: unknown };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed.suggestions)) return [];

  return parsed.suggestions
    .filter(
      (s): s is KeywordSuggestion =>
        !!s &&
        typeof (s as KeywordSuggestion).term === "string" &&
        typeof (s as KeywordSuggestion).currency === "string"
    )
    .map((s) => ({ term: s.term.trim(), currency: canonicalCurrency(s.currency) }))
    .filter((s) => s.term.length > 0)
    .slice(0, 8);
}
