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

// Jesus's client book (digitized from his color-coded Excel).
export interface ClientBook {
  id: string;
  number: number | null;
  name: string;
  status: string;
  on_sf: boolean;
  consultant: string | null;
  website: string | null;
  referenciador: string | null;
  communication: string | null;
  dealer: string | null;
  traded: string | null;
  last_follow_up: string | null;
  follow_up: string | null;
  comments: string | null;
  contact_rr: string | null;
  owner: string;
  created_at: string;
  updated_at: string;
}

export const FOLLOW_UP_STATUS = "Chucho needs to follow up";

// Client statuses mirroring Jesus's Excel legend colors. `chip` = Tailwind
// classes for the status badge.
export const CLIENT_STATUSES: { value: string; chip: string }[] = [
  { value: "Open and trading", chip: "bg-emerald-950 text-emerald-400 border-emerald-800" },
  { value: "On SF", chip: "bg-sky-950 text-sky-400 border-sky-800" },
  { value: "Pending Compliance", chip: "bg-pink-950 text-pink-400 border-pink-800" },
  { value: "On hold by client", chip: "bg-yellow-950 text-yellow-400 border-yellow-800" },
  { value: "Cancelled", chip: "bg-red-950 text-red-400 border-red-900" },
  {
    value: "On hold by Management (Mexican corp)",
    chip: "bg-orange-950 text-orange-400 border-orange-800",
  },
  { value: "Open but not trading", chip: "bg-purple-950 text-purple-400 border-purple-800" },
  { value: "VIP / priority", chip: "bg-red-900 text-red-300 border-red-700" },
  { value: FOLLOW_UP_STATUS, chip: "bg-blue-950 text-blue-400 border-blue-700" },
  { value: "Uncategorized", chip: "bg-neutral-900 text-neutral-400 border-neutral-700" },
];

export function clientStatusChip(status: string): string {
  return (
    CLIENT_STATUSES.find((s) => s.value === status)?.chip ??
    "bg-neutral-900 text-neutral-400 border-neutral-700"
  );
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
