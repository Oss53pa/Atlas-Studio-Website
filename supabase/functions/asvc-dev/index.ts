// ASVC v2.0 — Dev Agent endpoint.
// POST /asvc-dev { spec_id, repo }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftPullRequestPlan } from "../_shared/asvc/dev.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { spec_id?: string; repo?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.spec_id) return errorResponse("spec_id requis", 400);
  if (!body.repo || !body.repo.includes("/")) {
    return errorResponse("repo requis (format owner/name)", 400);
  }

  try {
    const result = await draftPullRequestPlan(body.spec_id, body.repo);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "dev_triggered",
      p_resource_type: "asvc_code_pull_requests",
      p_resource_id: result.prId,
      p_payload: { action_id: result.actionId, branch: result.branchName },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`dev failed: ${(err as Error).message}`);
  }
});
