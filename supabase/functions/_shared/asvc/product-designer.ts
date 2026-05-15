// ASVC v2.0 — Product Designer Agent: produit une product spec complète.
//
// Pipeline:
//   1. Lit l'opportunité validée par la CEO (status='approved')
//   2. Charge le research brief associé
//   3. Demande à Claude une spec structurée (vision, user stories, archi, wireframes Mermaid)
//   4. Insère asvc_product_specs (status='pending_approval')
//   5. Action_proposed pour validation finale CEO avant développement

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

const PRODUCT_DESIGNER_SYSTEM = `Tu es Product Designer Agent de Atlas Studio.
Tu produis des product specs prêtes à coder.

CONTRAINTES NON-NÉGOCIABLES (DESIGN SYSTEM Atlas Studio)
- Stack technique: React 18 + TypeScript strict + Tailwind + Supabase + Edge Functions Deno
- Background principal: #0A0A0A (onyx)
- Accent: #EF9F27 (amber Atlas)
- Fonts: Exo 2 (UI), Grand Hotel (noms d'apps), JetBrains Mono (montants FCFA)
- Icônes monochromes uniquement (Lucide React)
- i18n FR + EN systématique
- RLS Supabase obligatoire sur toutes tables nouvelles
- Tests Vitest + Playwright à prévoir (coverage 80% min)

CONTENU DE LA SPEC
- Vision: 2-3 phrases sur le pourquoi de la feature
- User stories au format "As a [role] I want [goal] so that [benefit]"
- Acceptance criteria mesurables (Given/When/Then)
- Architecture technique: composants React + tables Supabase + edge functions + RLS
- Wireframes Mermaid (flowchart ou sequence)
- API endpoints (si applicable): méthode, path, body, response
- Schema SQL des nouvelles tables (DDL Postgres + RLS policies)
- Estimation: story points (Fibonacci 1, 2, 3, 5, 8, 13) + estimated_weeks

RÈGLES STRICTES
- Tu ne réinventes pas le design system, tu l'appliques.
- Tu listes les open_questions plutôt que d'inventer une réponse.
- Si un user story dépasse 5 SP, tu suggères de le découper.
- Tu identifies les risques techniques explicitement.

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "title":                    "Titre spec (max 100 chars)",
  "vision":                   "2-3 phrases",
  "user_stories":             [{"role":"...","goal":"...","benefit":"...","story_points":<int>}],
  "acceptance_criteria":      [{"story_idx":0,"given":"...","when":"...","then":"..."}],
  "technical_architecture":   "Texte Markdown détaillant l'archi",
  "wireframes_mermaid":       "diagramme Mermaid (flowchart TD ou sequenceDiagram)",
  "api_endpoints":            [{"method":"POST","path":"/asvc-xxx","body":{...},"response":{...}}],
  "database_schema":          "CREATE TABLE ... + ALTER TABLE ... ENABLE RLS + CREATE POLICY",
  "story_points":             <int total>,
  "estimated_weeks":          <number>,
  "risks":                    ["risque tech 1", "risque tech 2"],
  "open_questions":           ["question CEO 1", "question 2"],
  "markdown_full":            "Spec complète en Markdown structuré (1500-3000 mots)"
}`;

interface SpecOutput {
  title: string;
  vision: string;
  user_stories: Array<{ role: string; goal: string; benefit: string; story_points: number }>;
  acceptance_criteria: Array<{ story_idx: number; given: string; when: string; then: string }>;
  technical_architecture: string;
  wireframes_mermaid: string;
  api_endpoints: Array<Record<string, unknown>>;
  database_schema: string;
  story_points: number;
  estimated_weeks: number;
  risks: string[];
  open_questions: string[];
  markdown_full: string;
}

export interface DraftSpecResult {
  actionId: string;
  specId: string;
  opportunityId: string;
  title: string;
  storyPoints: number;
  estimatedWeeks: number;
  tokensUsed: number;
}

