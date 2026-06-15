// ASVC — Helpers de génération de briefs COO.
// Construit le prompt à partir des stats DB, appelle Claude, persiste le brief.
//
// Architecture: stateless. L'edge function asvc-coo-brief importe ces helpers.

import { supabaseAdmin } from "../supabase.ts";
import { asvcChat } from "./llm.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";

export type BriefType = "morning" | "evening" | "weekly";

interface BriefStats {
  window: { start: string; end: string };
  arbitrations: { pending: number; urgent: number; high: number };
  actions_window: { proposed: number; approved: number; rejected: number; executed: number };
  tickets: {
    open: number;
    in_progress: number;
    resolved_window: number;
    urgent_open: number;
    avg_resolution_minutes_window: number;
  };
  leads: {
    total_active: number;
    new_window: number;
    qualified_window: number;
    won_window: number;
    pipeline_fcfa: number;
  };
  invoices: {
    issued_window: number;
    paid_window_fcfa: number;
    overdue_count: number;
    overdue_fcfa: number;
  };
  content: { published_window: number; pending_approval: number; engagements_window: number };
  agents: { total: number; active: number; kill_switches_active: number };
}

/** Calcule la fenêtre temporelle d'un brief (UTC). */
export function briefWindow(type: BriefType, now = new Date()): { start: Date; end: Date; date: string } {
  const end = new Date(now);
  const start = new Date(now);
  if (type === "morning") {
    // Brief matinal: couvre la veille (hier 00h -> aujourd'hui 00h).
    start.setUTCDate(start.getUTCDate() - 1);
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(0, 0, 0, 0);
  } else if (type === "evening") {
    // Brief soir: couvre la journée en cours (aujourd'hui 00h -> maintenant).
    start.setUTCHours(0, 0, 0, 0);
  } else {
    // Hebdo: 7 derniers jours
    start.setUTCDate(start.getUTCDate() - 7);
  }
  const dateOnly = end.toISOString().slice(0, 10);
  return { start, end, date: dateOnly };
}

