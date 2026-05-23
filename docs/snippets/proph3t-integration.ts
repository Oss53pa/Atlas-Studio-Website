/**
 * proph3t.ts — Intégration Atlas Studio « Proph3t core » pour une app satellite.
 * ----------------------------------------------------------------------------
 * COPIER ce fichier dans `src/lib/proph3t.ts` de votre app (Atlas F&A,
 * Cockpit F&A, Liass'Pilot, Advist, TableSmart, AtlasBanx, …) puis :
 *
 *   1) npm i @atlas-studio/proph3t-client
 *   2) Définir 2 variables d'env qui pointent sur le CORE Atlas Studio
 *      (PAS le Supabase de votre app) :
 *        VITE_ATLAS_SUPABASE_URL=https://vgtmljfayiysuvrcmunt.supabase.co
 *        VITE_ATLAS_SUPABASE_ANON_KEY=<anon key du core>
 *   3) Remplacer PRODUCT ci-dessous par l'id de votre app au catalogue
 *      Atlas Studio (ex: "atlas-compta", "taxpilot", "cockpit-fa",
 *      "atlasbanx", "advist", "tablesmart"). Le core normalise les alias
 *      (atlas-compta→atlas-fa, taxpilot→liasspilot) automatiquement.
 *
 * DEUX MODES, complémentaires :
 *   A) Fédération (SDK)  → votre agent local garde le LLM ; le core fournit
 *      mémoire inter-apps, RAG SYSCOHADA, 197 outils, audit SHA-256.
 *   B) Hébergé (ask)     → vous déléguez tout le tour au core (orchestrateur
 *      ReAct), avec gouvernance par sensibilité des données.
 *
 * Aucun message utilisateur n'est jamais envoyé au core en mode A — seulement
 * les requêtes d'enrichissement (recall/search/tool/audit).
 */

import { Proph3tClient } from "@atlas-studio/proph3t-client";
// ⚠️ supabase = le client Supabase de VOTRE app (pour récupérer le JWT user).
import { supabase } from "./supabase";

/** Id de votre app au catalogue Atlas Studio. À adapter par app. */
const PRODUCT = "atlas-compta";

const ATLAS_CORE_URL = import.meta.env.VITE_ATLAS_SUPABASE_URL as string;
const ATLAS_CORE_ANON = import.meta.env.VITE_ATLAS_SUPABASE_ANON_KEY as string;

// ============================================================
// MODE A — Fédération : enrichissement via le SDK
// ============================================================

/**
 * Construit un client Proph3t fédéré, scoppé sur l'utilisateur courant.
 * @param societyId  société/tenant courant (multi-tenant), optionnel.
 */
export async function getProph3t(societyId?: string): Promise<Proph3tClient> {
  const { data: { session } } = await supabase.auth.getSession();
  return new Proph3tClient({
    product: PRODUCT,
    supabaseUrl: ATLAS_CORE_URL,
    apiKey: ATLAS_CORE_ANON,
    userToken: session?.access_token, // RLS appliquée ; sans token → endpoints publics seulement
    societyId,
  });
}

/* — Exemples d'usage (mode A) ————————————————————————————————

  const proph3t = await getProph3t(societyId);

  // 1. Mémoire inter-apps : ce que l'utilisateur a fait dans d'autres apps Atlas
  const past = await proph3t.recall({ query: userMessage, limit: 5 });

  // 2. Ancrer le prompt local dans le savoir partagé (SYSCOHADA/OHADA/CGI)
  const refs = await proph3t.searchKnowledge({
    query: userMessage, sourceType: "syscohada", topK: 5,
  });
  // → injectez `refs` dans le system prompt de VOTRE LLM local.

  // 3. Déléguer un calcul lourd à un outil central (au lieu de le réimplémenter)
  const r = await proph3t.runTool({
    name: "compute_irpp_uemoa",
    args: { salaire_brut: 500_000, pays: "CI" },
  });

  // 4. Tracer dans l'audit chaîné (conformité OHADA, archivage 10 ans)
  await proph3t.logAudit({
    action: "generate_liasse_fiscale",
    subjectType: "society", subjectId: societyId,
    content: { exercice: 2025, total_actif: 12_500_000 },
  });

———————————————————————————————————————————————————————————————— */

// ============================================================
// MODE B — Hébergé : déléguer tout le tour à proph3t-ask
// ============================================================

export type Sensitivity = "confidential" | "internal" | "public";

export interface AskResult {
  conversation_id: string;
  answer: string;
  citations: unknown[];
  confidence: number;
  disclaimer?: string;
}

/**
 * Pose une question à l'orchestrateur Proph3t hébergé.
 *
 * `sensitivity` gouverne les providers autorisés :
 *   - "confidential" → Ollama + Claude uniquement (aucune rétention).
 *     À utiliser pour relevés bancaires, liasses fiscales, paie, due diligence.
 *   - "internal" (défaut) / "public" → tous providers selon dispo.
 */
export async function askProph3t(params: {
  message: string;
  sensitivity?: Sensitivity;
  conversationId?: string;
  societyId?: string;
}): Promise<AskResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${ATLAS_CORE_URL}/functions/v1/proph3t-ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ATLAS_CORE_ANON,
      Authorization: `Bearer ${session?.access_token ?? ATLAS_CORE_ANON}`,
    },
    body: JSON.stringify({
      message: params.message,
      product: PRODUCT,
      sensitivity: params.sensitivity ?? "internal",
      conversation_id: params.conversationId,
      society_id: params.societyId,
    }),
  });
  if (!res.ok) throw new Error(`proph3t-ask ${res.status}: ${await res.text()}`);
  return res.json();
}

/* — Exemple (mode B), donnée CONFIDENTIELLE ————————————————————

  // AtlasBanx — analyse d'un relevé : reste sur Ollama/Claude, jamais un tier gratuit.
  const r = await askProph3t({
    message: "Analyse les agios de ce relevé et signale les anomalies.",
    sensitivity: "confidential",
    societyId,
  });
  console.log(r.answer, r.confidence);

———————————————————————————————————————————————————————————————— */
