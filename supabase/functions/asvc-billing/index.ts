// ASVC — Facturation Agent endpoint.
// POST /asvc-billing { invoice_id, level }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { draftInvoiceReminder, type ReminderLevel } from "../_shared/asvc/billing.ts";

const VALID_LEVELS: ReminderLevel[] = [
  "pre_due", "level_1_friendly", "level_2_firm", "level_3_formal", "level_4_final", "level_5_legal",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { invoice_id?: string; level?: ReminderLevel };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.invoice_id) return errorResponse("invoice_id requis", 400);
  if (!body.level || !VALID_LEVELS.includes(body.level)) {
    return errorResponse(`level invalide: ${body.level}`, 400);
  }

  try {
    const result = await draftInvoiceReminder(body.invoice_id, body.level);
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "billing_triggered",
      p_resource_type: "asvc_invoices",
      p_resource_id: body.invoice_id,
      p_payload: { action_id: result.actionId, level: body.level },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`billing failed: ${(err as Error).message}`);
  }
});
