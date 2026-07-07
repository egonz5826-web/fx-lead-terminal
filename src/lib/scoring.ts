import type { Lead, LeadWithScore, ScoringWeights } from "./types";

export const DEFAULT_WEIGHTS: Pick<
  ScoringWeights,
  "weight_volume" | "weight_corridor" | "weight_growth"
> = {
  weight_volume: 0.4,
  weight_corridor: 0.35,
  weight_growth: 0.25,
};

export function computeScore(
  lead: Pick<Lead, "volume_score" | "corridor_score" | "growth_score">,
  weights: Pick<ScoringWeights, "weight_volume" | "weight_corridor" | "weight_growth">
): number {
  const totalWeight =
    weights.weight_volume + weights.weight_corridor + weights.weight_growth;

  if (totalWeight <= 0) return 0;

  const raw =
    lead.volume_score * weights.weight_volume +
    lead.corridor_score * weights.weight_corridor +
    lead.growth_score * weights.weight_growth;

  return Math.round(Math.min(100, Math.max(0, raw / totalWeight)));
}

export function withScores(
  leads: Lead[],
  weights: Pick<ScoringWeights, "weight_volume" | "weight_corridor" | "weight_growth">
): LeadWithScore[] {
  return leads.map((lead) => ({
    ...lead,
    fx_opportunity_score: computeScore(lead, weights),
  }));
}
