// ASVC — Apollo helper (enrichissement leads).
//
// Pattern : clé API stockée chiffrée (même infra que GitHub/Vercel/Sentry PAT).
// Si pas de clé → isApolloConfigured() retourne false → Prospection Agent
// retombe sur son comportement "checklist de recherche".
//
// Endpoints utilisés (gratuit avec rate-limit du plan Apollo) :
//   - POST /v1/people/match     → enrichit par email
//   - POST /v1/organizations/enrich → enrichit par domain
//
// Doc : https://apolloio.github.io/apollo-api-docs/

import { supabaseAdmin } from "../supabase.ts";

const APOLLO_BASE = "https://api.apollo.io";

function getMasterKey(): string {
  const k = Deno.env.get("APP_ENCRYPTION_KEY");
  if (!k || k.length < 16) throw new Error("APP_ENCRYPTION_KEY manquante");
  return k;
}

export async function isApolloConfigured(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("asvc_oauth_tokens")
    .select("id")
    .eq("provider", "apollo")
    .eq("status", "active")
    .limit(1);
  return ((data ?? []).length) > 0;
}

async function fetchApolloKey(): Promise<string | null> {
  const { data, error } = await supabaseAdmin.rpc("asvc_oauth_get_token", {
    p_provider: "apollo",
    p_account_email: "apollo-default",
    p_master_key: getMasterKey(),
  });
  if (error) throw new Error(`asvc_oauth_get_token (apollo): ${error.message}`);
  if (!data) return null;
  return (data as { refresh_token: string }).refresh_token;
}

interface ApolloPerson {
  id?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  linkedin_url?: string;
  email?: string;
  email_status?: string;
  city?: string;
  country?: string;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
    technologies?: string[];
  };
}

export interface ApolloEnrichmentResult {
  found: boolean;
  person?: ApolloPerson;
  raw?: unknown;
}

/** Enrichit un lead par email (le cas le plus courant). */
export async function enrichByEmail(email: string): Promise<ApolloEnrichmentResult> {
  const key = await fetchApolloKey();
  if (!key) return { found: false };

  const res = await fetch(`${APOLLO_BASE}/v1/people/match`, {
    method: "POST",
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "application/json",
      "X-Api-Key": key,
    },
    body: JSON.stringify({
      email,
      reveal_personal_emails: false,    // évite la conso de crédits "reveal"
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Apollo /people/match (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const person = data?.person as ApolloPerson | undefined;
  return {
    found: Boolean(person?.id),
    person,
    raw: data,
  };
}

/** Enrichit une organisation par domain (ex: "cabinet-xyz.ci"). */
export async function enrichByDomain(domain: string): Promise<ApolloEnrichmentResult> {
  const key = await fetchApolloKey();
  if (!key) return { found: false };

  const res = await fetch(`${APOLLO_BASE}/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`, {
    method: "GET",
    headers: {
      "Cache-Control": "no-cache",
      "X-Api-Key": key,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Apollo /organizations/enrich (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const org = data?.organization;
  return {
    found: Boolean(org?.id),
    person: org ? { organization: org } as ApolloPerson : undefined,
    raw: data,
  };
}

/** Synthèse FR concise des champs Apollo pour réinjection dans le prompt LLM. */
export function summarizeApolloEnrichment(r: ApolloEnrichmentResult): string {
  if (!r.found || !r.person) return "Apollo: pas de match.";
  const p = r.person;
  const parts: string[] = [];
  if (p.name || (p.first_name && p.last_name)) {
    parts.push(`Nom: ${p.name ?? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()}`);
  }
  if (p.title) parts.push(`Titre: ${p.title}`);
  if (p.linkedin_url) parts.push(`LinkedIn: ${p.linkedin_url}`);
  if (p.email && p.email_status) parts.push(`Email vérifié: ${p.email} (${p.email_status})`);
  if (p.city || p.country) parts.push(`Localisation: ${[p.city, p.country].filter(Boolean).join(", ")}`);
  const org = p.organization;
  if (org) {
    if (org.name) parts.push(`Société: ${org.name}`);
    if (org.industry) parts.push(`Secteur: ${org.industry}`);
    if (org.estimated_num_employees) parts.push(`Effectif estimé: ${org.estimated_num_employees}`);
    if (org.website_url) parts.push(`Site: ${org.website_url}`);
    if (org.technologies && org.technologies.length > 0) {
      parts.push(`Tech stack: ${org.technologies.slice(0, 8).join(", ")}`);
    }
  }
  return parts.join(" · ");
}
