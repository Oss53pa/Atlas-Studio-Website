/**
 * PROPH3T Router — Moteur de routage IA central d'Atlas Studio
 * ------------------------------------------------------------
 * Toutes les applications appellent PROPH3T via une seule interface.
 * Le routage est gouverné d'abord par la SENSIBILITÉ des données, puis par
 * le TYPE de tâche, puis par le coût/disponibilité.
 *
 * Intégré au hub : les ProviderId correspondent aux adaptateurs réels
 * (./ollama, ./anthropic, ./gemini, ./groq), le ProviderCall par défaut les
 * branche (BYOK pour claude/gemini, clé globale pour groq, local pour ollama),
 * et logCall écrit dans la table proph3t_calls.
 *
 * Stack : TypeScript + Supabase Edge Functions (Deno).
 */

import { supabaseAdmin } from "../supabase.ts";
import { chat as ollamaChat, type OllamaMessage } from "./ollama.ts";
import { anthropicChat, getAnthropicKeyForUser } from "./anthropic.ts";
import { geminiChat, getGeminiKeyForUser } from "./gemini.ts";
import { groqChat, getGroqApiKey, getGroqModel } from "./groq.ts";

// ============================================================
// 1. TAXONOMIE — les trois axes de classification
// ============================================================

/** Niveau de sensibilité. C'est l'axe le plus important : il décide
 *  quels providers sont AUTORISÉS, indépendamment du coût. */
export enum Sensitivity {
  /** Données client confidentielles : relevés bancaires, liasses
   *  fiscales, due diligence, paie. JAMAIS de tier qui entraîne. */
  CONFIDENTIAL = "confidential",
  /** Données internes non publiques : reporting, contrats, RH. */
  INTERNAL = "internal",
  /** Données non sensibles : support, doc publique, brouillons. */
  PUBLIC = "public",
}

export enum TaskType {
  EXTRACTION = "extraction",     // OCR, parsing de documents
  CLASSIFICATION = "classification",
  GENERATION = "generation",     // rédaction, résumés
  REASONING = "reasoning",       // analyse complexe, multi-étapes
  VISION = "vision",             // analyse d'image / PDF scanné
}

export interface RequestConstraints {
  longContext?: boolean;   // > ~32k tokens
  realtime?: boolean;      // latence critique (UI interactive)
}

// ============================================================
// 2. PROVIDERS — déclaration des capacités et garanties
// ============================================================

export type ProviderId =
  | "ollama"
  | "claude"
  | "gemini"
  | "groq";

export interface ProviderProfile {
  id: ProviderId;
  /** true = le fournisseur s'engage à NE PAS entraîner sur les données.
   *  Ollama est local donc trivialement true ; Claude est sur un tier payant
   *  à non-rétention. Gemini/Groq sont traités comme non garantis → exclus
   *  du confidentiel. */
  noDataRetention: boolean;
  supportsVision: boolean;
  supportsLongContext: boolean;
  /** Coût relatif indicatif. 0 = local/gratuit. Sert à départager. */
  relativeCost: number;
  /** Latence typique. "low" privilégié pour le temps réel. */
  latency: "low" | "medium" | "high";
}

export const PROVIDERS: Record<ProviderId, ProviderProfile> = {
  ollama: {
    id: "ollama",
    noDataRetention: true,      // local : rien ne sort
    supportsVision: false,      // selon modèle installé ; à ajuster
    supportsLongContext: false,
    relativeCost: 0,
    latency: "medium",
  },
  claude: {
    id: "claude",
    noDataRetention: true,      // tier payant avec engagement
    supportsVision: true,
    supportsLongContext: true,
    relativeCost: 3,
    latency: "medium",
  },
  gemini: {
    id: "gemini",
    noDataRetention: false,     // ⚠️ non garanti → hors confidentiel
    supportsVision: true,
    supportsLongContext: true,
    relativeCost: 0,
    latency: "medium",
  },
  groq: {
    id: "groq",
    noDataRetention: false,     // ⚠️ non garanti → hors confidentiel
    supportsVision: false,
    supportsLongContext: false,
    relativeCost: 0,
    latency: "low",             // son atout principal
  },
};

// ============================================================
// 3. POLITIQUE — quels providers sont autorisés par sensibilité
// ============================================================

/**
 * Règle de gouvernance, déclarative et auditable.
 * Le confidentiel est verrouillé sur les fournisseurs sans rétention.
 */
