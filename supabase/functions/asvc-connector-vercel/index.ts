// ASVC — Connecteur Vercel.
//
// POST /asvc-connector-vercel { action_id, account?: string }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_types supportés :
//   - deploy_to_preview : récupère le dernier preview READY pour la branche +
//                         met à jour asvc_deployments avec l'URL réelle
//   - deploy_to_staging : idem (Vercel ne distingue pas staging par défaut;
//                         on traite comme un preview validé)
//   - deploy_to_production : PROMEUT un preview existant en production
//
// Note: deploy_to_production exige que la PR ait été approuvée preview par CEO
// (vérifié dans devops-release.ts). Le connecteur ne re-vérifie pas les gates;
// il les a déjà passés au stade prepareDeployment.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import {
  fetchVercelPat,
  getDefaultVercelAccount,
  getProject,
  findLatestReadyDeployment,
  promoteDeployment,
  getDeployment,
} from "../_shared/asvc/vercel.ts";

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
  vercel_deployment_id: string | null;
  deployment_url: string | null;
}

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

  const account = body.account ?? (await getDefaultVercelAccount());
  if (!account) {
    return errorResponse(
      "Aucun compte Vercel connecté. Configure le PAT dans /admin/asvc/connectors",
      400,
    );
  }
  const creds = await fetchVercelPat(account);
  if (!creds) {
    return errorResponse(`Compte Vercel "${account}" introuvable`, 400);
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
    .select("id, pr_id, app_name, environment, vercel_deployment_id, deployment_url")
    .eq("id", deploymentId)
    .single();
  if (depErr || !depData) {
    return errorResponse(`Deployment ASVC introuvable: ${depErr?.message ?? deploymentId}`, 404);
  }
  const dep = depData as DeploymentRow;

  // Charge la branche depuis la PR liée (si applicable)
  let branchName: string | null = null;
  if (dep.pr_id) {
    const { data: pr } = await supabaseAdmin
      .from("asvc_code_pull_requests")
      .select("branch_name")
      .eq("id", dep.pr_id)
      .maybeSingle();
    branchName = (pr?.branch_name as string | null) ?? null;
  }

  try {
    switch (action.action_type) {
      case "deploy_to_preview":
      case "deploy_to_staging": {
        if (!branchName) {
          return errorResponse(
            "Aucune branche associée à cette PR — preview Vercel introuvable",
            400,
          );
        }

        // Vercel auto-déploie sur chaque push → on cherche le dernier preview READY
        const found = await findLatestReadyDeployment(creds.token, appName, branchName, creds.teamId);
        if (!found) {
          return errorResponse(
            `Aucun déploiement READY trouvé sur Vercel pour ${appName}/${branchName}. ` +
              `Vercel a-t-il déjà fini le build ?`,
            404,
          );
        }

        // Met à jour asvc_deployments avec l'URL réelle
        await supabaseAdmin
          .from("asvc_deployments")
          .update({
            vercel_deployment_id: found.uid,
            deployment_url: `https://${found.url}`,
            status: "success",
            approved_by_ceo: true,
            approved_at: new Date().toISOString(),
            deployed_at: new Date(found.createdAt).toISOString(),
          })
          .eq("id", deploymentId);

        // Si c'est un preview, marque aussi la PR
        if (action.action_type === "deploy_to_preview" && dep.pr_id) {
          await supabaseAdmin
            .from("asvc_code_pull_requests")
            .update({
              preview_url: `https://${found.url}`,
              status: "preview_approved",
              approved_by_ceo: true,
              approved_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", dep.pr_id);
        }

        // Marque l'action exécutée
        await supabaseAdmin
          .from("asvc_agent_actions")
          .update({
            status: "executed",
            executed_at: new Date().toISOString(),
            execution_result: {
              connector: "vercel",
              vercel_deployment_id: found.uid,
              url: `https://${found.url}`,
              from_account: account,
            },
          })
          .eq("id", body.action_id);

        await supabaseAdmin.rpc("asvc_oauth_mark_used", {
          p_provider: "vercel",
          p_account_email: account,
        });

        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: authz.isCron ? "system" : "ceo",
          p_actor_id: authz.actor,
          p_event_type: "vercel_preview_resolved",
          p_resource_type: "asvc_deployments",
          p_resource_id: deploymentId,
          p_payload: { vercel_deployment_id: found.uid, url: found.url, app: appName, branch: branchName },
        });

        return jsonResponse({
          ok: true,
          action: {
            id: body.action_id,
            vercel_deployment_id: found.uid,
            url: `https://${found.url}`,
          },
        });
      }

      case "deploy_to_production": {
        // 1. On a besoin du vercel_deployment_id du preview validé
        let previewVercelId = dep.vercel_deployment_id;

        // Si pas stocké, on tente de le retrouver via la branche
        if (!previewVercelId && branchName) {
          const found = await findLatestReadyDeployment(creds.token, appName, branchName, creds.teamId);
          previewVercelId = found?.uid ?? null;
        }

        if (!previewVercelId) {
          return errorResponse(
            "Impossible de localiser le déploiement preview validé. Lance d'abord deploy_to_preview.",
            400,
          );
        }

        // 2. Récupère le project pour avoir son ID stable
        const project = await getProject(creds.token, appName, creds.teamId);

        // 3. PROMOTE le preview en production
        await supabaseAdmin
          .from("asvc_deployments")
          .update({ status: "deploying" })
          .eq("id", deploymentId);

        await promoteDeployment(creds.token, project.id, previewVercelId, creds.teamId);

        // 4. Récupère l'état post-promote
        const finalDep = await getDeployment(creds.token, previewVercelId, creds.teamId);

        await supabaseAdmin
          .from("asvc_deployments")
          .update({
            status: "success",
            vercel_deployment_id: previewVercelId,
            deployment_url: `https://${finalDep.url}`,
            deployed_at: new Date().toISOString(),
            approved_by_ceo: true,
            approved_at: new Date().toISOString(),
          })
          .eq("id", deploymentId);

        // Marque la PR mergée + deployed si applicable
        if (dep.pr_id) {
          await supabaseAdmin
            .from("asvc_code_pull_requests")
            .update({
              status: "deployed",
              merged_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", dep.pr_id);
        }

        // Marque l'action exécutée
        await supabaseAdmin
          .from("asvc_agent_actions")
          .update({
            status: "executed",
            executed_at: new Date().toISOString(),
            execution_result: {
              connector: "vercel",
              promoted_deployment_id: previewVercelId,
              project_id: project.id,
              app_name: appName,
              url: `https://${finalDep.url}`,
              from_account: account,
            },
          })
          .eq("id", body.action_id);

        await supabaseAdmin.rpc("asvc_oauth_mark_used", {
          p_provider: "vercel",
          p_account_email: account,
        });

        await supabaseAdmin.rpc("asvc_log_audit", {
          p_actor_type: authz.isCron ? "system" : "ceo",
          p_actor_id: authz.actor,
          p_event_type: "vercel_production_deployed",
          p_resource_type: "asvc_deployments",
          p_resource_id: deploymentId,
          p_payload: {
            project_id: project.id,
            promoted_deployment_id: previewVercelId,
            app: appName,
            url: finalDep.url,
          },
        });

        return jsonResponse({
          ok: true,
          action: {
            id: body.action_id,
            app: appName,
            promoted_deployment_id: previewVercelId,
            url: `https://${finalDep.url}`,
          },
        });
      }

      default:
        return errorResponse(
          `action_type non supporté par Vercel connector: ${action.action_type}`,
          400,
        );
    }
  } catch (err) {
    const msg = (err as Error).message;
    // Si on était en train de déployer, marque le deployment 'failed'
    if (action.action_type === "deploy_to_production") {
      await supabaseAdmin
        .from("asvc_deployments")
        .update({ status: "failed" })
        .eq("id", deploymentId);
    }
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "vercel_connector_failed",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: body.action_id,
      p_payload: { error: msg, action_type: action.action_type },
    });
    return errorResponse(`Vercel connector failed: ${msg}`, 500);
  }
});
