// ASVC v2.0 — DevOps/Release Agent endpoint.
// POST /asvc-devops-release { pr_id, environment, app_name }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { prepareDeployment, type DeployEnvironment } from "../_shared/asvc/devops-release.ts";

const VALID_ENVS: DeployEnvironment[] = ["preview", "staging", "production"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { pr_id?: string; environment?: DeployEnvironment; app_name?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.pr_id) return errorResponse("pr_id requis", 400);
  if (!body.environment || !VALID_ENVS.includes(body.environment)) {
    return errorResponse(`environment invalide: ${body.environment}`, 400);
  }
  if (!body.app_name) return errorResponse("app_name requis", 400);

  try {
    const result = await prepareDeployment(body.pr_id, body.environment, body.app_name);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "devops_triggered",
      p_resource_type: "asvc_deployments",
      p_resource_id: result.deploymentId,
      p_payload: { action_id: result.actionId, environment: result.environment, go_no_go: result.goNoGo },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`devops failed: ${(err as Error).message}`);
  }
});
