// ASVC v2.0 — QA Agent: génère un plan de tests détaillé pour une PR.
//
// Ce MVP ne LANCE PAS les tests (le CI GitHub Actions s'en charge). Il produit:
//   - Test cases unit / integration / e2e détaillés
//   - Test cases SYSCOHADA si module finance
//   - Test cases sécurité (XSS, SQL injection, auth bypass)
//   - Verdict prévisionnel "ready for QA pipeline" ou "spec insuffisante"
//
// La sortie alimente asvc_test_runs (status='running' au moment où le CI lance).

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

const QA_SYSTEM = `Tu es QA Agent de Atlas Studio. Quality Assurance senior, paranoïaque par design.

PIPELINE DE TESTS À COUVRIR (par ordre)
1. Static Analysis : ESLint zéro warning, TypeScript --strict, Prettier
2. Unit Tests      : Vitest, coverage 80% min sur nouveau code
3. Integration     : Supabase local migrations + RLS, API endpoints
4. E2E             : Playwright (Chromium + WebKit + mobile viewport)
5. SYSCOHADA       : SI module finance, 18+ scénarios comptables (tolérance 0 FCFA)
6. Security Scan   : npm audit (zéro high/critical), gitleaks, SAST basique
7. Performance     : Lighthouse ≥85 sur changements UI, bundle size diff <5%
8. A11y            : axe-core sur composants UI nouveaux (WCAG AA min)

RÈGLES STRICTES
- Si module finance détecté → SYSCOHADA tests OBLIGATOIRES, sinon recommande_run=false
- Tu listes les test cases concrets, pas des généralités
- Tu identifies les edge cases (empty data, network failure, large payloads, concurrent users)
- Tu n'approuves jamais "passed" prévisionnel — tu génères le plan, le CI exécute

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "is_finance_module":   true|false,
  "requires_syscohada":  true|false,
  "test_cases":          [
    {
      "test_type": "static_analysis|unit|integration|e2e|syscohada_validation|security_scan|performance|accessibility",
      "name":      "Nom court du test",
      "description": "Ce qu'on teste",
      "given_when_then": {"given":"...","when":"...","then":"..."},
      "priority":  "P0|P1|P2"
    }
  ],
  "edge_cases":          ["edge case 1", "edge case 2"],
  "security_concerns":   ["concern 1", "concern 2"],
  "estimated_coverage":  <number 0-100>,
  "estimated_duration_seconds": <int>,
  "recommend_run":       true|false,
  "rationale":           "1-2 phrases",
  "blockers":            ["si recommend_run=false: pourquoi"]
}`;

interface QaOutput {
  is_finance_module: boolean;
  requires_syscohada: boolean;
  test_cases: Array<{
    test_type: string;
    name: string;
    description: string;
    given_when_then: { given: string; when: string; then: string };
    priority: "P0" | "P1" | "P2";
  }>;
  edge_cases: string[];
  security_concerns: string[];
  estimated_coverage: number;
  estimated_duration_seconds: number;
  recommend_run: boolean;
  rationale: string;
  blockers: string[];
}

export interface QaPlanResult {
  actionId: string;
  prId: string;
  testRunId: string;
  totalTests: number;
  recommendRun: boolean;
  isFinanceModule: boolean;
  tokensUsed: number;
}

