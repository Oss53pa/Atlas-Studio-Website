// ASVC — Cron router.
//
// POST /asvc-cron
// Body: { task: "morning_brief" | "evening_brief" | "weekly_brief"
//             | "treasury_brief" | "overdue_invoices_scan"
//             | "lifecycle_scan" | "auto_execute_internal" }
//
// Auth: CRON_SHARED_SECRET (recommandé) OU JWT admin (déclenchement manuel)
//
// Tâches:
// - morning_brief / evening_brief / weekly_brief → POST asvc-coo-brief
// - treasury_brief → POST asvc-treasury
// - overdue_invoices_scan → pour chaque facture en retard, demande un draft
//   de relance au niveau suggéré (au max 5 factures par scan, criticality ASC)
// - lifecycle_scan → pour chaque client en stage actionable, demande un draft
//   d'outreach (au max 5 clients par scan)
// - auto_execute_internal → exécute toutes les actions 'approved' dont
//   l'action_type est "internal" (utile pour vider l'inbox des in-system
//   approuvées en attente d'exécution)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import {
  fetchSentryPat,
  getDefaultSentryOrg,
  isSentryConfigured,
  getProjectErrorStats,
  computeErrorRate,
} from "../_shared/asvc/sentry.ts";

type CronTask =
  | "morning_brief"
  | "evening_brief"
  | "weekly_brief"
  | "treasury_brief"
  | "overdue_invoices_scan"
  | "lifecycle_scan"
  | "auto_execute_internal"
  | "post_deploy_monitor";

const VALID_TASKS: CronTask[] = [
  "morning_brief",
  "evening_brief",
  "weekly_brief",
  "treasury_brief",
  "overdue_invoices_scan",
  "lifecycle_scan",
  "auto_execute_internal",
  "post_deploy_monitor",
];

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const CRON_SECRET = Deno.env.get("CRON_SHARED_SECRET") ?? "";

