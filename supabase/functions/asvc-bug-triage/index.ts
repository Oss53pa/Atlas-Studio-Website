// ASVC — Bug Triage Agent: endpoint de qualification.
//
// POST /asvc-bug-triage
// Auth: JWT admin OU CRON_SHARED_SECRET
// Body: { ticket_id: string }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { triageBug } from "../_shared/asvc/bug-triage.ts";

interface Body {
  ticket_id?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

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
    const result = await triageBug(ticketId);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "bug_triage_triggered",
      p_resource_type: "asvc_tickets",
      p_resource_id: ticketId,
      p_payload: { action_id: result.actionId, severity: result.severity },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: result.actionId,
        ticket_id: result.ticketId,
        severity: result.severity,
        app_slug: result.appSlug,
        title: result.issueTitle,
        issue_markdown: result.issueMarkdown,
        labels: result.labels,
        reproduction_confidence: result.reproductionConfidence,
        suspected_component: result.suspectedComponent,
        tokens_used: result.tokensUsed,
      },
    });
  } catch (err) {
    return errorResponse(`bug triage failed: ${(err as Error).message}`);
  }
});
