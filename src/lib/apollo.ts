import "server-only";
import type { ApolloSearchMatch } from "./types";

const TARGET_TITLES = [
  "CFO",
  "Controller",
  "VP Finance",
  "Director of Finance",
  "Owner",
  "President",
];

export class ApolloError extends Error {
  kind: "invalid_key" | "rate_limit" | "forbidden" | "no_match" | "unknown";

  constructor(kind: ApolloError["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

function getApiKey(): string {
  const key = process.env.APOLLO_API_KEY;
  if (!key) {
    throw new ApolloError(
      "invalid_key",
      "No Apollo API key configured. Add APOLLO_API_KEY to .env.local."
    );
  }
  return key;
}

function friendlyErrorFromStatus(status: number): ApolloError {
  if (status === 401) {
    return new ApolloError(
      "invalid_key",
      "Apollo rejected this API key. Double-check APOLLO_API_KEY in .env.local."
    );
  }
  if (status === 403) {
    return new ApolloError(
      "forbidden",
      "This Apollo API key doesn't have permission for this action (needs a master key)."
    );
  }
  if (status === 429) {
    return new ApolloError(
      "rate_limit",
      "Apollo's rate limit was hit. Wait a minute and try again."
    );
  }
  return new ApolloError("unknown", `Apollo returned an unexpected error (status ${status}).`);
}

interface ApolloPersonResult {
  id: string;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  title: string | null;
  linkedin_url?: string | null;
  organization?: { name?: string | null } | null;
}

export async function searchContacts(
  domain: string
): Promise<ApolloSearchMatch[]> {
  const apiKey = getApiKey();

  const params = new URLSearchParams();
  TARGET_TITLES.forEach((title) => params.append("person_titles[]", title));
  params.append("q_organization_domains_list[]", domain);
  params.append("per_page", "3");

  const res = await fetch(
    `https://api.apollo.io/api/v1/mixed_people/api_search?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw friendlyErrorFromStatus(res.status);
  }

  const data = await res.json();
  const people: ApolloPersonResult[] = data.people ?? [];

  return people.slice(0, 3).map((p) => ({
    apollo_person_id: p.id,
    name: p.name ?? [p.first_name, p.last_name].filter(Boolean).join(" ") ?? "Unknown",
    title: p.title ?? null,
    linkedin_url: p.linkedin_url ?? null,
    organization_name: p.organization?.name ?? null,
  }));
}

interface ApolloMatchResponse {
  person: {
    id: string;
    name: string | null;
    title: string | null;
    email: string | null;
    email_status?: string | null;
    phone_numbers?: { sanitized_number?: string; raw_number?: string }[];
  } | null;
}

export interface EnrichedContact {
  apollo_person_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  email_status: string | null;
  phonePending: boolean;
}

function getBaseUrl(): string | null {
  // Prefer a stable custom domain over VERCEL_URL: that env var points at the
  // ephemeral per-deployment URL, which Vercel's own deployment protection
  // (SSO wall) blocks for outside callers like Apollo's webhook.
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

export async function enrichContact(
  apolloPersonId: string
): Promise<EnrichedContact> {
  const apiKey = getApiKey();

  const params = new URLSearchParams();
  params.append("id", apolloPersonId);
  params.append("reveal_personal_emails", "true");

  const baseUrl = getBaseUrl();
  let phonePending = false;
  if (baseUrl) {
    params.append("reveal_phone_number", "true");
    params.append("webhook_url", `${baseUrl}/api/apollo/phone-webhook`);
    phonePending = true;
  }

  const res = await fetch(
    `https://api.apollo.io/api/v1/people/match?${params.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw friendlyErrorFromStatus(res.status);
  }

  const data: ApolloMatchResponse = await res.json();

  if (!data.person) {
    throw new ApolloError("no_match", "Apollo couldn't find enriched data for this contact.");
  }

  const phone =
    data.person.phone_numbers?.[0]?.sanitized_number ??
    data.person.phone_numbers?.[0]?.raw_number ??
    null;

  return {
    apollo_person_id: data.person.id,
    name: data.person.name ?? "Unknown",
    title: data.person.title ?? null,
    email: data.person.email ?? null,
    phone,
    email_status: data.person.email_status ?? null,
    phonePending: phonePending && !phone,
  };
}

interface ApolloOrganizationResult {
  id: string;
  name: string | null;
  website_url?: string | null;
  primary_domain?: string | null;
  sanitized_phone?: string | null;
  organization_revenue_printed?: string | null;
  organization_headcount_twelve_month_growth?: number | null;
  intent_strength?: string | null;
}

export interface OrganizationSearchResult {
  apollo_org_id: string;
  name: string;
  website: string | null;
  phone: string | null;
  revenue_printed: string | null;
  growth_12mo: number | null;
  intent_strength: string | null;
}

export interface DiscoverCompaniesParams {
  location: string;
  keywords: string;
  minEmployees?: number;
  maxEmployees?: number;
  perPage?: number;
  page?: number;
}

export async function discoverCompanies(
  params: DiscoverCompaniesParams
): Promise<OrganizationSearchResult[]> {
  const apiKey = getApiKey();

  const query = new URLSearchParams();
  if (params.location.trim()) {
    query.append("organization_locations[]", params.location.trim());
  }
  params.keywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .forEach((k) => query.append("q_organization_keyword_tags[]", k));
  if (params.minEmployees || params.maxEmployees) {
    query.append(
      "organization_num_employees_ranges[]",
      `${params.minEmployees ?? 1},${params.maxEmployees ?? 100000}`
    );
  }
  query.append("per_page", String(params.perPage ?? 50));
  query.append("page", String(params.page ?? 1));

  const res = await fetch(
    `https://api.apollo.io/api/v1/mixed_companies/search?${query.toString()}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw friendlyErrorFromStatus(res.status);
  }

  const data = await res.json();
  const orgs: ApolloOrganizationResult[] = data.organizations ?? data.accounts ?? [];

  return orgs.map((o) => ({
    apollo_org_id: o.id,
    name: o.name ?? "Unknown",
    website: o.primary_domain ?? o.website_url ?? null,
    phone: o.sanitized_phone ?? null,
    revenue_printed: o.organization_revenue_printed ?? null,
    growth_12mo: o.organization_headcount_twelve_month_growth ?? null,
    intent_strength: o.intent_strength ?? null,
  }));
}

interface ApolloOrganizationEnrichResponse {
  organization: {
    id: string;
    name: string | null;
    primary_domain?: string | null;
    city?: string | null;
    state?: string | null;
    estimated_num_employees?: number | null;
    industry?: string | null;
    sanitized_phone?: string | null;
    annual_revenue?: number | null;
    organization_headcount_twelve_month_growth?: number | null;
  } | null;
}

export interface OrganizationDetails {
  city: string | null;
  state: string | null;
  estimated_employees: number | null;
  industry: string | null;
  phone: string | null;
  annual_revenue: number | null;
  growth_12mo: number | null;
}

export async function enrichOrganization(
  domain: string
): Promise<OrganizationDetails | null> {
  const apiKey = getApiKey();

  const res = await fetch(
    `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        "x-api-key": apiKey,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw friendlyErrorFromStatus(res.status);
  }

  const data: ApolloOrganizationEnrichResponse = await res.json();
  if (!data.organization) return null;

  return {
    city: data.organization.city ?? null,
    state: data.organization.state ?? null,
    estimated_employees: data.organization.estimated_num_employees ?? null,
    industry: data.organization.industry ?? null,
    phone: data.organization.sanitized_phone ?? null,
    annual_revenue: data.organization.annual_revenue ?? null,
    growth_12mo:
      data.organization.organization_headcount_twelve_month_growth ?? null,
  };
}
