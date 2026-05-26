// ASVC v2.0 — Veille Agent: détecte une opportunité à partir d'un signal.
//
// MVP: prend un signal en input (texte libre + source) et le qualifie:
//   - Catégorie (new_app / new_feature / pivot / integration)
//   - Scoring market/effort/fit/urgency
//   - RICE score
//   - Suggère un titre clair + description structurée
// Insère asvc_opportunities + asvc_agent_actions(proposed) pour validation CEO.

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

const VEILLE_SYSTEM = `Tu es Veille Agent de Atlas Studio. Tu détectes des opportunités produit/marché.

CONTEXTE Atlas Studio
- SaaS B2B francophone Afrique Ouest/Centrale (UEMOA + CEMAC, zone OHADA).
- 16 apps existantes: atlas-finance, liasspilot, cashpilot, wisehr, wisefm,
  atlasbanx, advist, docjourney, duedeck, atlastrade, tablesmart, atlas-lease,
  cockpit-journey, cockpit-fa, atlas-mall-suite, atlas-paie.
- Tu n'inventes PAS de marché. Si le signal est trop faible, tu le dis.

SOURCES POSSIBLES de signal
- competitor_watch : mouvement concurrent (Sage, Odoo, Zoho, Dolibarr...)
- customer_feedback: demande clients récurrente
- regulation_change: évolution OHADA / SYSCOHADA / fiscalité / CNPS
- market_trend   : tendance marché / sectoriel
- internal_idea  : idée Pame / équipe

SCORING (entiers 1-10 sauf indication)
- strategic_fit_score (1-10): alignement avec mission Atlas Studio
- urgency_score (1-10)     : urgence temporelle (legal deadline, FOMO, ...)
- market_size_estimate: 'small' / 'medium' / 'large'
- effort_estimate    : 'XS' (jours) / 'S' (semaines) / 'M' (1-2 mois) / 'L' (3-4 mois) / 'XL' (6+ mois)
- rice_score = (Reach × Impact × Confidence) / Effort. Tu l'estimes 0-100.

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "title":                "Titre opportunité (max 100 chars)",
  "description":          "2-4 phrases : quel problème, pour qui, comment Atlas Studio peut adresser",
  "category":             "new_app|new_feature|pivot|integration",
  "market_size_estimate": "small|medium|large",
  "effort_estimate":      "XS|S|M|L|XL",
  "strategic_fit_score":  <int 1-10>,
  "urgency_score":        <int 1-10>,
  "rice_score":           <number 0-100>,
  "key_signals":          ["signal 1", "signal 2"],
  "rationale":            "1-2 phrases pourquoi ça vaut une qualification approfondie"
}`;

interface VeilleOutput {
  title: string;
  description: string;
  category: "new_app" | "new_feature" | "pivot" | "integration";
  market_size_estimate: "small" | "medium" | "large";
  effort_estimate: "XS" | "S" | "M" | "L" | "XL";
  strategic_fit_score: number;
  urgency_score: number;
  rice_score: number;
  key_signals: string[];
  rationale: string;
}

export interface DetectOpportunityParams {
  source:
    | "competitor_watch"
    | "customer_feedback"
    | "regulation_change"
    | "market_trend"
    | "internal_idea";
  signalText: string;
  sourceDetails?: Record<string, unknown>;
}

export interface DetectOpportunityResult {
  actionId: string;
  opportunityId: string;
  title: string;
  riceScore: number;
  category: string;
  tokensUsed: number;
}

export async function detectOpportunity(
  params: DetectOpportunityParams,
): Promise<DetectOpportunityResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_VEILLE_MODEL") ?? "claude-sonnet-4-6";

  const agentId = await fetchAgentIdByCode("veille");

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("veille", VEILLE_SYSTEM) },
      {
        role: "user",
        content: `SOURCE: ${params.source}\n\nSIGNAL:\n${params.signalText}\n\nQualifie l'opportunité.`,
      },
    ],
    temperature: 0.3,
    maxTokens: 1200,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<VeilleOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Crée l'opportunité (statut 'detected')
  const { data: opp, error: oErr } = await supabaseAdmin
    .from("asvc_opportunities")
    .insert({
      detected_by_agent_id: agentId,
      source: params.source,
      source_details: params.sourceDetails ?? {},
      title: out.title.slice(0, 200),
      description: out.description,
      category: out.category,
      market_size_estimate: out.market_size_estimate,
      effort_estimate: out.effort_estimate,
      strategic_fit_score: Math.max(1, Math.min(10, Math.round(out.strategic_fit_score))),
      urgency_score: Math.max(1, Math.min(10, Math.round(out.urgency_score))),
      rice_score: Math.max(0, Math.min(100, out.rice_score)),
      status: "detected",
    })
    .select("id")
    .single();
  if (oErr) throw new Error(`opportunity: ${oErr.message}`);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_signal_input",
      trigger_payload: { source: params.source },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Action: qualifier l'opportunité (Pame décide si on creuse en research)
  const criticality: "low" | "normal" | "high" | "critical" =
    out.rice_score >= 60 ? "high" : out.rice_score >= 30 ? "normal" : "low";

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "qualify_opportunity",
      criticality,
      title: `Opportunité détectée — ${out.title}`,
      description: out.rationale,
      proposed_payload: {
        opportunity_id: opp!.id,
        title: out.title,
        description: out.description,
        category: out.category,
        rice_score: out.rice_score,
        key_signals: out.key_signals,
        source: params.source,
      },
      context: {
        market_size_estimate: out.market_size_estimate,
        effort_estimate: out.effort_estimate,
        strategic_fit_score: out.strategic_fit_score,
        urgency_score: out.urgency_score,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // Lie action à opportunité
  await supabaseAdmin
    .from("asvc_opportunities")
    .update({ related_action_id: action!.id })
    .eq("id", opp!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "veille",
    p_event_type: "opportunity_detected",
    p_resource_type: "asvc_opportunities",
    p_resource_id: opp!.id,
    p_payload: {
      action_id: action!.id,
      rice_score: out.rice_score,
      category: out.category,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    opportunityId: opp!.id,
    title: out.title,
    riceScore: out.rice_score,
    category: out.category,
    tokensUsed,
  };
}
