// ASVC — Closer Agent: draft de proposition commerciale.

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import {
  fetchLead,
  fetchRecentInteractions,
  fetchAgentIdByCode,
  parseJsonOutput,
  leadContextString,
} from "./sales-common.ts";

const CLOSER_SYSTEM = `Tu es Closer Agent de Atlas Studio.
Tu draftes des propositions commerciales pour des prospects ayant fait une démo.

STRUCTURE OBLIGATOIRE (Markdown)
# Proposition commerciale — {{company}}

## Contexte & enjeux
3-5 lignes synthétisant les besoins exprimés en démo.

## Solution proposée
- Liste des apps Atlas Studio retenues
- Pour chacune: bénéfice métier en 1-2 lignes (pas de feature list verbeuse)

## Phasage suggéré
Mois 1, Mois 2-3, etc.

## Périmètre technique
- Hébergement, sécurité (RLS, MFA), conformité OHADA/SYSCOHADA si pertinent
- Données: import, migration, intégrations

## Investissement
**À COMPLÉTER PAR LA CEO** — la grille tarifaire n'est pas dans tes contraintes.
Inclus uniquement les éléments de PÉRIMÈTRE ici (apps, nb users, durée) — pas de montant.

## Engagements Atlas Studio
- SLA, support, formation

## Étapes suivantes
1. Validation périmètre (J+0)
2. Bon de commande (J+...)
3. Kick-off (J+...)

RÈGLES STRICTES
- Tu ne donnes JAMAIS de prix. Tu laisses "À COMPLÉTER PAR LA CEO".
- Tu n'engages pas juridiquement Atlas Studio (pas de pénalités, garanties chiffrées).
- Tu ne promets pas de feature non listée dans le catalogue.
- Tu cites les références OHADA / SYSCOHADA / CNPS / DGI si pertinent.
- Tu rédiges en français professionnel, ton confiant mais respectueux.

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "proposal_markdown":   "<Markdown complet de la proposition>",
  "apps_recommended":    ["atlas-finance", "atlastrade"],
  "estimated_phase_count": <int>,
  "estimated_duration_months": <int>,
  "open_questions":      ["question CEO 1", "question 2"],
  "rationale":           "1-2 phrases pourquoi cette config"
}`;

interface CloserOutput {
  proposal_markdown: string;
  apps_recommended: string[];
  estimated_phase_count: number;
  estimated_duration_months: number;
  open_questions: string[];
  rationale: string;
}

export interface DraftProposalResult {
  actionId: string;
  leadId: string;
  proposalMarkdown: string;
  appsRecommended: string[];
  openQuestions: string[];
  tokensUsed: number;
}

export async function draftProposal(leadId: string): Promise<DraftProposalResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_CLOSER_MODEL") ?? "claude-sonnet-4-6";

  const lead = await fetchLead(leadId);
  const interactions = await fetchRecentInteractions(leadId, 15);
  const agentId = await fetchAgentIdByCode("closer");

  const histFmt = interactions.length
    ? interactions
        .map(
          (i) =>
            `[${new Date(i.created_at).toLocaleString("fr-FR")}] ${i.direction} via ${i.channel} → ${i.outcome ?? ""}: ${(i.content ?? "").slice(0, 300)}`,
        )
        .join("\n\n")
    : "(aucune interaction précédente)";

  const userPrompt = `LEAD
${leadContextString(lead)}

HISTORIQUE INTERACTIONS
${histFmt}

Draft la proposition commerciale au format demandé.`;

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("closer", CLOSER_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 3500,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<CloserOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Garde-fou CDC: proposition > 2M FCFA potentiel = validation CEO obligatoire AVANT envoi
  // → criticality high systématique (en pratique toute proposition Closer doit être validée)
  // Mais si lead value > 5M, criticality critical
  let criticality: "low" | "normal" | "high" | "critical" = "high";
  if ((lead.contract_value_fcfa ?? 0) > 5_000_000) criticality = "critical";

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_proposal_draft",
      trigger_payload: { lead_id: leadId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "send_commercial_proposal",
      criticality,
      title: `Proposition commerciale — ${lead.company_name}`,
      description: out.rationale || `Proposition draftée pour ${lead.company_name}.`,
      proposed_payload: {
        lead_id: leadId,
        company: lead.company_name,
        contact_email: lead.contact_email,
        contact_name: lead.contact_name,
        proposal_markdown: out.proposal_markdown,
        apps_recommended: out.apps_recommended,
        estimated_phase_count: out.estimated_phase_count,
        estimated_duration_months: out.estimated_duration_months,
        open_questions: out.open_questions,
      },
      context: {
        lead_stage: lead.stage,
        lead_score: lead.score,
        contract_value_fcfa: lead.contract_value_fcfa,
        interactions_count: interactions.length,
        rationale: out.rationale,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "closer",
    p_event_type: "proposal_drafted",
    p_resource_type: "asvc_leads",
    p_resource_id: leadId,
    p_payload: {
      action_id: action!.id,
      apps: out.apps_recommended,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    leadId,
    proposalMarkdown: out.proposal_markdown,
    appsRecommended: out.apps_recommended ?? [],
    openQuestions: out.open_questions ?? [],
    tokensUsed,
  };
}
