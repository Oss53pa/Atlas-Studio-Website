// ASVC — Trésorerie Agent endpoint.
// POST /asvc-treasury (no body required)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { generateTreasuryBrief } from "../_shared/asvc/treasury.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  try {
    const result = await generateTreasuryBrief();
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "treasury_triggered",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: result.actionId,
      p_payload: { weather: result.weather },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`treasury failed: ${(err as Error).message}`);
  }
});
