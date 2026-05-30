// ASVC — Content Agent: draft de posts sociaux / newsletter / article.
//
// Pipeline:
//   1. Sélectionne le mode de prompt selon channel (linkedin/x/instagram/facebook/newsletter/blog)
//   2. Demande à Claude un draft conforme aux contraintes plateforme
//   3. Insère asvc_content_calendar(status='pending_approval')
//   4. Insère action_proposed (action_type='publish_post')
//   5. Audit log

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";

export type ContentChannel =
  | "linkedin"
  | "x"
  | "instagram"
  | "facebook"
  | "newsletter"
  | "blog";

const CONTENT_SYSTEM = `Tu es Content Agent de Atlas Studio.
Tu rédiges des posts pour la marque Atlas Studio — SaaS B2B francophone Afrique
de l'Ouest et Centrale (UEMOA + CEMAC).

VOIX DE MARQUE
- Expert mais accessible (vulgarisation technique OHADA/SYSCOHADA/fiscale).
- Direct sans agressivité. Fier des origines africaines sans victimisation.
- Engagé pour la souveraineté numérique africaine.
- Pas de bullshit corporate. MOTS BANNIS : "synergies", "disruption",
  "révolutionnaire", "game-changer", "unlock", "leverage".
- Référence régulière au contexte local : FCFA, BCEAO, COBAC, OHADA, CNPS, DGI.

CONTRAINTES PAR CANAL
- linkedin   : 200-400 mots. Hook fort première ligne. Paragraphes courts.
               3-5 hashtags pertinents en fin.
- x          : thread 5-10 tweets numérotés (1/8, 2/8...) ou one-shot punchy
               280 chars max. 1-2 hashtags max.
- instagram  : copy 100 mots max. Carousel suggestions (8-10 slides) OU
               post simple. 5-10 hashtags en commentaire séparé.
- facebook   : 150-200 mots. Ton convivial. 1 image suggérée obligatoire.
- newsletter : 400-700 mots. Structure : hook, contexte, valeur, CTA.
               Subject line < 60 chars.
- blog       : 800-1500 mots. Structure H2/H3. Format Markdown.
               Optimisé SEO sur 1-2 mots-clés.

INTERDICTIONS ABSOLUES
- Aucune polémique politique ni religieuse.
- Aucune comparaison nominative négative (Sage, Odoo, etc.) — positionnement
  positif uniquement.
- Aucune promesse chiffrée non validée (pas de "X% de gain de temps").
- Aucun visage de personne réelle généré par IA sans précision claire.

FORMAT DE SORTIE
Tu produis STRICTEMENT un JSON unique (rien autour):
{
  "title":         "Titre interne (max 80 chars)",
  "content":       "Texte complet du post / article, prêt à publier",
  "hashtags":      ["#hashtag1", "#hashtag2"],
  "image_prompt":  "Description en EN pour générer une image (style, sujet, couleurs). null si pas pertinent.",
  "subject_line":  "Subject line newsletter (null si pas newsletter)",
  "rationale":     "1-2 phrases : pourquoi cet angle / quel KPI visé (interne)"
}`;

const CHANNEL_CONSTRAINTS: Record<ContentChannel, string> = {
  linkedin: "200-400 mots, hook fort, 3-5 hashtags en fin de post",
  x: "Thread numéroté ou one-shot 280 chars, 1-2 hashtags max",
  instagram: "Copy 100 mots max, hashtags en commentaire (5-10)",
  facebook: "150-200 mots, ton convivial, image suggérée",
  newsletter: "400-700 mots, subject line < 60 chars, structure hook→contexte→valeur→CTA",
  blog: "800-1500 mots Markdown H2/H3, SEO 1-2 mots-clés",
};

interface DraftPostOutput {
  title: string;
  content: string;
  hashtags: string[];
  image_prompt: string | null;
  subject_line: string | null;
  rationale: string;
}

