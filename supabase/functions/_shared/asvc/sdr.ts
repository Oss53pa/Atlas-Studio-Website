// ASVC — SDR Agent: draft d'email/DM outreach pour un lead qualifié.

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

export type SdrChannel = "email" | "linkedin_dm" | "whatsapp";
export type SdrSequenceStep = "first_touch" | "follow_up_1" | "follow_up_2" | "breakup" | "demo_invite";

const SDR_SYSTEM = `Tu es SDR Agent de Atlas Studio.
Tu draftes des messages d'outreach 1-to-1 vers des prospects qualifiés.

PRINCIPES
- Français professionnel et chaleureux. Vouvoiement. Aucune familiarité forcée.
- TOUJOURS personnalisé. Au moins UN détail spécifique au prospect dans la 1ère ligne.
- Pas de pitch produit verbeux. Tu poses une question pertinente.
- TU NE PROMETS PAS de chiffres ni de prix.
- Tu signes "L'équipe Atlas Studio" — pas de nom personnel.
- Tu respectes la culture africaine: politesse en ouverture, sans flagornerie.

CONTRAINTES PAR CANAL
- email       : objet < 60 chars, corps 80-150 mots, 1 CTA clair
- linkedin_dm : 250 chars max, ton conversationnel
- whatsapp    : 400 chars max, ton direct, OK pour vouvoyer

ÉTAPES DE SÉQUENCE
- first_touch   : ouverture, contexte, question d'ouverture
- follow_up_1   : J+3, rappel doux, angle différent
- follow_up_2   : J+10, valeur concrète (cas client similaire)
- breakup       : J+21, "je ferme la boucle", porte ouverte future
- demo_invite   : proposition créneau démo précis

INTERDICTIONS
- Aucune mention de concurrent (Sage, Odoo, etc.)
- Aucune promesse de gain chiffrée
- Aucun emoji (sauf 👋 / 🤝 sur whatsapp uniquement, max 1)
- Pas de "j'espère que vous allez bien" — direct et utile

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "subject":      "objet si email, sinon null",
  "body":         "corps complet, prêt à envoyer",
  "char_count":   <int>,
  "personalization_signal": "détail spécifique exploité (1 phrase)",
  "next_step":    "first_touch|follow_up_1|follow_up_2|breakup|demo_invite",
  "rationale":    "1 phrase: angle choisi (interne)"
}`;

interface SdrOutput {
  subject: string | null;
  body: string;
  char_count: number;
  personalization_signal: string;
  next_step: SdrSequenceStep;
  rationale: string;
}

export interface SdrDraftParams {
  leadId: string;
  channel: SdrChannel;
  step?: SdrSequenceStep;
  customAngle?: string;
}

export interface SdrDraftResult {
  actionId: string;
  leadId: string;
  channel: SdrChannel;
  step: SdrSequenceStep;
  subject: string | null;
  body: string;
  rationale: string;
  tokensUsed: number;
}

export async function draftSdrOutreach(params: SdrDraftParams): Promise<SdrDraftResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_SDR_MODEL") ?? "claude-sonnet-4-6";

  const lead = await fetchLead(params.leadId);
  const interactions = await fetchRecentInteractions(params.leadId, 6);
  const agentId = await fetchAgentIdByCode("sdr");

  const histFmt = interactions.length
    ? interactions
        .map(
          (i) =>
            `[${new Date(i.created_at).toLocaleString("fr-FR")}] ${i.direction} via ${i.channel} → ${i.outcome ?? "(no outcome)"}: ${(i.content ?? "").slice(0, 200)}`,
        )
        .join("\n")
    : "(aucune interaction précédente)";

  const stepHint =
    params.step ??
    (interactions.length === 0
      ? "first_touch"
      : interactions.length === 1
        ? "follow_up_1"
        : interactions.length === 2
          ? "follow_up_2"
          : "breakup");

  const userPrompt = `LEAD
${leadContextString(lead)}

HISTORIQUE INTERACTIONS (anciens → récents)
${histFmt}

CANAL DEMANDÉ: ${params.channel}
ÉTAPE DEMANDÉE: ${stepHint}
${params.customAngle ? `ANGLE DEMANDÉ: ${params.customAngle}` : ""}

Produis le JSON de l'outreach maintenant.`;

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("sdr", SDR_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    maxTokens: 1200,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<SdrOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_sdr_draft",
      trigger_payload: { lead_id: params.leadId, channel: params.channel, step: stepHint },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Criticality: demo_invite et leads >2M FCFA = high
  let criticality: "low" | "normal" | "high" | "critical" = "normal";
  if (out.next_step === "demo_invite") criticality = "high";
  else if ((lead.contract_value_fcfa ?? 0) > 2_000_000) criticality = "high";

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type:
        params.channel === "email"
          ? "send_sdr_email"
          : params.channel === "linkedin_dm"
            ? "send_linkedin_dm"
            : "send_whatsapp_message",
      criticality,
      title: `${stepHint.replace(/_/g, " ")} ${params.channel} — ${lead.company_name}`,
      description: out.rationale || `Outreach drafté pour ${lead.contact_name ?? lead.contact_email}.`,
      proposed_payload: {
        lead_id: params.leadId,
        company: lead.company_name,
        contact_email: lead.contact_email,
        contact_name: lead.contact_name,
        channel: params.channel,
        step: out.next_step,
        subject: out.subject,
        body: out.body,
        personalization_signal: out.personalization_signal,
      },
      context: {
        lead_stage: lead.stage,
        lead_score: lead.score,
        interactions_count: interactions.length,
        char_count: out.char_count,
        rationale: out.rationale,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "sdr",
    p_event_type: "sdr_outreach_drafted",
    p_resource_type: "asvc_leads",
    p_resource_id: params.leadId,
    p_payload: {
      action_id: action!.id,
      channel: params.channel,
      step: out.next_step,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    leadId: params.leadId,
    channel: params.channel,
    step: out.next_step,
    subject: out.subject,
    body: out.body,
    rationale: out.rationale,
    tokensUsed,
  };
}
