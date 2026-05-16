// ASVC v2.0 — DevOps/Release Agent: pipeline de déploiement avec triple gate.
//
// Étapes:
//   prepareDeployment(prId, env) → crée asvc_deployments + rollback plan
//   Triple gate côté serveur:
//     ① QA passed (qa_status='passed')
//     ② Si environment='production': PR.approved_by_ceo doit être true (preview validée)
//     ③ deployment.approved_by_ceo (validé par bouton dédié + confirmation typée)
//
// L'action de validation finale est créée avec criticality='critical' et
// description inclut le plan de rollback complet pour visibilité Pame.

import { supabaseAdmin } from "../supabase.ts";
import { anthropicChat } from "../proph3t/anthropic.ts";
import { loadAgentSystemPrompt } from "./prompts.ts";
import { fetchAgentIdByCode, parseJsonOutput } from "./sales-common.ts";

const DEVOPS_SYSTEM = `Tu es DevOps/Release Agent de Atlas Studio. SRE virtuel.

RESPONSABILITÉ
Préparer un plan de déploiement sûr et rollback-ready.

CONTRAINTES NON-NÉGOCIABLES
- AUCUN deploy production sans approbation CEO (Pame)
- AUCUN deploy production sans plan de rollback documenté ET dry-run passé
- AUCUN deploy le vendredi après 16h, weekend, ou jours fériés (sauf override Pame)
- AUCUN deploy si un incident P0/P1 production est actif

CONTENU DU PLAN
- migrations_dry_run: liste des migrations Supabase + statut dry-run
- rollback_plan: Markdown détaillé incluant
    * Tag git de la version précédente à restaurer
    * Script SQL d'inversion des migrations
    * Commande Vercel rollback exacte
    * Estimation downtime
- monitoring_plan: seuils Sentry, alertes Vercel, durée surveillance
- deploy_window: créneau recommandé (mardi-jeudi 10h-15h GMT idéal)

FORMAT DE SORTIE
JSON unique (rien autour):
{
  "previous_version_tag":   "v1.X.Y-{app}",
  "migrations_dry_run":     [{"file":"...","status":"ok|warning|error","notes":"..."}],
  "rollback_plan_markdown": "Markdown complet",
  "monitoring_plan":        {"window_minutes":30,"error_rate_threshold_percent":5,"alerts":["..."]},
  "deploy_window":          {"recommended":"mardi 10h-15h GMT","blocked_reason":null|"raison"},
  "risk_assessment":        {"level":"low|medium|high","factors":["..."]},
  "go_no_go":               "go|no_go",
  "blockers":               ["si no_go: liste des blockers"]
}`;

interface DevopsOutput {
  previous_version_tag: string;
  migrations_dry_run: Array<{ file: string; status: string; notes: string }>;
  rollback_plan_markdown: string;
  monitoring_plan: {
    window_minutes: number;
    error_rate_threshold_percent: number;
    alerts: string[];
  };
  deploy_window: { recommended: string; blocked_reason: string | null };
  risk_assessment: { level: "low" | "medium" | "high"; factors: string[] };
  go_no_go: "go" | "no_go";
  blockers: string[];
}

export type DeployEnvironment = "preview" | "staging" | "production";

export interface PrepareDeploymentResult {
  actionId: string;
  deploymentId: string;
  environment: DeployEnvironment;
  goNoGo: string;
  blockers: string[];
  tokensUsed: number;
}

function isDeployWindowBlocked(date = new Date()): { blocked: boolean; reason: string | null } {
  const day = date.getUTCDay(); // 0=dim, 6=sam
  const hour = date.getUTCHours();
  if (day === 0 || day === 6) return { blocked: true, reason: "weekend (UTC)" };
  if (day === 5 && hour >= 16) return { blocked: true, reason: "vendredi après 16h UTC" };
  return { blocked: false, reason: null };
}

async function hasOpenProductionIncident(): Promise<boolean> {
  const { count } = await supabaseAdmin
    .from("asvc_production_incidents")
    .select("*", { count: "exact", head: true })
    .in("severity", ["P0", "P1"])
    .in("status", ["open", "investigating"]);
  return (count ?? 0) > 0;
}

