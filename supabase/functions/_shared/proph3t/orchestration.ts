// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Orchestration & Reasoning (CDC §3.2 reasoning L1)
// 4 tools : plan_task, chain_of_thought, verify_hypothesis, route_to_model
// ═══════════════════════════════════════════════════════════════════════════
// Note : ces tools sont essentiellement des helpers structures qui aident
// l'orchestrateur ReAct a structurer son raisonnement. Ils retournent des
// JSON normes que le LLM peut consommer dans la suite de la boucle.

export interface PlanStep {
  step: number;
  description: string;
  tool?: string;
  inputs?: Record<string, unknown>;
  expected_output?: string;
}

/**
 * Decompose une tache complexe en etapes ordonnees.
 * Le LLM appelle ce tool en debut de chaine pour planifier ses appels.
 */
export function planTask(args: {
  task: string;
  steps: PlanStep[];
  estimated_iterations?: number;
}): { ok: boolean; plan: PlanStep[]; task: string; estimated_iterations: number; error?: string } {
  if (!args.task || !Array.isArray(args.steps) || args.steps.length === 0) {
    return { ok: false, plan: [], task: "", estimated_iterations: 0, error: "task et steps[] requis" };
  }
  // Re-numerote les steps pour s'assurer de la coherence
  const plan = args.steps.map((s, i) => ({ ...s, step: i + 1 }));
  return {
    ok: true,
    task: args.task,
    plan,
    estimated_iterations: args.estimated_iterations ?? plan.length,
  };
}

/**
 * Encapsule une chaine de raisonnement step-by-step.
 * Utile pour les questions ouvertes ou les problemes inferentiels.
 */
export function chainOfThought(args: {
  question: string;
  reasoning_steps: string[];
  conclusion: string;
  confidence: number;       // 0-100
  caveats?: string[];
}): { ok: boolean; reasoning: { question: string; steps: string[]; conclusion: string; confidence: number; caveats: string[] }; error?: string } {
  if (!args.question || !Array.isArray(args.reasoning_steps) || !args.conclusion) {
    return { ok: false, reasoning: { question: "", steps: [], conclusion: "", confidence: 0, caveats: [] }, error: "question, reasoning_steps[], conclusion requis" };
  }
  const confidence = Math.max(0, Math.min(100, args.confidence ?? 50));
  return {
    ok: true,
    reasoning: {
      question: args.question,
      steps: args.reasoning_steps,
      conclusion: args.conclusion,
      confidence,
      caveats: args.caveats ?? [],
    },
  };
}

/**
 * Verifie une hypothese en confrontant evidence pour/contre.
 * Retourne un score de plausibilite et un verdict.
 */
export function verifyHypothesis(args: {
  hypothesis: string;
  evidence_for: string[];
  evidence_against: string[];
  sources?: string[];
}): {
  ok: boolean;
  hypothesis: string;
  verdict: "confirmed" | "rejected" | "uncertain";
  plausibility: number;     // 0-100
  evidence_balance: { for_count: number; against_count: number };
  sources: string[];
  error?: string;
} {
  if (!args.hypothesis) {
    return {
      ok: false,
      hypothesis: "",
      verdict: "uncertain",
      plausibility: 0,
      evidence_balance: { for_count: 0, against_count: 0 },
      sources: [],
      error: "hypothesis requise",
    };
  }
  const forCount = (args.evidence_for ?? []).length;
  const againstCount = (args.evidence_against ?? []).length;
  const total = forCount + againstCount;
  const plausibility = total === 0 ? 50 : Math.round((forCount / total) * 100);
  const verdict: "confirmed" | "rejected" | "uncertain" =
    plausibility >= 70 ? "confirmed" : plausibility <= 30 ? "rejected" : "uncertain";
  return {
    ok: true,
    hypothesis: args.hypothesis,
    verdict,
    plausibility,
    evidence_balance: { for_count: forCount, against_count: againstCount },
    sources: args.sources ?? [],
  };
}

/**
 * Recommande un modele LLM optimal selon la nature de la tache (CDC §5.3 routing).
 * - tache simple/courte           -> haiku/groq
 * - tache analytique financiere   -> sonnet/gemini-pro
 * - tache vision (OCR, parsing)   -> gemini-flash
 * - tache cout-sensitive          -> groq llama
 */
export function routeToModel(args: {
  task_type: "simple_qa" | "analytical" | "vision" | "cost_sensitive" | "long_context" | "code_gen";
  context_size_estimate?: number;   // tokens
  user_has_byok?: { anthropic?: boolean; gemini?: boolean };
}): { ok: boolean; recommended: { provider: string; model: string; reason: string }; alternatives: { provider: string; model: string }[] } {
  const has = args.user_has_byok ?? {};
  let recommended: { provider: string; model: string; reason: string };
  const alternatives: { provider: string; model: string }[] = [];

  switch (args.task_type) {
    case "simple_qa":
      recommended = has.anthropic
        ? { provider: "anthropic", model: "claude-haiku-4-5-20251001", reason: "Q/R rapide, haiku tres performant en latence" }
        : { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Q/R rapide, gratuit via Groq" };
      alternatives.push({ provider: "gemini", model: "gemini-2.0-flash" });
      break;
    case "analytical":
      recommended = has.anthropic
        ? { provider: "anthropic", model: "claude-sonnet-4-6", reason: "Analyse financiere/juridique necessite raisonnement profond" }
        : has.gemini
          ? { provider: "gemini", model: "gemini-2.5-pro", reason: "Analyse complexe, contexte long" }
          : { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Fallback sans BYOK" };
      break;
    case "vision":
      recommended = has.gemini
        ? { provider: "gemini", model: "gemini-2.5-flash", reason: "Vision native, OCR + parsing structure" }
        : { provider: "anthropic", model: "claude-sonnet-4-6", reason: "Vision via Claude (alternative)" };
      break;
    case "cost_sensitive":
      recommended = { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Gratuit, latence faible" };
      alternatives.push({ provider: "anthropic", model: "claude-haiku-4-5-20251001" });
      break;
    case "long_context":
      recommended = has.gemini
        ? { provider: "gemini", model: "gemini-2.5-pro", reason: "Contexte 2M tokens" }
        : { provider: "anthropic", model: "claude-sonnet-4-6", reason: "Contexte 200k tokens" };
      break;
    case "code_gen":
      recommended = has.anthropic
        ? { provider: "anthropic", model: "claude-sonnet-4-6", reason: "Meilleur LLM code-gen disponible" }
        : { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Fallback code-gen" };
      break;
    default:
      recommended = { provider: "groq", model: "llama-3.3-70b-versatile", reason: "Defaut prudent" };
  }

  return { ok: true, recommended, alternatives };
}
