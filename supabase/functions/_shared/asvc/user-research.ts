// ASVC v2.0 — User Research Agent: approfondit une opportunité qualifiée.
//
// Pipeline:
//   1. Lit l'opportunité (asvc_opportunities)
//   2. Tire les feedbacks SAV pertinents (asvc_tickets + ticket_messages)
//   3. Demande à Claude un research brief structuré
//   4. Insère asvc_research_briefs + action_proposed Go/No-Go
//
// NB: Pas d'envoi réel à des clients. L'agent propose un template d'interview
// que la CEO pourra envoyer après validation.

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

const USER_RESEARCH_SYSTEM = `Tu es User Research Agent de Atlas Studio.
Tu produis des research briefs courts mais actionnables pour la CEO.

MÉTHODES ACCEPTÉES
- feedback_analysis : analyse tickets/messages SAV existants
- competitor_analysis : analyse positionnement concurrents (sur la base d'infos déjà connues)
- persona_simulation : simulation de 3-5 personas types pour estimer la demande
- mixed             : combine plusieurs méthodes

RÈGLES
- Tu n'inventes PAS de clients réels. Si tu cites un quote, il vient des tickets fournis.
- Si l'opportunité est trop faible (RICE < 20 ou signaux contradictoires),
  recommandation = 'no_go'. Tu n'es pas obligé de recommander 'go'.
- Si tu vois des risques (compliance, technique, marché), tu les listes.
- Reco finale parmi : 'go' / 'no_go' / 'pivot' / 'wait'

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "title":                  "Titre du brief (max 100 chars)",
  "problem_statement":      "Énoncé clair du problème en 2-3 phrases",
  "research_method":        "feedback_analysis|competitor_analysis|persona_simulation|mixed",
  "sample_size":            <int ou null>,
  "sample_description":     "ex: 12 cabinets compta utilisant LiassPilot, ou null",
  "key_findings":           ["finding 1", "finding 2", "..."],
  "pain_points":            ["pain 1", "pain 2"],
  "user_quotes":            [{"quote":"...","source":"ticket #1234 ou persona X"}],
  "recommendations":        "Recommandations actionnables en 3-5 lignes",
  "go_no_go_recommendation":"go|no_go|pivot|wait",
  "risks":                  ["risque 1", "risque 2"],
  "markdown_summary":       "Brief complet en Markdown, structuré, 400-600 mots"
}`;

interface ResearchOutput {
  title: string;
  problem_statement: string;
  research_method: string;
  sample_size: number | null;
  sample_description: string | null;
  key_findings: string[];
  pain_points: string[];
  user_quotes: Array<{ quote: string; source: string }>;
  recommendations: string;
  go_no_go_recommendation: "go" | "no_go" | "pivot" | "wait";
  risks: string[];
  markdown_summary: string;
}

export interface ConductResearchResult {
  actionId: string;
  briefId: string;
  opportunityId: string;
  recommendation: string;
  tokensUsed: number;
}

export async function conductResearch(opportunityId: string): Promise<ConductResearchResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_USER_RESEARCH_MODEL") ?? "claude-sonnet-4-6";

  const { data: opp, error: oErr } = await supabaseAdmin
    .from("asvc_opportunities")
    .select("id, title, description, category, rice_score, market_size_estimate, effort_estimate")
    .eq("id", opportunityId)
    .single();
  if (oErr || !opp) throw new Error(`Opportunité introuvable: ${oErr?.message ?? opportunityId}`);

  // Tickets liés (heuristique : mots-clés du titre opp dans le subject/category)
  const { data: tickets } = await supabaseAdmin
    .from("asvc_tickets")
    .select("ticket_number, subject, initial_message, category, sentiment_score")
    .order("created_at", { ascending: false })
    .limit(30);

  const agentId = await fetchAgentIdByCode("user_research");

  const ticketsFmt = (tickets ?? [])
    .map(
      (t) =>
        `- ${t.ticket_number} [${t.category ?? "?"}] (sentiment ${t.sentiment_score ?? "?"}): ${t.subject ?? "(no subject)"} — ${(t.initial_message ?? "").slice(0, 200)}`,
    )
    .join("\n");

  const userPrompt = `OPPORTUNITÉ À APPROFONDIR
- Titre: ${opp.title}
- Description: ${opp.description}
- Catégorie: ${opp.category}
- RICE: ${opp.rice_score}
- Taille marché estimée: ${opp.market_size_estimate}
- Effort estimé: ${opp.effort_estimate}

ÉCHANTILLON FEEDBACKS SAV RÉCENTS (30 derniers tickets)
${ticketsFmt || "(aucun ticket à analyser)"}

Produis le research brief JSON maintenant.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: USER_RESEARCH_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    maxTokens: 2500,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<ResearchOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Brief
  const { data: brief, error: bErr } = await supabaseAdmin
    .from("asvc_research_briefs")
    .insert({
      opportunity_id: opportunityId,
      agent_id: agentId,
      title: out.title.slice(0, 200),
      problem_statement: out.problem_statement,
      research_method: out.research_method,
      sample_size: out.sample_size,
      sample_description: out.sample_description,
      key_findings: out.key_findings,
      pain_points: out.pain_points,
      user_quotes: out.user_quotes,
      recommendations: out.recommendations,
      go_no_go_recommendation: out.go_no_go_recommendation,
      markdown_content: out.markdown_summary,
    })
    .select("id")
    .single();
  if (bErr) throw new Error(`brief: ${bErr.message}`);

  // Update opp → ready_for_decision
  await supabaseAdmin
    .from("asvc_opportunities")
    .update({ status: "ready_for_decision" })
    .eq("id", opportunityId);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_research",
      trigger_payload: { opportunity_id: opportunityId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Action Go/No-Go pour la CEO
  const criticality: "low" | "normal" | "high" | "critical" =
    out.go_no_go_recommendation === "go" ? "high" : "normal";

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type: "decide_opportunity_go_no_go",
      criticality,
      title: `Décision ${out.go_no_go_recommendation.toUpperCase()} — ${opp.title}`,
      description: out.recommendations,
      proposed_payload: {
        opportunity_id: opportunityId,
        brief_id: brief!.id,
        recommendation: out.go_no_go_recommendation,
        key_findings: out.key_findings,
        pain_points: out.pain_points,
        risks: out.risks,
        markdown_summary: out.markdown_summary,
      },
      context: {
        opportunity_title: opp.title,
        opportunity_rice: opp.rice_score,
        research_method: out.research_method,
        tickets_analyzed: (tickets ?? []).length,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin
    .from("asvc_research_briefs")
    .update({ related_action_id: action!.id })
    .eq("id", brief!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "user_research",
    p_event_type: "research_brief_generated",
    p_resource_type: "asvc_research_briefs",
    p_resource_id: brief!.id,
    p_payload: {
      action_id: action!.id,
      recommendation: out.go_no_go_recommendation,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    briefId: brief!.id,
    opportunityId,
    recommendation: out.go_no_go_recommendation,
    tokensUsed,
  };
}