function parsePostOutput(raw: string): DraftPostOutput {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const i0 = s.indexOf("{");
  const iN = s.lastIndexOf("}");
  if (i0 === -1 || iN === -1) throw new Error("Pas de JSON détecté");
  const parsed = JSON.parse(s.slice(i0, iN + 1));
  if (typeof parsed.content !== "string" || parsed.content.length < 20) {
    throw new Error("content manquant ou trop court");
  }
  return {
    title: typeof parsed.title === "string" ? parsed.title.slice(0, 200) : "Post sans titre",
    content: parsed.content,
    hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 15) : [],
    image_prompt: typeof parsed.image_prompt === "string" ? parsed.image_prompt : null,
    subject_line: typeof parsed.subject_line === "string" ? parsed.subject_line : null,
    rationale: typeof parsed.rationale === "string" ? parsed.rationale : "",
  };
}

export interface DraftPostParams {
  channel: ContentChannel;
  topic: string;
  scheduledAt?: string;
  context?: string;
}

export interface DraftPostResult {
  actionId: string;
  contentId: string;
  channel: ContentChannel;
  title: string;
  content: string;
  hashtags: string[];
  imagePrompt: string | null;
  subjectLine: string | null;
  rationale: string;
  tokensUsed: number;
}

export async function draftPost(params: DraftPostParams): Promise<DraftPostResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_CONTENT_MODEL") ?? "claude-sonnet-4-6";

  const { data: agent } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", "content")
    .single();
  if (!agent) throw new Error("Agent 'content' introuvable");

  const userPrompt = `CANAL: ${params.channel}
CONTRAINTES: ${CHANNEL_CONSTRAINTS[params.channel]}

SUJET / ANGLE
${params.topic}

${params.context ? `CONTEXTE COMPLÉMENTAIRE\n${params.context}\n` : ""}
${params.scheduledAt ? `PROGRAMMATION PRÉVUE: ${params.scheduledAt}\n` : ""}
Produis le JSON maintenant.`;

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("content", CONTENT_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    maxTokens: 2500,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parsePostOutput(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agent.id,
      trigger_type: "manual_content_draft",
      trigger_payload: { channel: params.channel, topic: params.topic.slice(0, 200) },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Insertion dans le content calendar
  const { data: content, error: cErr } = await supabaseAdmin
    .from("asvc_content_calendar")
    .insert({
      agent_id: agent.id,
      channel: params.channel,
      content_type:
        params.channel === "newsletter" ? "newsletter" :
        params.channel === "blog" ? "article" :
        "post",
      title: out.title,
      content: out.content,
      hashtags: out.hashtags,
      scheduled_at: params.scheduledAt ?? null,
      status: "pending_approval",
    })
    .select("id")
    .single();
  if (cErr) throw new Error(`content_calendar: ${cErr.message}`);

  // Action pour arbitrage
  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agent.id,
      action_type: "publish_post",
      criticality: "normal",
      title: `${params.channel.toUpperCase()} — ${out.title}`,
      description: out.rationale || `Post ${params.channel} drafté.`,
      proposed_payload: {
        content_id: content!.id,
        channel: params.channel,
        title: out.title,
        content: out.content,
        hashtags: out.hashtags,
        image_prompt: out.image_prompt,
        subject_line: out.subject_line,
        scheduled_at: params.scheduledAt ?? null,
      },
      context: {
        topic: params.topic,
        rationale: out.rationale,
        chars: out.content.length,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // Lie l'action au content_calendar pour traçabilité
  await supabaseAdmin
    .from("asvc_content_calendar")
    .update({ related_action_id: action!.id })
    .eq("id", content!.id);

  // Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "content",
    p_event_type: "post_drafted",
    p_resource_type: "asvc_content_calendar",
    p_resource_id: content!.id,
    p_payload: {
      action_id: action!.id,
      channel: params.channel,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    contentId: content!.id,
    channel: params.channel,
    title: out.title,
    content: out.content,
    hashtags: out.hashtags,
    imagePrompt: out.image_prompt,
    subjectLine: out.subject_line,
    rationale: out.rationale,
    tokensUsed,
  };
}
