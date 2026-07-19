// PROPH3T Cortex Advisor — COUCHE 3 (advisory strict).
// Lit UNIQUEMENT des agrégats pré-calculés, produit des orientations
// qualitatives, écrit UNIQUEMENT dans cps_proph3t_insights via la RPC
// contrôlée (RG-08). Aucun calcul monétaire ici : les chiffres cités sont
// RECOPIÉS des inputs, et un post-contrôle rejette tout insight citant un
// nombre absent des inputs (flag hallucination_check_failed).
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { asvcChat } from "../_shared/asvc/llm.ts";

const SYSTEM = `Tu es PROPH3T Cortex Advisor, conseiller stratégique d'Atlas Studio.
Tu reçois UNIQUEMENT des agrégats déjà calculés. Règles absolues :
- Tu ne calcules JAMAIS un montant, un runway, un point mort. Tu RECOPIES les chiffres des données fournies.
- N'invente aucun nombre : tout nombre que tu cites doit apparaître tel quel dans les données.
- Français, direct. Structure imposée : Constat → Lecture → Orientation proposée → Ce que ça suppose.
- Jamais d'injonction ; toujours « matière à décision ». Max 150 mots par insight.
Réponds UNIQUEMENT par un tableau JSON :
[{"insight_type":"alerte_derive|opportunite|arbitrage_portefeuille|hypothese_suggeree|risque|synthese_periodique","severity":"info|attention|critique","title":"...","body":"..."}]`;

/** Nombres « significatifs » (≥ 3 chiffres) présents dans un texte, normalisés. */
function bigNumbers(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d\s., ]*/g)) {
    const n = m[0].replace(/[\s., ]/g, "");
    if (n.length >= 3) out.add(n);
  }
  return out;
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason ?? "Non autorisé", 401);

  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? "";
  const model = Deno.env.get("CORTEX_ADVISOR_MODEL") ?? "llama-3.3-70b-versatile";
  if (!apiKey) return errorResponse("Aucune clé LLM configurée (GROQ_API_KEY / ANTHROPIC_API_KEY)", 500);

  // ── Agrégats (aucune PII : les prospects sont pseudonymisés) ──────────────
  const [{ data: dash }, { data: apps }, { data: assumptions }, { data: deals }] = await Promise.all([
    supabaseAdmin.rpc("cps_dashboard"),
    supabaseAdmin.rpc("cps_arbitration"),
    supabaseAdmin.from("cps_assumptions").select("id,statement,criticality,status,domain").in("status", ["a_tester", "en_test"]),
    supabaseAdmin.from("cps_deals").select("id,stage,expected_mrr_fcfa,probability_bp,origin,last_activity_at").not("stage", "in", '("client","perdu")'),
  ]);

  const inputs = {
    dashboard: dash ?? {},
    portefeuille: (apps ?? []).map((a: any) => ({
      code: a.code, stade: a.lifecycle_stage, classe: a.strategic_class,
      deals_ouverts: a.open_deals, pipeline_pondere_fcfa: a.pipeline_weighted_fcfa,
      hypotheses_critiques: a.open_critical_assumptions,
    })),
    hypotheses: (assumptions ?? []).map((x: any) => ({ ref: x.id.slice(0, 8), domaine: x.domain, criticite: x.criticality, statut: x.status })),
    pipeline: (deals ?? []).map((d: any, i: number) => ({
      deal_ref: `DEAL-${String(i + 1).padStart(3, "0")}`, etape: d.stage,
      mrr_attendu_fcfa: d.expected_mrr_fcfa, probabilite_bp: d.probability_bp,
      origine: d.origin, derniere_activite: d.last_activity_at,
    })),
  };
  const inputsJson = JSON.stringify(inputs);
  const inputsHash = await sha256Hex(inputsJson);
  const allowed = bigNumbers(inputsJson);

  const res = await asvcChat({
    apiKey, model, temperature: 0.3, maxTokens: 1400,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `Données (agrégats) :\n${inputsJson}\n\nProduis 1 à 4 insights utiles. JSON uniquement.` },
    ],
  });

  const raw = res?.message?.content ?? "";
  let parsed: any[] = [];
  try {
    const m = raw.match(/\[[\s\S]*\]/);
    parsed = m ? JSON.parse(m[0]) : [];
  } catch { return errorResponse("Réponse LLM illisible", 502); }

  let inserted = 0;
  const rejected: string[] = [];
  for (const ins of parsed) {
    if (!ins?.title || !ins?.body) continue;
    // RG-08 : post-contrôle anti-hallucination des nombres cités
    const cited = bigNumbers(String(ins.body) + " " + String(ins.title));
    const bad = [...cited].filter((n) => !allowed.has(n));
    if (bad.length) { rejected.push(`${ins.title} (nombres inconnus: ${bad.join(", ")})`); continue; }

    const { error } = await supabaseAdmin.rpc("cps_proph3t_insight_insert", {
      p_type: ins.insight_type ?? "risque",
      p_severity: ins.severity ?? "info",
      p_title: String(ins.title).slice(0, 200),
      p_body: String(ins.body),
      p_scope: { source: "cortex-advisor-feed" },
      p_inputs_hash: inputsHash,
      p_model: model,
    });
    if (!error) inserted++;
  }

  return jsonResponse({ ok: true, inserted, rejected_count: rejected.length, rejected, inputs_hash: inputsHash });
});
