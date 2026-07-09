export type LeadStatus =
  | "New"
  | "Contacted"
  | "No Answer"
  | "No FX Need"
  | "Prospect"
  | "Client"
  | "Already a Monex Client";

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "No Answer",
  "No FX Need",
  "Prospect",
  "Client",
  "Already a Monex Client",
];

// Statuses that pull a lead into the picking rep's private "My Leads" tab.
// (The Pick Lead button claims too, without changing status.) "New" and
// "No FX Need" live in the public pool; "Already a Monex Client"
// is hidden from all reps.
export const CLAIMING_STATUSES: LeadStatus[] = [
  "Contacted",
  "No Answer",
  "Prospect",
  "Client",
];

export const HIDDEN_STATUS: LeadStatus = "Already a Monex Client";

// How long a rep keeps a claimed lead before it falls back to the public pool
// if they haven't converted it to Client.
export const CLAIM_TTL_DAYS = 15;

export interface Lead {
  id: string;
  company_name: string;
  website: string | null;
  phone: string | null;
  city: string;
  state: string;
  import_corridors: string;
  currency_exposure: string;
  est_annual_teu: number;
  volume_score: number;
  corridor_score: number;
  growth_score: number;
  latest_signal: string;
  status: LeadStatus;
  owner: string;
  claimed_at: string | null;
  industry: string | null;
  discovered_by: string | null;
  search_keywords: string | null;
  notes: string | null;
  follow_up_date: string | null;
  ai_score: number | null;
  ai_rationale: string | null;
  ai_scored_at: string | null;
  created_at: string;
}

// A phone number for a lead, tagged with where it came from (Apollo, ZoomInfo,
// Seamless.AI). We keep every distinct number so reps can try all of them.
export interface LeadPhone {
  id: string;
  lead_id: string;
  phone: string;
  source: string;
  created_at: string;
}

export interface LeadWithScore extends Lead {
  fx_opportunity_score: number;
}

export interface ScoringWeights {
  weight_volume: number;
  weight_corridor: number;
  weight_growth: number;
  updated_at: string;
}

export interface LeadEvent {
  id: string;
  lead_id: string | null;
  event_text: string;
  event_type: string;
  created_at: string;
}

export interface SignalItem {
  id: string;
  source: "news" | "lead_event";
  title: string;
  detail?: string;
  timestamp: string;
  link?: string;
}

export interface Contact {
  id: string;
  lead_id: string;
  apollo_person_id: string | null;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  email_status: string | null;
  enriched: boolean;
  created_at: string;
}

export interface ApolloSearchMatch {
  apollo_person_id: string;
  name: string;
  title: string | null;
  linkedin_url: string | null;
  organization_name: string | null;
}
