// ASVC v2.0 — QA Agent endpoint.
// POST /asvc-qa { pr_id }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { generateQaPlan } from "../_shared/asvc/qa.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { pr_id?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.pr_id) return errorResponse("pr_id requis", 400);

  try {
    const result = await generateQaPlan(body.pr_id);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "qa_triggered",
      p_resource_type: "asvc_code_pull_requests",
      p_resource_id: body.pr_id,
      p_payload: { action_id: result.actionId, total_tests: result.totalTests },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`qa failed: ${(err as Error).message}`);
  }
});