async function callFunction(name: string, body: unknown): Promise<unknown> {
  if (!CRON_SECRET) {
    throw new Error("CRON_SHARED_SECRET non configuré côté env");
  }
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CRON_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`${name} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function runMorningBrief() {
  return await callFunction("asvc-coo-brief", { type: "morning" });
}
async function runEveningBrief() {
  return await callFunction("asvc-coo-brief", { type: "evening" });
}
async function runWeeklyBrief() {
  return await callFunction("asvc-coo-brief", { type: "weekly" });
}
async function runTreasuryBrief() {
  return await callFunction("asvc-treasury", {});
}

async function runOverdueInvoicesScan() {
  const { data, error } = await supabaseAdmin.rpc("asvc_overdue_invoices", { p_limit: 5 });
  if (error) throw new Error(`overdue_invoices: ${error.message}`);
  const rows = (data as Array<{ invoice_id: string; suggested_level: string }>) ?? [];
  const results = [];
  for (const r of rows) {
    try {
      const out = await callFunction("asvc-billing", {
        invoice_id: r.invoice_id,
        level: r.suggested_level,
      });
      results.push({ invoice_id: r.invoice_id, ok: true, out });
    } catch (e) {
      results.push({ invoice_id: r.invoice_id, ok: false, error: (e as Error).message });
    }
  }
  return { processed: results.length, results };
}

async function runLifecycleScan() {
  const { data, error } = await supabaseAdmin.rpc("asvc_clients_lifecycle", { p_limit: 30 });
  if (error) throw new Error(`clients_lifecycle: ${error.message}`);
  type Row = { client_id: string; stage: string };
  const rows = (data as Row[]) ?? [];
  const stageToGoal: Record<string, string | null> = {
    d1: "onboarding_d1",
    d7: "onboarding_d7",
    d30: "onboarding_d30",
    trial_ending: "trial_ending",
    churn_risk: "churn_check",
    upsell: "upsell",
    steady: null,
    churned: null,
  };
  const targets = rows
    .filter((r) => stageToGoal[r.stage])
    .slice(0, 5); // max 5 par scan pour éviter de submerger
  const results = [];
  for (const r of targets) {
    try {
      const out = await callFunction("asvc-customer-success", {
        client_id: r.client_id,
        goal: stageToGoal[r.stage],
      });
      results.push({ client_id: r.client_id, ok: true, out });
    } catch (e) {
      results.push({ client_id: r.client_id, ok: false, error: (e as Error).message });
    }
  }
  return { processed: results.length, results };
}

async function runPostDeployMonitor() {
  if (!(await isSentryConfigured())) {
    return { skipped: "sentry_not_configured" };
  }
  const org = await getDefaultSentryOrg();
  if (!org) return { skipped: "no_sentry_org" };
  const creds = await fetchSentryPat(org);
  if (!creds) return { skipped: "no_sentry_creds" };

  // Deployments en cours de monitoring (production uniquement pour l'instant)
  const { data: deployments } = await supabaseAdmin
    .from("asvc_deployments")
    .select("id, app_name, environment, deployed_at, monitoring_window_minutes, error_rate_percent, alerts_triggered")
    .eq("status", "monitoring")
    .eq("environment", "production");

  if (!deployments || deployments.length === 0) {
    return { processed: 0 };
  }

  const errorRateThreshold = parseFloat(Deno.env.get("ASVC_DEPLOY_ERROR_RATE_THRESHOLD") ?? "0.5");
  const results: Array<{ deployment_id: string; status: string; events: number; rate: number }> = [];

  for (const dep of deployments) {
    const deployedAt = dep.deployed_at ? new Date(dep.deployed_at) : null;
    if (!deployedAt) continue;

    const windowMin = dep.monitoring_window_minutes ?? 30;
    const windowEnd = new Date(deployedAt.getTime() + windowMin * 60 * 1000);
    const now = new Date();
    const until = now < windowEnd ? now : windowEnd;

    try {
      const stats = await getProjectErrorStats(creds.token, org, dep.app_name, deployedAt, until);
      const rate = computeErrorRate(stats.total_events, stats.since, stats.until);

      await supabaseAdmin
        .from("asvc_deployments")
        .update({
          error_rate_percent: rate,
          alerts_triggered: stats.total_events,
        })
        .eq("id", dep.id);

      // Spike détecté → crée un incident + suggère rollback
      if (rate > errorRateThreshold) {
        // Trouve l'agent devops_release
        const { data: agent } = await supabaseAdmin
          .from("asvc_agents")
          .select("id")
          .eq("code", "devops_release")
          .single();

        const { data: incident } = await supabaseAdmin
          .from("asvc_production_incidents")
          .insert({
            detected_by_agent_id: agent?.id ?? null,
            app_concerned: dep.app_name,
            related_deployment_id: dep.id,
            severity: rate > errorRateThreshold * 5 ? "P0" : "P1",
            title: `Spike d'erreurs post-deploy ${dep.app_name} (${rate.toFixed(2)} events/min)`,
            description: stats.top_issue
              ? `Top issue: ${stats.top_issue.title} (${stats.top_issue.count}× ${stats.top_issue.level})`
              : "Spike détecté sans top issue identifiable",
            error_logs: stats as unknown as Record<string, unknown>,
            status: "open",
          })
          .select("id")
          .single();

        // Action proposée: rollback
        const { data: session } = await supabaseAdmin
          .from("asvc_agent_sessions")
          .insert({
            agent_id: agent?.id ?? null,
            trigger_type: "post_deploy_monitor",
            trigger_payload: { deployment_id: dep.id, error_rate: rate },
            status: "completed",
            ended_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        await supabaseAdmin.from("asvc_agent_actions").insert({
          session_id: session?.id ?? null,
          agent_id: agent?.id ?? null,
          action_type: "trigger_rollback",
          criticality: "critical",
          title: `🚨 ROLLBACK suggéré — ${dep.app_name} (${rate.toFixed(2)} events/min)`,
          description: `Sentry détecte ${stats.total_events} erreurs sur ${windowMin} min post-deploy. Seuil dépassé (${errorRateThreshold} events/min). Top issue : ${stats.top_issue?.title ?? "n/a"}.`,
          proposed_payload: {
            deployment_id: dep.id,
            app_name: dep.app_name,
            incident_id: incident?.id,
            error_rate: rate,
            top_issue: stats.top_issue,
            sentry_org: org,
          },
          context: {
            source: "post_deploy_monitor_cron",
            window_minutes: windowMin,
          },
          status: "proposed",
        });

        // Marque le deployment comme failed (CEO décide du rollback)
        await supabaseAdmin
          .from("asvc_deployments")
          .update({ status: "failed" })
          .eq("id", dep.id);

        results.push({ deployment_id: dep.id, status: "rollback_proposed", events: stats.total_events, rate });
      } else if (now >= windowEnd) {
        // Fenêtre écoulée sans spike → success final
        await supabaseAdmin
          .from("asvc_deployments")
          .update({ status: "success" })
          .eq("id", dep.id);
        results.push({ deployment_id: dep.id, status: "success_after_window", events: stats.total_events, rate });
      } else {
        results.push({ deployment_id: dep.id, status: "monitoring_continues", events: stats.total_events, rate });
      }
    } catch (e) {
      results.push({ deployment_id: dep.id, status: `error: ${(e as Error).message}`, events: 0, rate: 0 });
    }
  }

  return { processed: deployments.length, results };
}

