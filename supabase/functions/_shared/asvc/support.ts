// ASVC — Support N1 Agent: draft de réponse à un ticket.
//
// Pipeline:
//   1. Charge le ticket + tous les messages du fil
//   2. Construit le prompt système Support N1 (catalogue produits + règles)
//   3. Appelle Claude (drafting = qualité plus que volume → claude-sonnet)
//   4. Détecte les triggers d'escalade
//   5. Insère asvc_agent_actions(status='proposed') avec le draft
//   6. Audit log
//   7. Retourne l'action pour affichage immédiat

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";

interface Ticket {
  id: string;
  ticket_number: string;
  source: string;
  client_email: string | null;
  client_name: string | null;
  app_concerned: string | null;
  subject: string | null;
  initial_message: string;
  category: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  sentiment_score: number | null;
}

interface TicketMessage {
  id: string;
  sender_type: "client" | "agent" | "ceo";
  content: string;
  created_at: string;
}

const SUPPORT_N1_SYSTEM = `Tu es Support Agent N1 de Atlas Studio. Premier point de contact des clients SaaS.

IDENTITÉ
- Français professionnel et bienveillant. Bascule en EN si le client écrit en anglais.
- Tu signes "L'équipe Atlas Studio" — JAMAIS un nom personnel ni "Support N1".
- Si on te demande directement si tu es une IA, réponds honnêtement.

CATALOGUE PRODUITS (à maîtriser)
- Atlas Finance : ERP SYSCOHADA (Bilan, CdR, TFT, TAFIRE)
- LiassPilot : liasse fiscale 84 pages, bridge auto depuis Atlas Finance
- CashPilot : gestion trésorerie
- WiseHR : SIRH (paie, CNPS CI, congés)
- WiseFM : GMAO facility management
- AtlasBanx : audit relevés bancaires
- ADVIST : workflow documentaire + signature électronique
- DocJourney : circulation locale documents
- DueDeck : due diligence investissement
- AtlasTrade : gestion commerciale B2B
- TableSmart : QR-code restaurant management
- Atlas Lease : gestion locative commerciale
- CockpitJourney : pilotage projets
- Cockpit FNA : rapports gestion + dashboards

RÈGLES DE DRAFTING
- 200 mots maximum.
- Salue par le prénom du client si connu.
- Toujours proposer une étape suivante claire (action, lien doc, escalade).
- Pas d'emojis (sauf 😊 en clôture si contexte positif).
- Phrases courtes, paragraphes aérés.
- Vouvoiement par défaut (tutoiement si le client tutoie d'abord).

INTERDICTIONS ABSOLUES
- Ne JAMAIS promettre une feature inexistante.
- Ne JAMAIS donner un prix sans connaître la grille.
- Ne JAMAIS engager Atlas Studio juridiquement.
- Ne JAMAIS dire "votre demande est traitée" — tu drafts, la CEO valide.

ÉVALUATION
À la fin de ta réponse, ajoute UNE LIGNE séparée commençant par "META:" avec un JSON strict:
META: {"category":"question|bug|billing|feature_request|churn_risk","confidence":0.0-1.0,"escalate":true|false,"escalate_reason":"..."|null}

Tu drafts MAINTENANT la réponse, suivie de la ligne META.`;

const ESCALATION_KEYWORDS = [
  "annulation", "annuler", "résiliation", "résilier",
  "remboursement", "rembourser", "refund",
  "juridique", "avocat", "tribunal", "procès", "mise en demeure",
  "RGPD", "données personnelles",
  "presse", "twitter", "linkedin",
];

interface DraftResult {
  draftText: string;
  meta: {
    category: string | null;
    confidence: number | null;
    escalate: boolean;
    escalate_reason: string | null;
  };
  rawOutput: string;
}

/** Parse la ligne META: { ... } finale du draft. */
function parseDraft(raw: string): DraftResult {
  const lines = raw.split(/\r?\n/);
  let metaLine = "";
  let textEnd = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^META:\s*\{/i.test(lines[i].trim())) {
      metaLine = lines[i].trim().replace(/^META:\s*/i, "");
      textEnd = i;
      break;
    }
  }
  const draftText = lines.slice(0, textEnd).join("\n").trim();
  let meta: DraftResult["meta"] = {
    category: null,
    confidence: null,
    escalate: false,
    escalate_reason: null,
  };
  try {
    if (metaLine) {
      const parsed = JSON.parse(metaLine);
      meta = {
        category: typeof parsed.category === "string" ? parsed.category : null,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : null,
        escalate: parsed.escalate === true,
        escalate_reason: typeof parsed.escalate_reason === "string" ? parsed.escalate_reason : null,
      };
    }
  } catch {
    // META mal formé → on ne bloque pas, draft text reste utilisable.
  }
  return { draftText, meta, rawOutput: raw };
}

/** Détecte des mots-clés d'escalade systématique (overrides agent). */
function detectEscalationKeywords(text: string): string | null {
  const lower = text.toLowerCase();
  for (const kw of ESCALATION_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return kw;
    }
  }
  return null;
}

