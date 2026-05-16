// ASVC v2.0 — Dev Agent: draft d'un plan d'implémentation + structure de PR.
//
// IMPORTANT: ce MVP ne pousse PAS de code sur GitHub directement (intégration
// GitHub MCP à câbler ultérieurement). L'agent produit:
//   - Le plan d'implémentation par fichiers (ajouts/modifs)
//   - Le contenu textuel attendu de la PR (description Markdown)
//   - La liste de fichiers à créer/modifier avec snippets clés
//   - Une checklist de tests à demander à QA Agent
//
// La CEO valide → un humain (ou un connecteur GitHub futur) ouvre la PR.

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

const DEV_SYSTEM = `Tu es Dev Agent de Atlas Studio. Senior fullstack virtuel.

STACK (NON-NÉGOCIABLE)
- Frontend : React 18 + TypeScript strict + Tailwind + Zustand + React Query
- Backend  : Supabase (Postgres + RLS + Edge Functions Deno)
- Tests    : Vitest + Playwright
- Style    : conventions Atlas Studio (Exo 2, Grand Hotel, JetBrains Mono, #0A0A0A + #EF9F27)
- i18n     : strings UI dans locales/fr/*.json + locales/en/*.json

INTERDICTIONS ABSOLUES
- ❌ JAMAIS commit sur main (toujours PR sur branche asvc/feature-* ou asvc/fix-*)
- ❌ JAMAIS modifier .github/workflows/*
- ❌ JAMAIS supprimer de migrations Supabase existantes
- ❌ JAMAIS désactiver de tests existants
- ❌ JAMAIS ajouter de dépendance npm sans justification + check sécurité
- ❌ JAMAIS de any TypeScript, jamais de @ts-ignore

CONVENTIONS DE COMMITS (Conventional Commits)
type(scope): description courte impérative
types: feat, fix, refactor, test, docs, chore, perf
scope: nom app concernée (atlas-finance, liasspilot, asvc, ...)

CONTENU DE TON PLAN
- branch_name au format asvc/feature-{kebab-case} ou asvc/fix-{kebab-case}
- description PR structurée (## Contexte, ## Changements, ## Tests, ## Rollback)
- file_plan: liste de fichiers avec action (create|modify|delete) + key_snippet
- test_plan: liste de tests à demander à QA Agent
- commits: 1 PR = 1 feature atomique, plusieurs commits si pertinent

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "branch_name":         "asvc/feature-xxx",
  "pr_title":            "type(scope): description (max 70 chars)",
  "pr_description":      "Description Markdown complète",
  "file_plan":           [{"action":"create|modify|delete","path":"src/...","purpose":"...","key_snippet":"..."}],
  "commits":             [{"type":"feat","scope":"asvc","description":"...","files":["..."]}],
  "test_plan":           [{"test_type":"unit|integration|e2e","what":"..."}],
  "rollback_strategy":   "Comment annuler proprement si problème",
  "story_points_actual": <int>,
  "open_questions":      ["question 1", "question 2"],
  "estimated_dev_hours": <number>
}`;

interface DevOutput {
  branch_name: string;
  pr_title: string;
  pr_description: string;
  file_plan: Array<{
    action: "create" | "modify" | "delete";
    path: string;
    purpose: string;
    key_snippet: string;
  }>;
  commits: Array<{ type: string; scope: string; description: string; files: string[] }>;
  test_plan: Array<{ test_type: string; what: string }>;
  rollback_strategy: string;
  story_points_actual: number;
  open_questions: string[];
  estimated_dev_hours: number;
}

export interface DraftPrPlanResult {
  actionId: string;
  prId: string;
  branchName: string;
  prTitle: string;
  filesPlanned: number;
  storyPoints: number;
  tokensUsed: number;
}