async function runAutoExecuteInternal() {
  // Récupère les actions approved dont l'execution_kind = 'internal'
  const { data, error } = await supabaseAdmin.rpc("asvc_pending_executions", { p_limit: 50 });
  if (error) throw new Error(`pending_executions: ${error.message}`);
  type Row = { action_id: string; execution_kind: string; criticality: string };
  const rows = ((data as Row[]) ?? []).filter(
    (r) => r.execution_kind === "internal" && r.criticality !== "critical",
  );
  if (rows.length === 0) {
    return { processed: 0, results: [] };
  }
  // Auto-exécute SAUF les critical (qui doivent rester en revue CEO)
  const out = await callFunction("asvc-execute-action", {
    action_ids: rows.map((r) => r.action_id),
  });
  return { processed: rows.length, batch_result: out };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { task?: CronTask };
  try {
    body = (await req.json()) as { task?: CronTask };
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }
  if (!body.task || !VALID_TASKS.includes(body.task)) {
    return errorResponse(`task invalide: ${body.task}`, 400);
  }

  const t0 = Date.now();
  try {
    let result: unknown;
    switch (body.task) {
      case "morning_brief": result = await runMorningBrief(); break;
      case "evening_brief": result = await runEveningBrief(); break;
      case "weekly_brief": result = await runWeeklyBrief(); break;
      case "treasury_brief": result = await runTreasuryBrief(); break;
      case "overdue_invoices_scan": result = await runOverdueInvoicesScan(); break;
      case "lifecycle_scan": result = await runLifecycleScan(); break;
      case "auto_execute_internal": result = await runAutoExecuteInternal(); break;
      case "post_deploy_monitor": result = await runPostDeployMonitor(); break;
    }

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "cron_task_completed",
      p_resource_type: null,
      p_resource_id: null,
      p_payload: {
        task: body.task,
        duration_ms: Date.now() - t0,
      },
    });

    return jsonResponse({
      ok: true,
      task: body.task,
      duration_ms: Date.now() - t0,
      result,
    });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "cron_task_failed",
      p_resource_type: null,
      p_resource_id: null,
      p_payload: { task: body.task, error: msg },
    });
    return errorResponse(`cron ${body.task} failed: ${msg}`);
  }
});
