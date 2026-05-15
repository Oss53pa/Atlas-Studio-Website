// ASVC — Utilitaires partagés entre les 3 agents Ventes (prospection / sdr / closer).

import { supabaseAdmin } from "../supabase.ts";

export interface Lead {
  id: string;
  source: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  country: string | null;
  sector: string | null;
  size_estimate: string | null;
  product_interest: string[] | null;
  stage: string;
  score: number;
  notes: string | null;
  contract_value_fcfa: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInteraction {
  channel: string;
  direction: "outbound" | "inbound";
  content: string | null;
  outcome: string | null;
  created_at: string;
}

export async function fetchLead(leadId: string): Promise<Lead> {
  const { data, error } = await supabaseAdmin
    .from("asvc_leads")
    .select(
      "id, source, company_name, contact_name, contact_email, contact_phone, country, sector, size_estimate, product_interest, stage, score, notes, contract_value_fcfa, created_at, updated_at",
    )
    .eq("id", leadId)
    .single();
  if (error || !data) throw new Error(`Lead introuvable: ${error?.message ?? leadId}`);
  return data as Lead;
}

export async function fetchRecentInteractions(leadId: string, limit = 10): Promise<LeadInteraction[]> {
  const { data } = await supabaseAdmin
    .from("asvc_lead_interactions")
    .select("channel, direction, content, outcome, created_at")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data as LeadInteraction[] | null) ?? []).reverse();
}

export async function fetchAgentIdByCode(code: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", code)
    .single();
  if (error || !data) throw new Error(`Agent '${code}' introuvable`);
  return data.id as string;
}

/** Parse robuste d'un JSON unique potentiellement entouré de fences. */
export function parseJsonOutput<T>(raw: string): T {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const i0 = s.indexOf("{");
  const iN = s.lastIndexOf("}");
  if (i0 === -1 || iN === -1) throw new Error("Pas de JSON détecté");
  return JSON.parse(s.slice(i0, iN + 1)) as T;
}

export function fcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return "n/a";
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export function leadContextString(l: Lead): string {
  return `Entreprise: ${l.company_name}
Contact: ${l.contact_name ?? "(inconnu)"}${l.contact_email ? ` <${l.contact_email}>` : ""}${l.contact_phone ? ` ${l.contact_phone}` : ""}
Pays: ${l.country ?? "(?)"}
Secteur: ${l.sector ?? "(?)"}
Taille: ${l.size_estimate ?? "(?)"}
Intérêts produit: ${(l.product_interest ?? []).join(", ") || "(?)"}
Source: ${l.source}
Stage actuel: ${l.stage}
Score BANT actuel: ${l.score}/100
Valeur contrat estimée: ${fcfa(l.contract_value_fcfa)}
Notes internes: ${l.notes ?? "(aucune)"}`;
}