export async function draftPullRequestPlan(specId: string, repo: string): Promise<DraftPrPlanResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_DEV_MODEL") ?? "claude-sonnet-4-6";

  const { data: spec, error: spErr } = await supabaseAdmin
    .from("asvc_product_specs")
    .select(
      "id, title, vision, user_stories, acceptance_criteria, technical_architecture, api_endpoints, database_schema, story_points, markdown_content, status, approved_by_ceo",
    )
    .eq("id", specId)
    .single();
  if (spErr || !spec) throw new Error(`Spec introuvable: ${spErr?.message ?? specId}`);

  // Garde-fou: spec doit être approuvée par la CEO
  if (!spec.approved_by_ceo) {
    throw new Error(
      `Spec non approuvée par la CEO (status=${spec.status}). Le Dev Agent ne peut pas démarrer.`,
    );
  }

  const agentId = await fetchAgentIdByCode("dev");

  const userPrompt = `SPEC APPROUVÉE PAR LA CEO
Repo cible: ${repo}

# ${spec.title}

${spec.vision ?? ""}

## User stories
${JSON.stringify(spec.user_stories ?? [], null, 2)}

## Acceptance criteria
${JSON.stringify(spec.acceptance_criteria ?? [], null, 2)}

## Technical architecture
${spec.technical_architecture ?? "(non renseigné)"}

## API endpoints
${JSON.stringify(spec.api_endpoints ?? [], null, 2)}

## Database schema
${spec.database_schema ?? "(non renseigné)"}

## Story points spec: ${spec.story_points}

---

Produis le plan d'implémentation JSON (file_plan, commits, tests, rollback).
RAPPEL: pas de commit direct main, branche asvc/feature-* obligatoire.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("dev", DEV_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 6000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<DevOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Validation côté serveur: branche doit commencer par asvc/feature- ou asvc/fix-
  if (!/^asvc\/(feature|fix|refactor)-/.test(out.branch_name)) {
    throw new Error(
      `Nom de branche invalide: "${out.branch_name}". Doit commencer par asvc/feature- ou asvc/fix-`,
    );
  }

  // Insère la PR (status='draft' — pas encore poussée sur GitHub)
  const { data: pr, error: prErr } = await supabaseAdmin
    .from("asvc_code_pull_requests")
    .insert({
      spec_id: specId,
      agent_id: agentId,
      repo,
      branch_name: out.branch_name,
      title: out.pr_title.slice(0, 200),
      description: out.pr_description,
      files_changed: out.file_plan.length,
      qa_status: "pending",
      status: "draft",
    })
    .select("id")
    .single();
  if (prErr) throw new Error(`pr: ${prErr.message}`);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_dev_plan",
      trigger_payload: { spec_id: specId, repo },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Action: orange (code action — validation COO suffit pour création branche,
  // mais on garde 'high' pour visibilité Pame avant l'ouverture PR humaine)
  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "create_pull_request",
      criticality: "high",
      title: `[${repo}] ${out.pr_title}`,
      description: `Plan d'implémentation : ${out.file_plan.length} fichiers, ${out.story_points_actual} SP, ~${out.estimated_dev_hours}h dev.`,
      proposed_payload: {
        pr_id: pr!.id,
        spec_id: specId,
        repo,
        branch_name: out.branch_name,
        pr_title: out.pr_title,
        pr_description: out.pr_description,
        file_plan: out.file_plan,
        commits: out.commits,
        test_plan: out.test_plan,
        rollback_strategy: out.rollback_strategy,
      },
      context: {
        spec_title: spec.title,
        spec_story_points: spec.story_points,
        actual_story_points: out.story_points_actual,
        estimated_dev_hours: out.estimated_dev_hours,
        open_questions: out.open_questions,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin
    .from("asvc_code_pull_requests")
    .update({ related_action_id: action!.id })
    .eq("id", pr!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "dev",
    p_event_type: "pr_plan_drafted",
    p_resource_type: "asvc_code_pull_requests",
    p_resource_id: pr!.id,
    p_payload: {
      action_id: action!.id,
      repo,
      branch_name: out.branch_name,
      files_count: out.file_plan.length,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    prId: pr!.id,
    branchName: out.branch_name,
    prTitle: out.pr_title,
    filesPlanned: out.file_plan.length,
    storyPoints: out.story_points_actual,
    tokensUsed,
  };
}
