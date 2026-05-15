// ASVC — SDR Agent endpoint.
// POST /asvc-sdr { lead_id, channel, step?, custom_angle? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftSdrOutreach, type SdrChannel, type SdrSequenceStep } from "../_shared/asvc/sdr.ts";

const VALID_CHANNELS: SdrChannel[] = ["email", "linkedin_dm", "whatsapp"];
const VALID_STEPS: SdrSequenceStep[] = [
  "first_touch", "follow_up_1", "follow_up_2", "breakup", "demo_invite",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { lead_id?: string; channel?: SdrChannel; step?: SdrSequenceStep; custom_angle?: string };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.lead_id) return errorResponse("lead_id requis", 400);
  if (!body.channel || !VALID_CHANNELS.includes(body.channel)) {
    return errorResponse(`channel invalide: ${body.channel}`, 400);
  }
  if (body.step && !VALID_STEPS.includes(body.step)) {
    return errorResponse(`step invalide: ${body.step}`, 400);
  }

  try {
    const result = await draftSdrOutreach({
      leadId: body.lead_id,
      channel: body.channel,
      step: body.step,
      customAngle: body.custom_angle,
    });
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "sdr_triggered",
      p_resource_type: "asvc_leads",
      p_resource_id: body.lead_id,
      p_payload: { action_id: result.actionId, channel: body.channel, step: result.step },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`sdr failed: ${(err as Error).message}`);
  }
});
