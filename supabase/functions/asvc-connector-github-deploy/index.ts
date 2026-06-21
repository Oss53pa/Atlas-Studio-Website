// ASVC — Connecteur GitHub Deploy (workflow_dispatch).
//
// POST /asvc-connector-github-deploy { action_id, account?: string }
// Auth: JWT admin OU CRON_SHARED_SECRET (authorizeRequest)
//
// Pour les apps buildées/déployées par GitHub Actions (et non Vercel) — ex:
// WeDo, dont l'APK Android est produit par le workflow `android.yml`. Déclenche
// le workflow via l'API GitHub. workflow_dispatch ne fait que LANCER le build
// (asynchrone) : on enregistre le déclenchement + le lien du run.
//
// action_types supportés : deploy_to_preview | deploy_to_staging | deploy_to_production
//
// Conventions de résolution :
//   repo     = payload.github_repo | PR.repo | 'Oss53pa/WeDo_Mobile'
//   workflow = payload.github_workflow | 'android.yml'
//   ref      = payload.github_ref | branche de la PR | 'main'

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import {
  fetchGithubPat,
  getDefaultGithubAccount,
  parseRepoSlug,
  dispatchWorkflow,
  getLatestWorkflowRun,
} from "../_shared/asvc/github.ts";

interface Body {
  action_id?: string;
  account?: string;
}

interface ActionRow {
  id: string;
  action_type: string;
  status: string;
  proposed_payload: Record<string, unknown>;
  modified_payload: Record<string, unknown> | null;
}

interface DeploymentRow {
  id: string;
  pr_id: string | null;
  app_name: string;
  environment: string;
}

const DEFAULT_REPO = "Oss53pa/WeDo_Mobile";
const DEFAULT_WORKFLOW = "android.yml";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.action_id) return errorResponse("action_id requis", 400);

  // Charge l'action
  const { data: actionData, error: actErr } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (actErr || !actionData) {
    return errorResponse(`Action introuvable: ${actErr?.message ?? body.action_id}`, 404);
  }
  const action = actionData as ActionRow;

  if (!["approved", "modified"].includes(action.status)) {
    return errorResponse(`Action non approuvée (status=${action.status})`, 400);
  }
  if (!["deploy_to_preview", "deploy_to_staging", "deploy_to_production"].includes(action.action_type)) {
    return errorResponse(`action_type non supporté par GitHub deploy: ${action.action_type}`, 400);
  }

  const payload = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;
  const deploymentId = payload.deployment_id as string | undefined;
  const appName = payload.app_name as string | undefined;
  if (!deploymentId || !appName) {
    return errorResponse("deployment_id / app_name manquants dans payload", 400);
  }

  // Charge le deployment ASVC associé
  const { data: depData, error: depErr } = await supabaseAdmin
    .from("asvc_deployments")
    .select("id, pr_id, app_name, environment")
    .eq("id", deploymentId)
    .single();
  if (depErr || !depData) {
    return errorResponse(`Deployment ASVC introuvable: ${depErr?.message ?? deploymentId}`, 404);
  }
  const dep = depData as DeploymentRow;

  // Repo + branche depuis la PR liée (si applicable)
  let prRepo: string | null = null;
  let branchName: string | null = null;
  if (dep.pr_id) {
    const { data: pr } = await supabaseAdmin
      .from("asvc_code_pull_requests")
      .select("repo, branch_name")
      .eq("id", dep.pr_id)
      .maybeSingle();
    prRepo = (pr?.repo as string | null) ?? null;
    branchName = (pr?.branch_name as string | null) ?? null;
  }

  // PAT GitHub
  const account = body.account ?? (await getDefaultGithubAccount());
  if (!account) {
    return errorResponse(
      "Aucun compte GitHub connecté. Configure le PAT (scope workflow) dans /admin/asvc/connectors",
      400,
    );
  }
  const creds = await fetchGithubPat(account);
  if (!creds) {
    return errorResponse(`Compte GitHub "${account}" introuvable`, 400);
  }

  // Résolution repo / workflow / ref
  const repoInput = (payload.github_repo as string | undefined) ?? prRepo ?? DEFAULT_REPO;
  const slug = parseRepoSlug(repoInput);
  if (!slug) {
    return errorResponse(`Repo GitHub invalide: "${repoInput}"`, 400);
  }
  const workflow = (payload.github_workflow as string | undefined) ?? DEFAULT_WORKFLOW;
  const ref =
    (payload.github_ref as string | undefined) ??
    (action.action_type === "deploy_to_production" ? "main" : branchName ?? "main");

  try {
    await supabaseAdmin
      .from("asvc_deployments")
      .update({ status: "deploying" })
      .eq("id", deploymentId);

    await dispatchWorkflow(creds.token, slug.owner, slug.repo, workflow, ref, {});

    // Best-effort : récupère le run le plus récent pour fournir un lien UI.
    const run = await getLatestWorkflowRun(creds.token, slug.owner, slug.repo, workflow);
    const runUrl = run?.html_url ?? `https://github.com/${slug.owner}/${slug.repo}/actions/workflows/${workflow}`;

    // workflow_dispatch = build asynchrone. On marque le déclenchement réussi ;
    // le suivi du build se fait dans GitHub Actions (pas de webhook retour ici).
    await supabaseAdmin
      .from("asvc_deployments")
      .update({
        status: "success",
        deployment_url: runUrl,
        deployed_at: new Date().toISOString(),
        approved_by_ceo: true,
        approved_at: new Date().toISOString(),
      })
      .eq("id", deploymentId);

    if (dep.pr_id && action.action_type === "deploy_to_production") {
      await supabaseAdmin
        .from("asvc_code_pull_requests")
        .update({ status: "deployed", updated_at: new Date().toISOString() })
        .eq("id", dep.pr_id);
    }

    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "github-deploy",
          repo: `${slug.owner}/${slug.repo}`,
          workflow,
          ref,
          run_url: runUrl,
          dispatched: true,
          note: "Build GitHub Actions déclenché (asynchrone) — suivi dans l'onglet Actions",
          from_account: account,
        },
      })
      .eq("id", body.action_id);

    // Best-effort : marque le PAT utilisé (ignore si l'RPC n'existe pas pour github).
    try {
      await supabaseAdmin.rpc("asvc_oauth_mark_used", {
        p_provider: "github",
        p_account_email: account,
      });
    } catch { /* non-critique */ }

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "github_deploy_dispatched",
      p_resource_type: "asvc_deployments",
      p_resource_id: deploymentId,
      p_payload: {
        repo: `${slug.owner}/${slug.repo}`,
        workflow,
        ref,
        app: appName,
        run_url: runUrl,
      },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: body.action_id,
        app: appName,
        repo: `${slug.owner}/${slug.repo}`,
        workflow,
        ref,
        run_url: runUrl,
      },
    });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin
      .from("asvc_deployments")
      .update({ status: "failed" })
      .eq("id", deploymentId);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "github_deploy_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg, action_type: action.action_type },
    });
    return errorResponse(`GitHub deploy failed: ${msg}`, 500);
  }
});