export async function draftProductSpec(opportunityId: string): Promise<DraftSpecResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_PRODUCT_DESIGNER_MODEL") ?? "claude-sonnet-4-6";

  const { data: opp, error: oErr } = await supabaseAdmin
    .from("asvc_opportunities")
    .select("id, title, description, category, rice_score, effort_estimate")
    .eq("id", opportunityId)
    .single();
  if (oErr || !opp) throw new Error(`Opportunité introuvable: ${oErr?.message ?? opportunityId}`);

  // Charge research brief si existant
  const { data: brief } = await supabaseAdmin
    .from("asvc_research_briefs")
    .select("title, problem_statement, key_findings, pain_points, recommendations, markdown_content")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const agentId = await fetchAgentIdByCode("product_designer");

  const briefSection = brief
    ? `RESEARCH BRIEF DISPONIBLE
- Problème: ${brief.problem_statement}
- Key findings: ${JSON.stringify(brief.key_findings ?? [])}
- Pain points: ${JSON.stringify(brief.pain_points ?? [])}
- Recommandations: ${brief.recommendations ?? "(n/a)"}`
    : "RESEARCH BRIEF: (non disponible — fonde-toi sur la description opportunité)";

  const userPrompt = `OPPORTUNITÉ APPROUVÉE PAR LA CEO
- Titre: ${opp.title}
- Description: ${opp.description}
- Catégorie: ${opp.category}
- Effort estimé initial: ${opp.effort_estimate}
- RICE: ${opp.rice_score}

${briefSection}

Produis la product spec JSON complète maintenant.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: PRODUCT_DESIGNER_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 8000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<SpecOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Insère la spec
  const { data: spec, error: spErr } = await supabaseAdmin
    .from("asvc_product_specs")
    .insert({
      opportunity_id: opportunityId,
      agent_id: agentId,
      spec_version: "1.0",
      title: out.title.slice(0, 200),
      vision: out.vision,
      user_stories: out.user_stories,
      acceptance_criteria: out.acceptance_criteria,
      technical_architecture: out.technical_architecture,
      wireframes_mermaid: out.wireframes_mermaid,
      api_endpoints: out.api_endpoints,
      database_schema: out.database_schema,
      story_points: out.story_points,
      estimated_weeks: out.estimated_weeks,
      markdown_content: out.markdown_full,
      status: "pending_approval",
    })
    .select("id")
    .single();
  if (spErr) throw new Error(`spec: ${spErr.message}`);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_spec_draft",
      trigger_payload: { opportunity_id: opportunityId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Criticality basée sur story_points
  const criticality: "low" | "normal" | "high" | "critical" =
    out.story_points >= 21 ? "high" : "normal";

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "approve_product_spec",
      criticality,
      title: `Spec ${out.title} — ${out.story_points} SP / ${out.estimated_weeks}sem`,
      description: out.vision,
      proposed_payload: {
        spec_id: spec!.id,
        opportunity_id: opportunityId,
        title: out.title,
        story_points: out.story_points,
        estimated_weeks: out.estimated_weeks,
        user_stories_count: out.user_stories.length,
        risks: out.risks,
        open_questions: out.open_questions,
        markdown_preview: out.markdown_full.slice(0, 2000),
      },
      context: {
        opportunity_title: opp.title,
        full_markdown_length: out.markdown_full.length,
        api_endpoints_count: (out.api_endpoints ?? []).length,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin
    .from("asvc_product_specs")
    .update({ related_action_id: action!.id })
    .eq("id", spec!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "product_designer",
    p_event_type: "product_spec_drafted",
    p_resource_type: "asvc_product_specs",
    p_resource_id: spec!.id,
    p_payload: {
      action_id: action!.id,
      story_points: out.story_points,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    specId: spec!.id,
    opportunityId,
    title: out.title,
    storyPoints: out.story_points,
    estimatedWeeks: out.estimated_weeks,
    tokensUsed,
  };
}
