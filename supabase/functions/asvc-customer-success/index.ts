// ASVC — Customer Success Agent: endpoint draft outreach.
//
// POST /asvc-customer-success
// Auth: JWT admin OU CRON_SHARED_SECRET
// Body: { client_id: string, goal: "onboarding_d1"|"onboarding_d7"|"onboarding_d30"|"trial_ending"|"churn_check"|"upsell" }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftCustomerOutreach, type OutreachGoal } from "../_shared/asvc/customer-success.ts";

interface Body {
  client_id?: string;
  goal?: OutreachGoal;
}

const VALID_GOALS: OutreachGoal[] = [
  "onboarding_d1",
  "onboarding_d7",
  "onboarding_d30",
  "trial_ending",
  "churn_check",
  "upsell",
];

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
  if (!body.client_id) return errorResponse("client_id requis", 400);
  if (!body.goal || !VALID_GOALS.includes(body.goal)) {
    return errorResponse(`goal invalide: ${body.goal}`, 400);
  }

  try {
    const result = await draftCustomerOutreach(body.client_id, body.goal);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "customer_success_triggered",
      p_resource_type: "profiles",
      p_resource_id: body.client_id,
      p_payload: { action_id: result.actionId, goal: body.goal },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: result.actionId,
        client_id: result.clientId,
        goal: result.goal,
        subject: result.subject,
        body: result.body,
        rationale: result.rationale,
        tokens_used: result.tokensUsed,
      },
    });
  } catch (err) {
    return errorResponse(`outreach failed: ${(err as Error).message}`);
  }
});
