// ASVC — Trésorerie Agent: génération du brief trésorerie quotidien.
//
// Pipeline:
//   1. Récupère le snapshot finance via RPC asvc_finance_dashboard
//   2. Si trop d'overdue / runway court : action criticality=high
//   3. Demande à Claude un commentaire trésorerie 5-8 lignes
//   4. Insère action_proposed (action_type='treasury_brief')

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

interface FinanceDashboard {
  as_of: string;
  revenue: {
    invoiced_mtd_fcfa: number;
    paid_mtd_fcfa: number;
    paid_last_30d_fcfa: number;
    paid_last_90d_fcfa: number;
  };
  receivables: {
    outstanding_fcfa: number;
    overdue_fcfa: number;
    overdue_count: number;
    due_next_7d_fcfa: number;
    dso_avg_days: number;
  };
  pipeline_potential_fcfa: number;
  mrr_estimate_fcfa: number;
  recent_overdue: Array<{
    invoice_number: string;
    client_name: string;
    amount_ttc_fcfa: number;
    due_date: string;
    days_overdue: number;
  }>;
}

const TREASURY_SYSTEM = `Tu es Trésorerie Agent de Atlas Studio.
Tu produis un brief trésorerie court pour la CEO (Pame).

CONSIGNES
- Français professionnel, exécutif, factuel.
- 5 à 8 lignes maximum. Pas de blabla.
- Vocabulaire business: MRR, ARR, DSO, encours, pipeline.
- Tu rapportes UNIQUEMENT. Tu ne donnes PAS de recommandation détaillée.
- Météo finale: 🟢 / 🟡 / 🔴 avec 1 raison concise.

SEUILS D'ALERTE
- DSO > 60 jours → vigilance jaune
- Overdue > 30% des receivables → vigilance jaune
- Overdue > 50% des receivables OU > 5M FCFA → alerte rouge
- MRR en baisse vs 30j précédents → vigilance jaune

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "summary":   "Texte du brief 5-8 lignes",
  "weather":   "green|amber|red",
  "weather_reason": "1 phrase",
  "alerts":    ["alerte 1", "alerte 2"]
}`;

interface TreasuryOutput {
  summary: string;
  weather: "green" | "amber" | "red";
  weather_reason: string;
  alerts: string[];
}

function fcfa(n: number | null | undefined): string {
  if (n === null || n === undefined) return "n/a";
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

export interface TreasuryBriefResult {
  actionId: string;
  summary: string;
  weather: "green" | "amber" | "red";
  weatherReason: string;
  alerts: string[];
  dashboard: FinanceDashboard;
  tokensUsed: number;
}

export async function generateTreasuryBrief(): Promise<TreasuryBriefResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_TREASURY_MODEL") ?? "claude-sonnet-4-6";

  const agentId = await fetchAgentIdByCode("tresorerie");

  // 1. Snapshot
  const { data: dashRaw, error: dErr } = await supabaseAdmin.rpc("asvc_finance_dashboard");
  if (dErr) throw new Error(`asvc_finance_dashboard: ${dErr.message}`);
  const dash = dashRaw as FinanceDashboard;

  // 2. Détection alerte côté serveur (overrides LLM si trop optimiste)
  const overdueRatio =
    dash.receivables.outstanding_fcfa > 0
      ? dash.receivables.overdue_fcfa / dash.receivables.outstanding_fcfa
      : 0;
  const serverAlertLevel: "green" | "amber" | "red" =
    overdueRatio > 0.5 || dash.receivables.overdue_fcfa > 5_000_000
      ? "red"
      : overdueRatio > 0.3 || dash.receivables.dso_avg_days > 60
        ? "amber"
        : "green";

  // 3. Prompt
  const userPrompt = `SNAPSHOT TRÉSORERIE — ${dash.as_of}

REVENUE
- Facturé mois en cours: ${fcfa(dash.revenue.invoiced_mtd_fcfa)}
- Encaissé mois en cours: ${fcfa(dash.revenue.paid_mtd_fcfa)}
- Encaissé 30 derniers jours: ${fcfa(dash.revenue.paid_last_30d_fcfa)}
- Encaissé 90 derniers jours: ${fcfa(dash.revenue.paid_last_90d_fcfa)}

RECEIVABLES
- Encours total: ${fcfa(dash.receivables.outstanding_fcfa)}
- En retard: ${fcfa(dash.receivables.overdue_fcfa)} (${dash.receivables.overdue_count} factures)
- Échéances 7 prochains jours: ${fcfa(dash.receivables.due_next_7d_fcfa)}
- DSO moyen 90j: ${dash.receivables.dso_avg_days} jours

INDICATEURS
- MRR estimé: ${fcfa(dash.mrr_estimate_fcfa)}
- Pipeline (propositions + nego): ${fcfa(dash.pipeline_potential_fcfa)}

TOP RETARDS
${
  dash.recent_overdue.length
    ? dash.recent_overdue
        .slice(0, 5)
        .map((o) => `- ${o.client_name} ${o.invoice_number}: ${fcfa(o.amount_ttc_fcfa)} (${o.days_overdue}j de retard)`)
        .join("\n")
    : "(aucune facture en retard)"
}

PRÉ-DÉTECTION SERVEUR: météo ${serverAlertLevel}

Rédige le brief JSON maintenant.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("tresorerie", TREASURY_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 800,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<TreasuryOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Override: si serveur détecte red et LLM dit green, on force red
  const finalWeather =
    serverAlertLevel === "red"
      ? "red"
      : serverAlertLevel === "amber" && out.weather === "green"
        ? "amber"
        : out.weather;

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_treasury_brief",
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  const criticality =
    finalWeather === "red" ? "high" : finalWeather === "amber" ? "normal" : "low";

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "treasury_brief",
      criticality,
      title: `Brief trésorerie — ${finalWeather === "red" ? "🔴" : finalWeather === "amber" ? "🟡" : "🟢"} ${out.weather_reason}`,
      description: out.summary,
      proposed_payload: {
        summary: out.summary,
        weather: finalWeather,
        weather_reason: out.weather_reason,
        alerts: out.alerts,
        dashboard: dash,
      },
      context: {
        server_detected_weather: serverAlertLevel,
        llm_detected_weather: out.weather,
        overdue_ratio: overdueRatio,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "tresorerie",
    p_event_type: "treasury_brief_generated",
    p_resource_type: "asvc_agent_actions",
    p_resource_id: action!.id,
    p_payload: { weather: finalWeather, tokens_used: tokensUsed },
  });

  return {
    actionId: action!.id,
    summary: out.summary,
    weather: finalWeather,
    weatherReason: out.weather_reason,
    alerts: out.alerts ?? [],
    dashboard: dash,
    tokensUsed,
  };
}
