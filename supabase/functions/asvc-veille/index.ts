// ASVC v2.0 — Veille Agent endpoint.
// POST /asvc-veille { source, signal_text, source_details? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { detectOpportunity } from "../_shared/asvc/veille.ts";

const VALID_SOURCES = [
  "competitor_watch", "customer_feedback", "regulation_change",
  "market_trend", "internal_idea",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { source?: string; signal_text?: string; source_details?: Record<string, unknown> };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.source || !VALID_SOURCES.includes(body.source as typeof VALID_SOURCES[number])) {
    return errorResponse(`source invalide: ${body.source}`, 400);
  }
  if (!body.signal_text || body.signal_text.trim().length < 10) {
    return errorResponse("signal_text requis (10 chars min)", 400);
  }

  try {
    const result = await detectOpportunity({
      source: body.source as typeof VALID_SOURCES[number],
      signalText: body.signal_text.trim(),
      sourceDetails: body.source_details,
    });
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "veille_triggered",
      p_resource_type: "asvc_opportunities",
      p_resource_id: result.opportunityId,
      p_payload: { action_id: result.actionId, rice: result.riceScore },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`veille failed: ${(err as Error).message}`);
  }
});
