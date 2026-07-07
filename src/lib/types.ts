export type LeadStatus =
  | "New"
  | "Contacted"
  | "No Answer"
  | "No FX Need"
  | "Prospect"
  | "Client";

export const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Contacted",
  "No Answer",
  "No FX Need",
  "Prospect",
  "Client",
];

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
  notes: string | null;
  follow_up_date: string | null;
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
