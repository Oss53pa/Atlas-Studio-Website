// ASVC — SecOps Agent : endpoint de passe CTEM.
//
// POST /asvc-secops
// Auth: JWT admin OU CRON_SHARED_SECRET
// Body (tous optionnels): { scope?: string, dependencies?: string[], surface?: string[], notes?: string }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { runCtemScan, type CtemScanInput } from "../_shared/asvc/secops.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: CtemScanInput = {};
  try {
    const txt = await req.text();
    body = txt ? (JSON.parse(txt) as CtemScanInput) : {};
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  try {
    const result = await runCtemScan(body);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "ctem_scan_triggered",
      p_resource_type: "asvc_agent_actions",
      p_resource_id: result.actionId,
      p_payload: {
        posture_score: result.postureScore,
        findings_count: result.findingsCount,
        critical_count: result.criticalCount,
      },
    });

    return jsonResponse({
      ok: true,
      action: {
        id: result.actionId,
        session_id: result.sessionId,
        posture_score: result.postureScore,
        findings_count: result.findingsCount,
        critical_count: result.criticalCount,
        criticality: result.criticality,
        summary: result.summary,
        tokens_used: result.tokensUsed,
      },
    });
  } catch (err) {
    return errorResponse(`ctem scan failed: ${(err as Error).message}`);
  }
});