export function allowedProviders(sensitivity: Sensitivity): ProviderId[] {
  switch (sensitivity) {
    case Sensitivity.CONFIDENTIAL:
      // Uniquement local + payant à non-rétention garantie.
      return ["ollama", "claude"];
    case Sensitivity.INTERNAL:
      // On tolère les gratuits, mais local et payant restent prioritaires.
      return ["ollama", "claude", "gemini", "groq"];
    case Sensitivity.PUBLIC:
      // Tout est permis ; on optimisera sur le coût et la latence.
      return ["ollama", "groq", "gemini", "claude"];
  }
}

// ============================================================
// 4. CONSTRUCTION DE LA CHAÎNE DE FALLBACK
// ============================================================

export interface RouteDecision {
  chain: ProviderId[];          // ordre d'essai
  rationale: string;            // pour le logging / l'audit
}

export function buildRoute(
  task: TaskType,
  sensitivity: Sensitivity,
  constraints: RequestConstraints = {},
): RouteDecision {
  // a) On part des providers autorisés par la sensibilité.
  let candidates = allowedProviders(sensitivity).map((id) => PROVIDERS[id]);

  // b) On filtre sur les contraintes techniques dures.
  if (task === TaskType.VISION) {
    candidates = candidates.filter((p) => p.supportsVision);
  }
  if (constraints.longContext) {
    candidates = candidates.filter((p) => p.supportsLongContext);
  }

  // c) On ordonne selon le besoin dominant.
  candidates.sort((a, b) => {
    // Temps réel → la latence prime.
    if (constraints.realtime) {
      const score = { low: 0, medium: 1, high: 2 };
      if (score[a.latency] !== score[b.latency]) {
        return score[a.latency] - score[b.latency];
      }
    }
    // Raisonnement complexe → on privilégie la qualité (coût plus élevé
    // = modèle plus capable, ici Claude passe devant les gratuits).
    if (task === TaskType.REASONING) {
      return b.relativeCost - a.relativeCost;
    }
    // Par défaut : le moins cher d'abord (local gratuit en tête).
    return a.relativeCost - b.relativeCost;
  });

  if (candidates.length === 0) {
    throw new Error(
      `Aucun provider ne satisfait : tâche=${task}, ` +
        `sensibilité=${sensitivity}, contraintes=${JSON.stringify(constraints)}`,
    );
  }

  return {
    chain: candidates.map((p) => p.id),
    rationale:
      `sensibilité=${sensitivity} → autorisés=[${allowedProviders(sensitivity).join(", ")}] ; ` +
      `après filtres techniques et tri → [${candidates.map((p) => p.id).join(", ")}]`,
  };
}

// ============================================================
// 5. EXÉCUTION AVEC FALLBACK + CIRCUIT BREAKER
// ============================================================

export interface ProphetRequest {
  task: TaskType;
  sensitivity: Sensitivity;
  prompt: string;
  constraints?: RequestConstraints;
  tenantId: string;            // multi-tenant : pour le logging et les quotas
  userId?: string;             // requis pour les providers BYOK (claude, gemini)
}

export interface ProphetResponse {
  text: string;
  providerUsed: ProviderId;
  attempts: { provider: ProviderId; ok: boolean; error?: string }[];
}

/** Interface que chaque adaptateur de provider doit implémenter. */
export type ProviderCall = (
  provider: ProviderId,
  prompt: string,
) => Promise<string>;

/** Mémoire courte des providers en panne, pour éviter de retaper
 *  un fournisseur qui vient d'échouer (circuit breaker simple). */
const cooldown = new Map<ProviderId, number>();
const COOLDOWN_MS = 60_000;

function isCircuitOpen(p: ProviderId): boolean {
  const until = cooldown.get(p);
  return until !== undefined && Date.now() < until;
}

