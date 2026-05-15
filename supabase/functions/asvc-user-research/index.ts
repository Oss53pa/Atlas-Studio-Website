// ASVC v2.0 — User Research Agent endpoint.
// POST /asvc-user-research { opportunity_id }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { conductResearch } from "../_shared/asvc/user-research.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { opportunity_id?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.opportunity_id) return errorResponse("opportunity_id requis", 400);

  try {
    const result = await conductResearch(body.opportunity_id);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "user_research_triggered",
      p_resource_type: "asvc_opportunities",
      p_resource_id: body.opportunity_id,
      p_payload: { action_id: result.actionId, recommendation: result.recommendation },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`research failed: ${(err as Error).message}`);
  }
});
