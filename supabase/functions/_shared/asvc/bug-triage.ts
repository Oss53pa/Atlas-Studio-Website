// ASVC — Bug Triage Agent: qualification d'un bug + draft d'issue GitHub.
//
// Pipeline:
//   1. Charge le ticket et son fil
//   2. (Optionnel) Cherche des erreurs liées dans error_monitor pour la même app
//   3. Demande à Claude:
//      - Sévérité P0/P1/P2/P3
//      - App suspectée
//      - Étapes de reproduction
//      - Logs/erreurs pertinents
//      - Issue GitHub formatée
//   4. Insère action_proposed (action_type='create_github_issue')

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";

interface Ticket {
  id: string;
  ticket_number: string;
  client_email: string | null;
  client_name: string | null;
  app_concerned: string | null;
  subject: string | null;
  initial_message: string;
  category: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
}

interface ErrorLogEntry {
  id: string;
  app_id: string | null;
  message: string | null;
  stack_trace: string | null;
  last_seen_at: string | null;
  url: string | null;
  occurrence_count: number | null;
}

type Severity = "P0" | "P1" | "P2" | "P3";

const BUG_TRIAGE_SYSTEM = `Tu es Bug Triage Agent de Atlas Studio. Tu qualifies les bugs reportés
en tickets et tu draftes l'issue GitHub correspondante.

CATALOGUE APPS (slugs GitHub)
- atlas-finance, liasspilot, cashpilot, wisehr, wisefm, atlasbanx,
  advist, docjourney, duedeck, atlastrade, tablesmart, atlas-lease,
  cockpit-journey, cockpit-fa, atlas-studio (site/portal)

CLASSIFICATION DE SÉVÉRITÉ (strict)
- P0 — Critique : service indisponible, perte de données, sécurité,
  blocage paiement, calculs faux en production. Action immédiate.
- P1 — Haute : feature majeure cassée, contournement difficile,
  impact >10% utilisateurs. Hotfix sous 24-48h.
- P2 — Moyenne : bug isolé, contournement existe, impact limité.
  Inclus dans le sprint suivant.
- P3 — Basse : cosmétique, edge case rare, amélioration.
  Backlog longue traîne.

FORMAT DE TON OUTPUT
Tu produis STRICTEMENT un JSON unique (rien avant, rien après) avec cette forme:

{
  "severity": "P0|P1|P2|P3",
  "app_slug": "atlas-finance|liasspilot|...",
  "title": "feat/bug: titre court 80 chars max",
  "labels": ["bug", "P0|P1|P2|P3", "app:xxx", "priority:..."],
  "issue_markdown": "<contenu Markdown complet pour l'issue GitHub>",
  "reproduction_confidence": 0.0,
  "suspected_component": "ex: api/billing, ui/dashboard"
}

CONTENU issue_markdown (Markdown GitHub)
## Contexte
<résumé client + impact>

## Étapes de reproduction
1. ...
2. ...

## Comportement attendu
<...>

## Comportement observé
<...>

## Logs / erreurs corrélées
<si fournis>

## Tickets liés
- Ticket: \`<ticket_number>\`
- Client: <nom/email anonymisé OK>

## Premières pistes
<hypothèse technique courte, pas obligatoire>

RÈGLES
- Anonymise les données personnelles sensibles dans l'issue (téléphone, adresse).
- Garde le client_name + email comme référence interne, OK pour GitHub privé.
- Si reproduction impossible avec les infos: \`reproduction_confidence\` < 0.4
  et signaler dans issue_markdown qu'il faut redemander au client.
- Tu produis SEULEMENT le JSON. Pas de prose en dehors.`;

interface TriageResult {
  severity: Severity;
  app_slug: string;
  title: string;
  labels: string[];
  issue_markdown: string;
  reproduction_confidence: number;
  suspected_component: string | null;
}

function parseTriageOutput(raw: string): TriageResult {
  // Le modèle peut entourer le JSON de ```json … ``` — strip si présent
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  // Trouve le premier { et le dernier } pour robustesse
  const i0 = s.indexOf("{");
  const iN = s.lastIndexOf("}");
  if (i0 === -1 || iN === -1) {
    throw new Error("Triage output: pas de JSON détecté");
  }
  const json = s.slice(i0, iN + 1);
  const parsed = JSON.parse(json);

  // Validation minimale
  const severity = parsed.severity;
  if (!["P0", "P1", "P2", "P3"].includes(severity)) {
    throw new Error(`Sévérité invalide: ${severity}`);
  }
  if (typeof parsed.issue_markdown !== "string" || parsed.issue_markdown.length < 20) {
    throw new Error("issue_markdown manquant ou trop court");
  }

  return {
    severity,
    app_slug: String(parsed.app_slug ?? "atlas-studio"),
    title: String(parsed.title ?? "bug: à compléter").slice(0, 200),
    labels: Array.isArray(parsed.labels) ? parsed.labels.map(String) : [],
    issue_markdown: String(parsed.issue_markdown),
    reproduction_confidence:
      typeof parsed.reproduction_confidence === "number"
        ? Math.max(0, Math.min(1, parsed.reproduction_confidence))
        : 0.5,
    suspected_component:
      typeof parsed.suspected_component === "string" ? parsed.suspected_component : null,
  };
}