export async function runProphet(
  req: ProphetRequest,
  call: ProviderCall = createProviderCall(req.userId),
): Promise<ProphetResponse> {
  const { chain, rationale } = buildRoute(
    req.task,
    req.sensitivity,
    req.constraints,
  );

  const attempts: ProphetResponse["attempts"] = [];

  for (const provider of chain) {
    if (isCircuitOpen(provider)) {
      attempts.push({ provider, ok: false, error: "circuit_open" });
      continue;
    }
    try {
      const text = await call(provider, req.prompt);
      attempts.push({ provider, ok: true });
      logCall(req, provider, true, rationale);
      return { text, providerUsed: provider, attempts };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      attempts.push({ provider, ok: false, error: msg });
      cooldown.set(provider, Date.now() + COOLDOWN_MS);
      logCall(req, provider, false, msg);
      // on continue vers le provider suivant de la chaîne
    }
  }

  throw new Error(
    `PROPH3T : tous les providers ont échoué pour le tenant ${req.tenantId}. ` +
      `Tentatives : ${JSON.stringify(attempts)}`,
  );
}

// ============================================================
// 6. ADAPTATEUR PAR DÉFAUT — branche les providers réels
// ============================================================

/**
 * Fabrique un ProviderCall qui appelle les adaptateurs réels du hub.
 * - ollama : local, aucune clé.
 * - claude / gemini : BYOK — clé déchiffrée par utilisateur (userId requis).
 * - groq : clé globale serveur (GROQ_API_KEY).
 */
export function createProviderCall(
  userId?: string,
  // deno-lint-ignore no-explicit-any
  supabase: any = supabaseAdmin,
): ProviderCall {
  return async (provider, prompt) => {
    const messages: OllamaMessage[] = [{ role: "user", content: prompt }];

    switch (provider) {
      case "ollama": {
        const r = await ollamaChat({ messages });
        return r.message.content ?? "";
      }
      case "claude": {
        if (!userId) throw new Error("claude : userId requis (clé BYOK)");
        const key = await getAnthropicKeyForUser(supabase, userId);
        if (!key) throw new Error("claude : aucune clé Anthropic configurée pour l'utilisateur");
        const r = await anthropicChat({ apiKey: key.apiKey, model: key.model, messages });
        return r.message.content ?? "";
      }
      case "gemini": {
        if (!userId) throw new Error("gemini : userId requis (clé BYOK)");
        const key = await getGeminiKeyForUser(supabase, userId);
        if (!key) throw new Error("gemini : aucune clé Gemini configurée pour l'utilisateur");
        const r = await geminiChat({ apiKey: key.apiKey, model: key.model, messages });
        return r.message.content ?? "";
      }
      case "groq": {
        const apiKey = getGroqApiKey();
        if (!apiKey) throw new Error("groq : GROQ_API_KEY absent");
        const r = await groqChat({ apiKey, model: getGroqModel(), messages });
        return r.message.content ?? "";
      }
    }
  };
}

// ============================================================
// 7. OBSERVABILITÉ — table Supabase proph3t_calls
// ============================================================

/**
 * Trace l'appel dans proph3t_calls. Fire-and-forget : ne bloque jamais la
 * réponse et n'échoue jamais (le monitoring ne doit pas casser le routage).
 */
function logCall(
  req: ProphetRequest,
  provider: ProviderId,
  ok: boolean,
  detail: string,
): void {
  void supabaseAdmin
    .from("proph3t_calls")
    .insert({
      tenant_id: req.tenantId ?? null,
      user_id: req.userId ?? null,
      task: req.task,
      sensitivity: req.sensitivity,
      provider,
      ok,
      detail: detail.slice(0, 2000),
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.debug(`[PROPH3T] log proph3t_calls: ${error.message}`);
    });
}

// ============================================================
// 8. EXEMPLE D'USAGE depuis une edge function
// ============================================================
//
// import { runProphet, TaskType, Sensitivity } from "../_shared/proph3t/provider_router.ts";
//
// // AtlasBanx — audit d'un relevé bancaire scanné (CONFIDENTIEL + VISION)
// // → la chaîne ne contiendra QUE claude (seul autorisé + vision).
// const res = await runProphet({
//   task: TaskType.VISION,
//   sensitivity: Sensitivity.CONFIDENTIAL,
//   prompt: "...",
//   tenantId: "cosmos-yopougon",
//   userId: user.id,                  // requis pour la clé BYOK Claude
// });
//
// // Support client public, réponse rapide (PUBLIC + REALTIME)
// // → groq en tête (latence faible), fallback gemini puis ollama.
// const res2 = await runProphet({
//   task: TaskType.GENERATION,
//   sensitivity: Sensitivity.PUBLIC,
//   prompt: "...",
//   constraints: { realtime: true },
//   tenantId: "cosmos-yopougon",
// });
