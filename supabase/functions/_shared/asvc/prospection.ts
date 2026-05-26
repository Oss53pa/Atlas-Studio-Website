// ASVC — Prospection Agent: enrichissement / qualification d'un lead.
//
// L'agent ne dispose pas (encore) d'API de scraping externe. Sa valeur:
//   - Produire une CHECKLIST de recherche concrète pour la CEO/SDR
//   - Scorer BANT à partir des infos déjà connues
//   - Identifier les fits produit pertinents dans le catalogue Atlas Studio
//   - Suggérer la prochaine étape (mql / sql / disqualifier)

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import {
  fetchLead,
  fetchAgentIdByCode,
  parseJsonOutput,
  leadContextString,
} from "./sales-common.ts";
import {
  isApolloConfigured,
  enrichByEmail,
  enrichByDomain,
  summarizeApolloEnrichment,
  type ApolloEnrichmentResult,
} from "./apollo.ts";

function domainFromEmail(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase();
}

const PROSPECTION_SYSTEM = `Tu es Prospection Agent de Atlas Studio.
Tu enrichis et qualifies des leads B2B francophones (UEMOA + CEMAC).

ICP TYPIQUES
- Cabinets comptables / d'expertise (cible primaire SYSCOHADA)
- PME retail / distribution (cible AtlasTrade, TableSmart)
- Industrie & service (cible Atlas Finance + WiseHR)
- Cabinets juridiques (cible ADVIST + DocJourney)
- Foncières / immobilier commercial (cible Atlas Lease + Atlas Mall Suite)

CATALOGUE PRODUITS À MATCHER
atlas-finance, liasspilot, cashpilot, wisehr, wisefm, atlasbanx, advist,
docjourney, duedeck, atlastrade, tablesmart, atlas-lease, cockpit-journey,
cockpit-fa, atlas-mall-suite, atlas-paie

CADRE BANT (Budget / Authority / Need / Timeline)
- B: capacité financière estimée
- A: contact = décideur ? si non, qui ?
- N: besoin réel identifiable depuis les infos
- T: signal d'urgence ou horizon

STAGES POSSIBLES
prospect → mql (Marketing Qualified) → sql (Sales Qualified) → demo_scheduled

RÈGLES
- Tu ne fabriques pas d'infos. Si tu ne sais pas, tu dis "à vérifier" et tu mets
  la question dans research_checklist.
- Tu respectes la pudeur africaine: ton respectueux, pas de "growth-hacking" agressif.
- Tu ne donnes pas de prix.
- Tu produis STRICTEMENT un JSON unique (rien autour):
{
  "bant_score": 0-100,
  "bant_breakdown": { "budget": 0-25, "authority": 0-25, "need": 0-25, "timeline": 0-25 },
  "fit_products": ["atlas-finance", "atlastrade"],
  "fit_rationale": "1-2 phrases",
  "research_checklist": [
    "Vérifier le CA approximatif (registres OHADA)",
    "Confirmer que le contact est associé / DG"
  ],
  "suggested_next_stage": "mql|sql|prospect|lost",
  "qualification_summary": "résumé en 3-4 phrases pour la CEO"
}`;

interface ProspectionOutput {
  bant_score: number;
  bant_breakdown: { budget: number; authority: number; need: number; timeline: number };
  fit_products: string[];
  fit_rationale: string;
  research_checklist: string[];
  suggested_next_stage: "mql" | "sql" | "prospect" | "lost";
  qualification_summary: string;
}

export interface EnrichLeadResult {
  actionId: string;
  leadId: string;
  bantScore: number;
  fitProducts: string[];
  suggestedNextStage: string;
  qualificationSummary: string;
  tokensUsed: number;
}

export async function enrichLead(leadId: string): Promise<EnrichLeadResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_PROSPECTION_MODEL") ?? "claude-sonnet-4-6";

  const lead = await fetchLead(leadId);
  const agentId = await fetchAgentIdByCode("prospection");

  // Enrichissement Apollo (silencieux si pas de clé configurée)
  let apollo: ApolloEnrichmentResult | null = null;
  let apolloSource: "email" | "domain" | "none" = "none";
  if (await isApolloConfigured()) {
    try {
      if (lead.contact_email) {
        apollo = await enrichByEmail(lead.contact_email);
        apolloSource = "email";
      }
      if ((!apollo || !apollo.found) && lead.contact_email) {
        const domain = domainFromEmail(lead.contact_email);
        if (domain) {
          apollo = await enrichByDomain(domain);
          apolloSource = "domain";
        }
      }
    } catch (e) {
      console.warn(`[prospection] apollo enrichment échec: ${(e as Error).message}`);
      apollo = null;
    }
  }

  const apolloBlock = apollo
    ? `\n\nENRICHISSEMENT APOLLO (source=${apolloSource})\n${summarizeApolloEnrichment(apollo)}`
    : "";

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("prospection", PROSPECTION_SYSTEM) },
      {
        role: "user",
        content: `Lead à qualifier:\n\n${leadContextString(lead)}${apolloBlock}\n\nProduis le JSON de qualification.`,
      },
    ],
    temperature: 0.3,
    maxTokens: 1500,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<ProspectionOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Sécurise les bornes
  const bantScore = Math.max(0, Math.min(100, Math.round(out.bant_score ?? 0)));

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_enrich",
      trigger_payload: { lead_id: leadId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Action proposée: changement de stage (validée par CEO avant écriture sur asvc_leads)
  const willChangeStage =
    out.suggested_next_stage && out.suggested_next_stage !== lead.stage;

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "qualify_lead",
      criticality: bantScore >= 70 ? "high" : "normal",
      title: `Qualification ${lead.company_name} — BANT ${bantScore}/100`,
      description: out.qualification_summary,
      proposed_payload: {
        lead_id: leadId,
        company: lead.company_name,
        bant_score: bantScore,
        bant_breakdown: out.bant_breakdown,
        fit_products: out.fit_products,
        fit_rationale: out.fit_rationale,
        research_checklist: out.research_checklist,
        update_lead: {
          score: bantScore,
          stage: willChangeStage ? out.suggested_next_stage : lead.stage,
          product_interest: out.fit_products,
        },
      },
      context: {
        previous_stage: lead.stage,
        previous_score: lead.score,
        model,
        apollo_used: apollo !== null,
        apollo_source: apolloSource,
        apollo_match: apollo?.found ?? false,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "prospection",
    p_event_type: "lead_qualified",
    p_resource_type: "asvc_leads",
    p_resource_id: leadId,
    p_payload: {
      action_id: action!.id,
      bant_score: bantScore,
      suggested_next_stage: out.suggested_next_stage,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    leadId,
    bantScore,
    fitProducts: out.fit_products ?? [],
    suggestedNextStage: out.suggested_next_stage,
    qualificationSummary: out.qualification_summary,
    tokensUsed,
  };
}