/** Mappe sévérité → criticality d'arbitrage. */
function severityToCriticality(s: Severity): "low" | "normal" | "high" | "critical" {
  return s === "P0" ? "critical" : s === "P1" ? "high" : s === "P2" ? "normal" : "low";
}

export interface BugTriageResult {
  actionId: string;
  ticketId: string;
  severity: Severity;
  appSlug: string;
  issueTitle: string;
  issueMarkdown: string;
  labels: string[];
  reproductionConfidence: number;
  suspectedComponent: string | null;
  tokensUsed: number;
}

/** Fetch des erreurs récentes de error_logs pour l'app concernée (best-effort). */
async function fetchRelatedErrors(appId: string | null, since: string): Promise<ErrorLogEntry[]> {
  if (!appId) return [];
  try {
    const { data } = await supabaseAdmin
      .from("error_logs")
      .select("id, app_id, message, stack_trace, last_seen_at, url, occurrence_count")
      .eq("app_id", appId)
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false })
      .limit(5);
    return ((data as unknown as ErrorLogEntry[]) ?? []);
  } catch {
    // best-effort, on n'échoue pas le triage si la table est inaccessible
    return [];
  }
}

export async function triageBug(ticketId: string): Promise<BugTriageResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY manquante");
  }
  const model = Deno.env.get("ASVC_BUG_TRIAGE_MODEL") ?? "claude-sonnet-4-6";

  // 1. Ticket
  const { data: ticket, error: tErr } = await supabaseAdmin
    .from("asvc_tickets")
    .select(
      "id,ticket_number,client_email,client_name,app_concerned,subject,initial_message,category,priority,created_at",
    )
    .eq("id", ticketId)
    .single();
  if (tErr || !ticket) throw new Error(`Ticket introuvable: ${tErr?.message ?? ticketId}`);
  const t = ticket as Ticket;

  // 2. Fil de messages
  const { data: messages } = await supabaseAdmin
    .from("asvc_ticket_messages")
    .select("sender_type,content,created_at")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  // 3. Erreurs liées (24h avant le ticket)
  const since = new Date(new Date(t.created_at).getTime() - 24 * 3600 * 1000).toISOString();
  const errors = await fetchRelatedErrors(t.app_concerned, since);

  // 4. Bug Triage agent
  const { data: agent } = await supabaseAdmin
    .from("asvc_agents")
    .select("id")
    .eq("code", "bug_triage")
    .single();
  if (!agent) throw new Error("Agent 'bug_triage' introuvable");

  // 5. Prompt
  const filFmt = (messages as { sender_type: string; content: string; created_at: string }[] | null)
    ?.map(
      (m) =>
        `[${new Date(m.created_at).toLocaleString("fr-FR")}] ${m.sender_type}: ${m.content}`,
    )
    .join("\n") ?? "(aucun échange)";

  const errFmt = errors.length
    ? errors
        .map(
          (e) =>
            `- [${e.last_seen_at}] (×${e.occurrence_count ?? 1}) ${e.message ?? "(no msg)"} @ ${e.url ?? "?"}\n  stack: ${(e.stack_trace ?? "").slice(0, 300)}`,
        )
        .join("\n")
    : "(aucune erreur error_logs corrélée trouvée)";

  const userPrompt = `Ticket ${t.ticket_number} (priorité client: ${t.priority})
App: ${t.app_concerned ?? "non précisée"}
Client: ${t.client_name ?? t.client_email ?? "anonyme"}
Sujet: ${t.subject ?? "(sans objet)"}

Message initial:
${t.initial_message}

Fil:
${filFmt}

Erreurs error_logs récentes (24h pré-ticket):
${errFmt}

Qualifie ce bug et produis le JSON de triage.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: BUG_TRIAGE_SYSTEM },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.2,
    maxTokens: 2000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const triage = parseTriageOutput(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);
  const criticality = severityToCriticality(triage.severity);

  // 6. Session + action
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agent.id,
      trigger_type: "manual_bug_triage",
      trigger_payload: { ticket_id: ticketId },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agent.id,
      action_type: "create_github_issue",
      criticality,
      title: `Bug ${triage.severity} ${triage.app_slug}: ${triage.title}`,
      description: `Issue GitHub draftée pour ${triage.app_slug} suite au ticket ${t.ticket_number}. Confiance reproduction: ${Math.round(triage.reproduction_confidence * 100)}%.`,
      proposed_payload: {
        ticket_id: ticketId,
        ticket_number: t.ticket_number,
        repo: triage.app_slug,
        title: triage.title,
        body: triage.issue_markdown,
        labels: triage.labels,
      },
      context: {
        severity: triage.severity,
        suspected_component: triage.suspected_component,
        reproduction_confidence: triage.reproduction_confidence,
        client_priority: t.priority,
        correlated_errors_count: errors.length,
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  // 7. Audit
  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "bug_triage",
    p_event_type: "bug_triaged",
    p_resource_type: "asvc_tickets",
    p_resource_id: ticketId,
    p_payload: {
      action_id: action!.id,
      severity: triage.severity,
      app_slug: triage.app_slug,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    ticketId,
    severity: triage.severity,
    appSlug: triage.app_slug,
    issueTitle: triage.title,
    issueMarkdown: triage.issue_markdown,
    labels: triage.labels,
    reproductionConfidence: triage.reproduction_confidence,
    suspectedComponent: triage.suspected_component,
    tokensUsed,
  };
}