export interface DraftTicketResponseResult {
  actionId: string;
  ticketId: string;
  draftText: string;
  criticality: "low" | "normal" | "high" | "critical";
  meta: DraftResult["meta"];
  escalationReason: string | null;
  tokensUsed: number;
}

/** Génère un draft de réponse pour un ticket donné. */
export async function draftTicketResponse(ticketId: string): Promise<DraftTicketResponseResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante — configurer la variable d'env de l'edge function",
    );
  }
  const model = Deno.env.get("ASVC_SUPPORT_MODEL") ?? "claude-sonnet-4-6";

  // 1. Charger le ticket
  const { data: ticket, error: ticketErr } = await supabaseAdmin
    .from("asvc_tickets")
    .select(
      "id,ticket_number,source,client_email,client_name,app_concerned,subject,initial_message,category,priority,sentiment_score",
    )
    .eq("id", ticketId)
    .single();
  if (ticketErr || !ticket) {
    throw new Error(`Ticket introuvable: ${ticketErr?.message ?? ticketId}`);
  }
  const t = ticket as Ticket;

  // 2. Charger le fil
  const { data: messages } = await supabaseAdmin
    .from("asvc_ticket_messages")
    .select("id,sender_type,content,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });
  const fil = (messages as TicketMessage[] | null) ?? [];

  // 3. Charger l'agent support_n1
  const { data: agent } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", "support_n1")
    .single();
  if (!agent) throw new Error("Agent 'support_n1' introuvable dans asvc_agents");

  // 4. Construire le prompt user
  const filFormatted = fil.length
    ? fil
        .map(
          (m) =>
            `[${new Date(m.created_at).toLocaleString("fr-FR")}] ${m.sender_type === "client" ? "Client" : m.sender_type === "agent" ? "Atlas Studio" : "CEO"}: ${m.content}`,
        )
        .join("\n\n")
    : "(aucun échange précédent)";

  const userPrompt = `Ticket ${t.ticket_number}
Source: ${t.source}
Application: ${t.app_concerned ?? "non précisée"}
Client: ${t.client_name ?? t.client_email ?? "anonyme"}
Sujet: ${t.subject ?? "(sans objet)"}

Message initial:
${t.initial_message}

Historique des échanges:
${filFormatted}

Rédige le draft de réponse maintenant, puis la ligne META.`;

  // 5. Appel Claude
  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("support_n1", SUPPORT_N1_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 1000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const parsed = parseDraft(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // 6. Détection escalade par mots-clés (override agent)
  const fullText = `${t.initial_message}\n${fil.map((m) => m.content).join("\n")}`;
  const kwEscalation = detectEscalationKeywords(fullText);
  const escalationReason = parsed.meta.escalate
    ? parsed.meta.escalate_reason ?? "agent self-escalation"
    : kwEscalation
      ? `mot-clé détecté: ${kwEscalation}`
      : null;

  // Sentiment négatif → escalade aussi
  const sentimentEscalation =
    typeof t.sentiment_score === "number" && t.sentiment_score < -0.5
      ? `sentiment négatif (${t.sentiment_score})`
      : null;

  const finalEscalation = escalationReason ?? sentimentEscalation;

  // 7. Calcul criticality
  let criticality: "low" | "normal" | "high" | "critical" = "normal";
  if (finalEscalation) criticality = "critical";
  else if (t.priority === "urgent") criticality = "high";
  else if (t.priority === "low") criticality = "low";

  // 8. Créer une session puis l'action
  const { data: session, error: sessErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agent.id,
      trigger_type: "manual_draft_request",
      trigger_payload: { ticket_id: ticketId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sessErr) throw new Error(`session: ${sessErr.message}`);

  const title = finalEscalation
    ? `🚨 Escalade ticket ${t.ticket_number}`
    : `Réponse proposée — ${t.ticket_number}`;

  const description = finalEscalation
    ? `Support N1 escalade ce ticket: ${finalEscalation}. Draft fourni à titre indicatif.`
    : `Réponse draftée pour ${t.client_name ?? t.client_email ?? "client"} sur ${t.app_concerned ?? "Atlas Studio"}.`;

  const { data: action, error: actErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agent.id,
      action_type: finalEscalation ? "escalate_ticket" : "send_ticket_response",
      criticality,
      title,
      description,
      proposed_payload: {
        ticket_id: ticketId,
        ticket_number: t.ticket_number,
        client_email: t.client_email,
        channel: t.source,
        response_text: parsed.draftText,
        meta: parsed.meta,
      },
      context: {
        ticket_subject: t.subject,
        ticket_app: t.app_concerned,
        ticket_priority: t.priority,
        sentiment_score: t.sentiment_score,
        escalation_reason: finalEscalation,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (actErr) throw new Error(`action: ${actErr.message}`);

  // 9. Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "support_n1",
    p_event_type: "ticket_response_drafted",
    p_resource_type: "asvc_tickets",
    p_resource_id: ticketId,
    p_payload: {
      action_id: action!.id,
      tokens_used: tokensUsed,
      criticality,
      escalation_reason: finalEscalation,
    },
  });

  return {
    actionId: action!.id,
    ticketId,
    draftText: parsed.draftText,
    criticality,
    meta: parsed.meta,
    escalationReason: finalEscalation,
    tokensUsed,
  };
}