export async function generateQaPlan(prId: string): Promise<QaPlanResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_QA_MODEL") ?? "claude-sonnet-4-6";

  const { data: pr, error: prErr } = await supabaseAdmin
    .from("asvc_code_pull_requests")
    .select(
      "id, spec_id, repo, branch_name, title, description, files_changed, lines_added, lines_removed",
    )
    .eq("id", prId)
    .single();
  if (prErr || !pr) throw new Error(`PR introuvable: ${prErr?.message ?? prId}`);

  // Charge la spec liée
  const { data: spec } = await supabaseAdmin
    .from("asvc_product_specs")
    .select("title, acceptance_criteria, technical_architecture, database_schema")
    .eq("id", pr.spec_id)
    .maybeSingle();

  // Récupère le plan dev (file_plan) depuis l'action liée
  const { data: action } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("proposed_payload")
    .eq("id", (
      await supabaseAdmin
        .from("asvc_code_pull_requests")
        .select("related_action_id")
        .eq("id", prId)
        .single()
    ).data?.related_action_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  const filePlan = (action?.proposed_payload as { file_plan?: Array<{ path: string }> } | null)?.file_plan ?? [];
  const isFinanceRepo = /atlas-finance|liasspilot|cashpilot|atlasbanx|cockpit-fa/i.test(pr.repo);

  const agentId = await fetchAgentIdByCode("qa");

  const userPrompt = `PR À TESTER
- Repo: ${pr.repo} (finance app: ${isFinanceRepo ? "OUI" : "non"})
- Branche: ${pr.branch_name}
- Titre: ${pr.title}
- Description: ${pr.description ?? "(n/a)"}
- Fichiers prévus: ${pr.files_changed}

SPEC ASSOCIÉE
- Titre: ${spec?.title ?? "(n/a)"}
- Acceptance criteria: ${JSON.stringify(spec?.acceptance_criteria ?? [], null, 2)}
- Architecture: ${(spec?.technical_architecture ?? "(n/a)").slice(0, 1000)}
- DB schema impacté: ${(spec?.database_schema ?? "(n/a)").slice(0, 500)}

PLAN DE FICHIERS DEV
${filePlan.map((f) => `- ${f.path}`).join("\n") || "(non fourni)"}

Génère le plan de tests JSON complet. Si module finance et SYSCOHADA non couvert, recommend_run=false.`;

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("qa", QA_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 4500,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<QaOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Garde-fou serveur: si finance ET pas de tests SYSCOHADA, force recommend_run=false
  const hasSyscohadaTests = out.test_cases.some((t) => t.test_type === "syscohada_validation");
  const finalRecommendRun =
    isFinanceRepo && !hasSyscohadaTests ? false : out.recommend_run;

  // Insère un test_run (status='running' — le CI réel le passera à passed/failed)
  const { data: testRun, error: trErr } = await supabaseAdmin
    .from("asvc_test_runs")
    .insert({
      pr_id: prId,
      agent_id: agentId,
      test_type: "unit",
      framework: "vitest+playwright",
      total_tests: out.test_cases.length,
      status: "running",
      syscohada_test_cases: hasSyscohadaTests
        ? out.test_cases.filter((t) => t.test_type === "syscohada_validation")
        : null,
    })
    .select("id")
    .single();
  if (trErr) throw new Error(`test_run: ${trErr.message}`);

  // Update PR status
  await supabaseAdmin
    .from("asvc_code_pull_requests")
    .update({ qa_status: "running", status: "qa_running" })
    .eq("id", prId);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_qa_plan",
      trigger_payload: { pr_id: prId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Criticality: si SYSCOHADA fail attendu, ou security concerns → critical
  let criticality: "low" | "normal" | "high" | "critical" = "normal";
  if (!finalRecommendRun) criticality = "critical";
  else if (out.security_concerns.length > 0) criticality = "high";

  const { data: action2, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "execute_qa_pipeline",
      criticality,
      title: finalRecommendRun
        ? `QA Plan — ${pr.title} (${out.test_cases.length} tests)`
        : `🚨 QA BLOQUÉ — ${pr.title} (${out.blockers[0] ?? "blockers"})`,
      description: out.rationale,
      proposed_payload: {
        pr_id: prId,
        test_run_id: testRun!.id,
        test_cases: out.test_cases,
        edge_cases: out.edge_cases,
        security_concerns: out.security_concerns,
        estimated_coverage: out.estimated_coverage,
        estimated_duration_seconds: out.estimated_duration_seconds,
        recommend_run: finalRecommendRun,
        blockers: out.blockers,
      },
      context: {
        repo: pr.repo,
        is_finance_module: isFinanceRepo,
        has_syscohada_tests: hasSyscohadaTests,
        server_overrode_recommendation: isFinanceRepo && !hasSyscohadaTests && out.recommend_run,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin
    .from("asvc_test_runs")
    .update({ related_action_id: action2!.id })
    .eq("id", testRun!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "qa",
    p_event_type: "qa_plan_generated",
    p_resource_type: "asvc_code_pull_requests",
    p_resource_id: prId,
    p_payload: {
      action_id: action2!.id,
      test_count: out.test_cases.length,
      recommend_run: finalRecommendRun,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action2!.id,
    prId,
    testRunId: testRun!.id,
    totalTests: out.test_cases.length,
    recommendRun: finalRecommendRun,
    isFinanceModule: isFinanceRepo,
    tokensUsed,
  };
}