export async function prepareDeployment(
  prId: string,
  environment: DeployEnvironment,
  appName: string,
): Promise<PrepareDeploymentResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("ASVC_ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY manquante");
  const model = Deno.env.get("ASVC_DEVOPS_MODEL") ?? "claude-sonnet-4-6";

  // ─── Gate 1: QA passed
  const { data: pr, error: prErr } = await supabaseAdmin
    .from("asvc_code_pull_requests")
    .select("id, repo, branch_name, title, qa_status, status, approved_by_ceo")
    .eq("id", prId)
    .single();
  if (prErr || !pr) throw new Error(`PR introuvable: ${prErr?.message ?? prId}`);

  if (pr.qa_status !== "passed") {
    throw new Error(`Gate 1 échoué: QA status="${pr.qa_status}" (requis: "passed")`);
  }

  // ─── Gate 2 (production only): preview already approved by CEO
  if (environment === "production" && !pr.approved_by_ceo) {
    throw new Error(
      `Gate 2 échoué: preview de cette PR doit être approuvée par la CEO avant deploy production (PR.approved_by_ceo=false)`,
    );
  }

  // ─── Gate 3 (production only): no open P0/P1 incident
  if (environment === "production") {
    const incidentOpen = await hasOpenProductionIncident();
    if (incidentOpen) {
      throw new Error(`Gate 3 échoué: incident P0/P1 production actif, deploy interdit`);
    }
  }

  const agentId = await fetchAgentIdByCode("devops_release");

  // ─── Génère le plan via Claude
  const windowCheck = isDeployWindowBlocked();
  const userPrompt = `PR PRÊTE POUR DEPLOY
- Repo: ${pr.repo}
- Branche: ${pr.branch_name}
- Titre: ${pr.title}
- QA: ${pr.qa_status}
- Env cible: ${environment}
- App: ${appName}

CONTEXTE
- Heure actuelle UTC: ${new Date().toISOString()}
- Fenêtre de déploiement: ${windowCheck.blocked ? `BLOQUÉE (${windowCheck.reason})` : "OK"}

Produis le plan de déploiement JSON.`;

  const chat = await anthropicChat({
    apiKey,
    model,
    messages: [
      { role: "system", content: await loadAgentSystemPrompt("devops_release", DEVOPS_SYSTEM) },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,
    maxTokens: 3000,
  });

  const raw = (chat.message?.content as string | undefined)?.trim() ?? "";
  const out = parseJsonOutput<DevopsOutput>(raw);
  const tokensUsed = (chat.prompt_eval_count ?? 0) + (chat.eval_count ?? 0);

  // Override serveur sur fenêtre de déploiement
  const finalGoNoGo: "go" | "no_go" =
    environment === "production" && windowCheck.blocked ? "no_go" : out.go_no_go;
  const finalBlockers = windowCheck.blocked
    ? [...out.blockers, `Fenêtre déploiement: ${windowCheck.reason}`]
    : out.blockers;

  // Vérifie dry-run migrations OK
  const migrationsDryRunOk = out.migrations_dry_run.every((m) => m.status === "ok");

  // Crée le deployment
  const { data: deployment, error: dErr } = await supabaseAdmin
    .from("asvc_deployments")
    .insert({
      pr_id: prId,
      agent_id: agentId,
      environment,
      app_name: appName,
      supabase_migrations: out.migrations_dry_run,
      migration_dry_run_passed: migrationsDryRunOk,
      rollback_plan: out.rollback_plan_markdown,
      rollback_tested: false,
      previous_version_tag: out.previous_version_tag,
      status: "pending",
      monitoring_window_minutes: out.monitoring_plan.window_minutes,
    })
    .select("id")
    .single();
  if (dErr) throw new Error(`deployment: ${dErr.message}`);

  // Session
  const { data: session, error: sErr } = await supabaseAdmin
    .from("asvc_agent_sessions")
    .insert({
      agent_id: agentId,
      trigger_type: "manual_deploy_prepare",
      trigger_payload: { pr_id: prId, environment, app_name: appName },
      status: "completed",
      ended_at: new Date().toISOString(),
      tokens_used: tokensUsed,
    })
    .select("id")
    .single();
  if (sErr) throw new Error(`session: ${sErr.message}`);

  // Criticality:
  // - production = critical TOUJOURS (validation typée requise UI)
  // - staging/preview = high
  const criticality: "low" | "normal" | "high" | "critical" =
    environment === "production" ? "critical" : "high";

  const titlePrefix = environment === "production" ? "🟣 DEPLOY PROD" : `📦 Deploy ${environment}`;

  const { data: action, error: aErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .insert({
      session_id: session!.id,
      agent_id: agentId,
      action_type:
        environment === "production"
          ? "deploy_to_production"
          : environment === "staging"
            ? "deploy_to_staging"
            : "deploy_to_preview",
      criticality,
      title: `${titlePrefix} — ${appName} (${pr.title})`,
      description:
        finalGoNoGo === "no_go"
          ? `🚨 GO/NO-GO: NO-GO — Blockers: ${finalBlockers.join("; ")}`
          : `Plan de déploiement prêt. Risque: ${out.risk_assessment.level}. Rollback documenté.`,
      proposed_payload: {
        deployment_id: deployment!.id,
        pr_id: prId,
        environment,
        app_name: appName,
        previous_version_tag: out.previous_version_tag,
        migrations_dry_run: out.migrations_dry_run,
        rollback_plan_markdown: out.rollback_plan_markdown,
        monitoring_plan: out.monitoring_plan,
        deploy_window: out.deploy_window,
        go_no_go: finalGoNoGo,
        blockers: finalBlockers,
        requires_typed_confirmation: environment === "production",
        typed_confirmation_phrase: environment === "production"
          ? `DEPLOY ${appName.toUpperCase()}`
          : null,
      },
      context: {
        risk_assessment: out.risk_assessment,
        window_blocked_by_server: windowCheck.blocked,
        server_overrode_go: out.go_no_go === "go" && finalGoNoGo === "no_go",
        model,
      },
      status: "proposed",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`action: ${aErr.message}`);

  await supabaseAdmin
    .from("asvc_deployments")
    .update({ related_action_id: action!.id })
    .eq("id", deployment!.id);

  await supabaseAdmin.rpc("asvc_log_audit", {
    p_actor_type: "agent",
    p_actor_id: "devops_release",
    p_event_type: "deployment_prepared",
    p_resource_type: "asvc_deployments",
    p_resource_id: deployment!.id,
    p_payload: {
      action_id: action!.id,
      environment,
      app_name: appName,
      go_no_go: finalGoNoGo,
      tokens_used: tokensUsed,
    },
  });

  return {
    actionId: action!.id,
    deploymentId: deployment!.id,
    environment,
    goNoGo: finalGoNoGo,
    blockers: finalBlockers,
    tokensUsed,
  };
}
