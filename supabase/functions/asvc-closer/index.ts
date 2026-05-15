// ASVC — Closer Agent endpoint.
// POST /asvc-closer { lead_id }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftProposal } from "../_shared/asvc/closer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { lead_id?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.lead_id) return errorResponse("lead_id requis", 400);

  try {
    const result = await draftProposal(body.lead_id);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "closer_triggered",
      p_resource_type: "asvc_leads",
      p_resource_id: body.lead_id,
      p_payload: { action_id: result.actionId },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`closer failed: ${(err as Error).message}`);
  }
});
