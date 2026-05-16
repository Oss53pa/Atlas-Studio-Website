// ASVC — Community Agent: drafts une réponse à un commentaire / DM social,
// OU escalade au CEO si troll / sensible / hors-scope.
//
// Cet agent ne stocke pas les inbound messages (pas de table dédiée à ce stade).
// L'appelant (webhook LinkedIn / X / Meta) passe le message dans le body.
//
// Pipeline:
//   1. Classification rapide: troll / agressif / sensible / spam / question_légitime
//   2. Si non-actionnable → escalade (action criticality=high, action_type='moderation_escalation')
//   3. Si actionnable → draft une réponse courte (action_type='send_community_reply')
//   4. Audit log

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";

export type SocialChannel = "linkedin" | "x" | "instagram" | "facebook";

interface CommunityClassification {
  category: "question" | "compliment" | "criticism" | "troll" | "spam" | "off_topic" | "sensitive";
  sentiment: number; // -1..+1
  reply_recommended: boolean;
  escalate: boolean;
  escalate_reason: string | null;
}

const COMMUNITY_SYSTEM = `Tu es Community Agent de Atlas Studio. Tu modères et réponds aux
commentaires/DMs sur les réseaux sociaux (LinkedIn, X, Instagram, Facebook).

PRINCIPES
- Tu réponds en français (ou anglais si l'auteur l'utilise).
- Tu réponds courtoisement, même aux critiques constructives.
- Tu n'engages JAMAIS sur du politique, religieux, polémique.
- Tu n'argumente JAMAIS avec un troll. Tu signales pour escalade.
- Tu ne révèles pas d'info confidentielle (clients nominatifs, chiffres internes).
- Tu signes "L'équipe Atlas Studio" — jamais un nom personnel.
- Tu termines par une porte ouverte (DM, lien doc) si pertinent.

CONTRAINTES PAR PLATEFORME
- linkedin/facebook : 200 caractères max (commentaire), 500 (DM).
- x : 280 caractères max.
- instagram : 200 caractères max.

CLASSIFICATION
- question         : demande info produit/usage → réponse courte + lien doc si pertinent
- compliment       : remerciement chaleureux 1 phrase
- criticism        : critique constructive → réponse empathique, propose DM pour creuser
- troll            : insulte / mauvaise foi → escalade sans réponse
- spam             : publicité / lien externe douteux → escalade sans réponse
- off_topic        : hors-sujet → ignorer ou redirection courte vers le sujet
- sensitive        : politique / religieux / juridique → escalade systématique

FORMAT DE SORTIE
Tu produis STRICTEMENT un JSON unique (rien autour):
{
  "classification": {
    "category": "question|compliment|criticism|troll|spam|off_topic|sensitive",
    "sentiment": -1.0 à 1.0,
    "reply_recommended": true|false,
    "escalate": true|false,
    "escalate_reason": "raison concise ou null"
  },
  "reply_text": "texte de réponse si reply_recommended sinon empty string",
  "rationale": "1 phrase: ton raisonnement (interne)"
}`;

interface DraftReplyOutput {
  classification: CommunityClassification;
  reply_text: string;
  rationale: string;
}

function parseCommunityOutput(raw: string): DraftReplyOutput {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const i0 = s.indexOf("{");
  const iN = s.lastIndexOf("}");
  if (i0 === -1 || iN === -1) throw new Error("Pas de JSON détecté");
  const parsed = JSON.parse(s.slice(i0, iN + 1));
  const cls = parsed.classification ?? {};
  return {
    classification: {
      category: cls.category ?? "off_topic",
      sentiment: typeof cls.sentiment === "number" ? Math.max(-1, Math.min(1, cls.sentiment)) : 0,
      reply_recommended: cls.reply_recommended === true,
      escalate: cls.escalate === true,
      escalate_reason: typeof cls.escalate_reason === "string" ? cls.escalate_reason : null,
    },
    reply_text: typeof parsed.reply_text === "string" ? parsed.reply_text : "",
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
  };
}

export interface CommunityInbound {
  channel: SocialChannel;
  author_handle: string;
  author_display_name?: string;
  message: string;
  original_post_url?: string;
  message_type: "comment" | "dm" | "mention";
  followers_count?: number;
}

export interface CommunityResult {
  actionId: string;
  classification: CommunityClassification;
  replyText: string;
  rationale: string;
  tokensUsed: number;
}

export async function handleCommunityMessage(inbound: CommunityInbound): Promise<CommunityResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_COMMUNITY_MODEL") ?? "claude-sonnet-4-6";

  const { data: agent } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", "community")
    .single();
  if (!agent) throw new Error("Agent 'community' introuvable");

  const userPrompt = `INBOUND
Plateforme: ${inbound.channel}
Type: ${inbound.message_type}
Auteur: ${inbound.author_handle}${inbound.author_display_name ? ` (${inbound.author_display_name})` : ""}${inbound.followers_count !== undefined ? `, ${inbound.followers_count} abonnés` : ""}
${inbound.original_post_url ? `URL post original: ${inbound.original_post_url}` : ""}

MESSAGE
"""
${inbound.message}
"""

Classifie et draft la réponse.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("community", COMMUNITY_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 800,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseCommunityOutput(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Détermine action_type et criticality
  const cls = out.classification;
  const escalating = cls.escalate || ["troll", "spam", "sensitive"].includes(cls.category);
  const followersHigh = (inbound.followers_count ?? 0) > 1000;

  let criticality: "low" | "normal" | "high" | "critical";
  if (escalating && followersHigh) criticality = "critical";
  else if (escalating) criticality = "high";
  else if (cls.sentiment < -0.5) criticality = "high";
  else criticality = "normal";

  const actionType = escalating || !cls.reply_recommended
    ? "moderation_escalation"
    : "send_community_reply";

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agent.id,
      trigger_type: "community_inbound",
      trigger_payload: { channel: inbound.channel, author: inbound.author_handle },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  const title = escalating
    ? `🚨 ${cls.category} sur ${inbound.channel} — @${inbound.author_handle}`
    : `Réponse community — @${inbound.author_handle} (${inbound.channel})`;

  const description = escalating
    ? `${cls.escalate_reason ?? cls.category} — ne pas répondre sans validation CEO${followersHigh ? ` (compte ${inbound.followers_count} abonnés)` : ""}.`
    : out.rationale || `Réponse draftée à ${inbound.author_handle}.`;

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agent.id,
      action_type: actionType,
      criticality,
      title,
      description,
      proposed_payload: {
        channel: inbound.channel,
        author_handle: inbound.author_handle,
        message_type: inbound.message_type,
        original_message: inbound.message,
        reply_text: out.reply_text,
        original_post_url: inbound.original_post_url ?? null,
      },
      context: {
        classification: cls,
        rationale: out.rationale,
        followers_count: inbound.followers_count ?? null,
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
    p_actor_id: "community",
    p_event_type: escalating ? "community_escalated" : "community_reply_drafted",
    p_resource_type: "asvc_agent_actions",
    p_resource_id: action!.id,
    p_payload: {
      channel: inbound.channel,
      category: cls.category,
      sentiment: cls.sentiment,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    classification: cls,
    replyText: out.reply_text,
    rationale: out.rationale,
    tokensUsed,
  };
}