/** Récupère les stats via la RPC SQL. */
export async function fetchBriefStats(start: Date, end: Date): Promise<BriefStats> {
  const { data, error } = await supabaseAdmin.rpc("asvc_brief_stats", {
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  if (error) throw new Error(`asvc_brief_stats: ${error.message}`);
  return data as BriefStats;
}

/** Formate un montant FCFA pour le prompt. */
function fcfa(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

/** Construit le prompt système + message user pour Claude. */
function buildPrompt(type: BriefType, stats: BriefStats): { system: string; user: string } {
  const system = `Tu es le COO Agent de Atlas Studio Virtual Company (ASVC).
Tu rédiges UN brief court à destination de Pame (CEO).

Règles strictes:
- Français professionnel, ton exécutif, direct, factuel.
- 5 à 8 lignes MAXIMUM. Pas de blabla.
- Pas d'emoji sauf 🌅 (matin), 🌇 (soir), 📅 (hebdo) en tête.
- Pas de jargon IA ("tokens", "embeddings", "LLM"...).
- Vocabulaire business: ARR, MRR, NPS, runway, pipeline, DSO.
- Tu ne donnes PAS de recommandations dans le brief. Tu rapportes uniquement.
- Format strict: 1 ligne d'intro (date), 3-5 puces (chiffres clés), 1 ligne météo.
- Météo finale: "🟢 Tout va bien" / "🟡 Vigilance: <raison>" / "🔴 Alerte: <raison>".`;

  const windowLabel = type === "morning" ? "la veille" : type === "evening" ? "aujourd'hui" : "les 7 derniers jours";
  const headerEmoji = type === "morning" ? "🌅" : type === "evening" ? "🌇" : "📅";
  const briefDate = new Date(stats.window.end).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const user = `Génère le brief ${type === "morning" ? "matinal" : type === "evening" ? "du soir" : "hebdomadaire"} pour ${briefDate}.
Couvre ${windowLabel}.
Commence par "${headerEmoji} Brief ${type === "morning" ? "matinal" : type === "evening" ? "du soir" : "hebdo"} — ${briefDate}".

Chiffres bruts à synthétiser:

ARBITRAGES EN ATTENTE
- En attente: ${stats.arbitrations.pending} (dont ${stats.arbitrations.urgent} 🔴 urgents, ${stats.arbitrations.high} 🟡 importants)

ACTIONS AGENTS (${windowLabel})
- Proposées: ${stats.actions_window.proposed}
- Approuvées: ${stats.actions_window.approved}
- Rejetées: ${stats.actions_window.rejected}
- Exécutées: ${stats.actions_window.executed}

SAV
- Tickets ouverts: ${stats.tickets.open} (en cours: ${stats.tickets.in_progress}, urgents: ${stats.tickets.urgent_open})
- Résolus sur la période: ${stats.tickets.resolved_window} (temps moyen ${stats.tickets.avg_resolution_minutes_window} min)

VENTES
- Leads actifs: ${stats.leads.total_active} (nouveaux: ${stats.leads.new_window}, qualifiés: ${stats.leads.qualified_window})
- Gagnés sur la période: ${stats.leads.won_window}
- Pipeline (proposal+nego): ${fcfa(stats.leads.pipeline_fcfa)}

FINANCE
- Factures émises (période): ${stats.invoices.issued_window}
- Encaissé période: ${fcfa(stats.invoices.paid_window_fcfa)}
- En retard: ${stats.invoices.overdue_count} (${fcfa(stats.invoices.overdue_fcfa)})

MARKETING
- Posts publiés (période): ${stats.content.published_window} (engagements: ${stats.content.engagements_window})
- En attente validation: ${stats.content.pending_approval}

SYSTÈME
- Agents actifs: ${stats.agents.active}/${stats.agents.total}
- Kill switches actifs: ${stats.agents.kill_switches_active}

Rédige maintenant le brief.`;

  return { system, user };
}

export interface GenerateBriefResult {
  briefId: string;
  briefType: BriefType;
  briefDate: string;
  summary: string;
  kpis: BriefStats;
  tokensUsed: number;
  model: string;
}

/**
 * Génère un brief complet:
 * 1. Calcule la fenêtre
 * 2. Agrège les KPIs via RPC
 * 3. Appelle Claude
 * 4. Insère dans asvc_coo_briefs
 * 5. Log audit
 */
export async function generateBrief(type: BriefType): Promise<GenerateBriefResult> {
  const apiKey = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY manquante — configurer la variable d'env de l'edge function",
    );
  }

  const { start, end, date } = briefWindow(type);
  const stats = await fetchBriefStats(start, end);
  const { system: systemDefault, user } = buildPrompt(type, stats);
  // Le COO lit désormais son system prompt éditable en base (table
  // asvc_agent_prompts via l'UI « System prompts agents »), comme les 18 autres
  // agents. Sans version active → fallback sur le prompt par défaut ci-dessus.
  const system = await loadAgentSystemPrompt("coo", systemDefault);

  // Cohérence des offres : capacité déterministe (RPC asvc_offer_coherence_audit).
  // Le COO inclut désormais ce signal dans son brief. Non bloquant.
  let userMsg = user;
  try {
    const { data: issues } = await supabaseAdmin.rpc("asvc_offer_coherence_audit");
    const list = (issues as { severity: string }[] | null) ?? [];
    if (list.length > 0) {
      const high = list.filter((i) => i.severity === "high").length;
      userMsg += `\n\nOFFRES (cohérence des plans d'abonnement)\n- Incohérences détectées: ${list.length}${high > 0 ? ` (dont ${high} critiques: prix incohérents)` : ""}`;
    } else {
      userMsg += `\n\nOFFRES (cohérence des plans d'abonnement)\n- Aucune incohérence détectée`;
    }
  } catch (_e) {
    // RPC absente / erreur → on n'ajoute simplement pas la section.
  }

  const model = Deno.env.get("ASVC_COO_MODEL") ?? "claude-sonnet-4-6";

  const chat = await asvcChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ],
    temperature: 0.3,
    maxTokens: 800,
  });

  const summary = (chat.message?.content as string | undefined)?.trim() ?? "(brief vide)";
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Persistance
  const { data: brief, error: insErr } = await supabaseAdmin
    .from("asvc_coo_briefs")
    .insert({
      brief_type: type,
      brief_date: date,
      summary,
      details_markdown: null,
      kpis: stats,
      arbitrations_pending: stats.arbitrations.pending,
      arbitrations_urgent: stats.arbitrations.urgent,
    })
    .select("id")
    .single();

  if (insErr) throw new Error(`insert brief: ${insErr.message}`);

  // Audit log
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "coo",
    p_event_type: "brief_generated",
    p_resource_type: "asvc_coo_briefs",
    p_resource_id: brief!.id,
    p_payload: {
      brief_type: type,
      tokens_used: tokensUsed,
      model,
    },
  });

  return {
    briefId: brief!.id,
    briefType: type,
    briefDate: date,
    summary,
    kpis: stats,
    tokensUsed,
    model,
  };
}
