// ASVC v2.0 — Product Designer Agent endpoint.
// POST /asvc-product-designer { opportunity_id }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftProductSpec } from "../_shared/asvc/product-designer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { opportunity_id?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.opportunity_id) return errorResponse("opportunity_id requis", 400);

  try {
    const result = await draftProductSpec(body.opportunity_id);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "product_designer_triggered",
      p_resource_type: "asvc_product_specs",
      p_resource_id: result.specId,
      p_payload: { action_id: result.actionId, story_points: result.storyPoints },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`product designer failed: ${(err as Error).message}`);
  }
});
