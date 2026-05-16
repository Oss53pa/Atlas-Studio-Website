// ASVC v2.0 — Documentation Agent: produit la doc d'une feature.

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

export type DocType =
  | "user_guide"
  | "api_reference"
  | "changelog"
  | "tutorial_script"
  | "release_notes"
  | "admin_guide"
  | "troubleshooting";

const DOC_SYSTEM = `Tu es Documentation Agent de Atlas Studio.
Tu produis de la documentation utilisateur/technique en français OU anglais.

PRINCIPES
- Style clair, pédagogique, sans jargon inutile.
- Captures d'écran annotées suggérées (placeholders) — pas générées ici.
- Cohérence terminologique avec le glossaire Atlas Studio (FCFA, OHADA, SYSCOHADA, CNPS).
- Pas d'emoji décoratif (sauf liste de check ✅ pour les release notes).
- Markdown structuré (H2 max niveau 3).

STRUCTURE PAR TYPE
- user_guide       : Intro / Prérequis / Étapes / FAQ / Captures suggérées
- api_reference    : Endpoint / Auth / Body / Response / Errors / Exemples curl
- changelog        : ## v{X.Y.Z} — {date} avec ### Ajouts / Corrections / Modifications
- tutorial_script  : Scénario vidéo 3-5 min : intro, démo, conclusion + script ligne par ligne
- release_notes    : Court (200-300 mots), orienté valeur utilisateur, ✅ bullets
- admin_guide      : Configuration, RLS, secrets, monitoring
- troubleshooting  : Symptôme → Cause probable → Solution → Escalade

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "title":              "Titre du doc (max 100 chars)",
  "content_markdown":   "Markdown complet",
  "screenshots_suggested": [{"placement":"après section X","description":"capture montrant Y"}],
  "estimated_word_count": <int>,
  "rationale":          "1 phrase angle choisi"
}`;

interface DocOutput {
  title: string;
  content_markdown: string;
  screenshots_suggested: Array<{ placement: string; description: string }>;
  estimated_word_count: number;
  rationale: string;
}

export interface DraftDocParams {
  appName: string;
  docType: DocType;
  language: "fr" | "en";
  version: string;
  specId?: string;
  prId?: string;
  customBrief?: string;
}

export interface DraftDocResult {
  actionId: string;
  docId: string;
  docType: DocType;
  language: string;
  wordCount: number;
  tokensUsed: number;
}

export async function draftDocumentation(params: DraftDocParams): Promise<DraftDocResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_DOC_MODEL") ?? "claude-sonnet-4-6";

  const agentId = await fetchAgentIdByCode("documentation");

  let specContext = "";
  if (params.specId) {
    const { data: spec } = await supabaseAdmin
      .from("asvc_product_specs")
      .select("title, vision, user_stories, acceptance_criteria, markdown_content")
      .eq("id", params.specId)
      .maybeSingle();
    if (spec) {
      specContext = `SPEC SOURCE\n# ${spec.title}\n\n${spec.vision ?? ""}\n\n${(spec.markdown_content ?? "").slice(0, 5000)}\n`;
    }
  }

  let prContext = "";
  if (params.prId) {
    const { data: pr } = await supabaseAdmin
      .from("asvc_code_pull_requests")
      .select("title, description, repo, branch_name")
      .eq("id", params.prId)
      .maybeSingle();
    if (pr) {
      prContext = `PR SOURCE\n- Repo: ${pr.repo}\n- Branche: ${pr.branch_name}\n- Titre: ${pr.title}\n- Description: ${pr.description ?? ""}\n`;
    }
  }

  const userPrompt = `DEMANDE
- App: ${params.appName}
- Type doc: ${params.docType}
- Langue: ${params.language}
- Version: ${params.version}

${specContext}
${prContext}
${params.customBrief ? `BRIEF COMPLÉMENTAIRE\n${params.customBrief}\n` : ""}

Produis le JSON du document.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("documentation", DOC_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.4,
    maxTokens: 5000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<DocOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Insère le doc
  const { data: doc, error: docErr } = await supabaseAdmin
    .from("asvc_documentation_artifacts")
    .insert({
      agent_id: agentId,
      doc_type: params.docType,
      app_concerned: params.appName,
      language: params.language,
      version: params.version,
      title: out.title.slice(0, 200),
      content: out.content_markdown,
      related_spec_id: params.specId ?? null,
      related_pr_id: params.prId ?? null,
      status: "pending_approval",
    })
    .select("id")
    .single();
  if (docErr) throw new Error(`doc: ${docErr.message}`);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_doc_draft",
      trigger_payload: { app_name: params.appName, doc_type: params.docType, language: params.language },
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
      action_type: "publish_documentation",
      criticality: "normal",
      title: `${params.docType} ${params.language.toUpperCase()} ${params.appName} v${params.version}`,
      description: out.rationale,
      proposed_payload: {
        doc_id: doc!.id,
        app_name: params.appName,
        doc_type: params.docType,
        language: params.language,
        version: params.version,
        title: out.title,
        content_markdown: out.content_markdown,
        screenshots_suggested: out.screenshots_suggested,
      },
      context: {
        word_count: out.estimated_word_count,
        spec_id: params.specId,
        pr_id: params.prId,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin
    .from("asvc_documentation_artifacts")
    .update({ related_action_id: action!.id })
    .eq("id", doc!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "documentation",
    p_event_type: "doc_drafted",
    p_resource_type: "asvc_documentation_artifacts",
    p_resource_id: doc!.id,
    p_payload: {
      action_id: action!.id,
      doc_type: params.docType,
      language: params.language,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    docId: doc!.id,
    docType: params.docType,
    language: params.language,
    wordCount: out.estimated_word_count,
    tokensUsed,
  };
}
