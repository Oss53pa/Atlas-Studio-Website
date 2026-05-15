// ASVC — Compta Agent endpoint.
// POST /asvc-accounting { invoice_id, flow_kind, paid_amount_fcfa? }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { suggestJournalEntry, type AccountingFlowKind } from "../_shared/asvc/accounting.ts";

const VALID_KINDS: AccountingFlowKind[] = ["invoice_issued", "invoice_paid", "invoice_partial_payment"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { invoice_id?: string; flow_kind?: AccountingFlowKind; paid_amount_fcfa?: number };
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.invoice_id) return errorResponse("invoice_id requis", 400);
  if (!body.flow_kind || !VALID_KINDS.includes(body.flow_kind)) {
    return errorResponse(`flow_kind invalide: ${body.flow_kind}`, 400);
  }

  try {
    const result = await suggestJournalEntry({
      invoiceId: body.invoice_id,
      flowKind: body.flow_kind,
      paidAmountFcfa: body.paid_amount_fcfa,
    });
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "accounting_triggered",
      p_resource_type: "asvc_invoices",
      p_resource_id: body.invoice_id,
      p_payload: { action_id: result.actionId, flow_kind: body.flow_kind, balance: result.balanceCheck },
    });
    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    return errorResponse(`accounting failed: ${(err as Error).message}`);
  }
});
