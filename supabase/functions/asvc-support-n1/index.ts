// ASVC — Support N1 Agent: endpoint de drafting de réponse.
//
// POST /asvc-support-n1
// Auth: JWT admin OU CRON_SHARED_SECRET (pour drafting batch automatique)
// Body: { ticket_id: string }
// Réponse: { ok, action: { id, criticality, draft, escalation_reason } }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftTicketResponse } from "../_shared/asvc/support.ts";

interface Body {
  ticket_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  const ticketId = body.ticket_id;
  if (!ticketId) return errorResponse("ticket_id requis", 400);

  try {
    const result = await draftTicketResponse(ticketId);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "support_draft_triggered",
      p_resource_type: "asvc_tickets",
      p_resource_id: ticketId,
      p_payload: { action_id: result.actionId },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: result.actionId,
        ticket_id: result.ticketId,
        criticality: result.criticality,
        draft: result.draftText,
        meta: result.meta,
        escalation_reason: result.escalationReason,
        tokens_used: result.tokensUsed,
      },
    });
  } catch (err) {
    return errorResponse(`draft failed: ${(err as Error).message}`);
  }
});
