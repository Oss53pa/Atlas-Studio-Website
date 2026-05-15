// ASVC — Connecteur CinetPay.
//
// POST /asvc-connector-cinetpay { action_id }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_types supportés :
//   - generate_invoice_payment_link : génère un lien CinetPay pour une invoice
//
// Note: c'est aussi utilisé "en tant que side-effect" par le Gmail connector
// (cf gmail.ts modifié pour append payment URL si invoice + CinetPay dispo).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { ensureCinetpayPaymentLink, isCinetpayConfigured } from "../_shared/asvc/payments.ts";

interface Body {
  action_id?: string;
}

interface ActionRow {
  id: string;
  action_type: string;
  status: string;
  proposed_payload: Record<string, unknown>;
  modified_payload: Record<string, unknown> | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: Body;
  try { body = await req.json(); } catch { return errorResponse("Body JSON invalide", 400); }
  if (!body.action_id) return errorResponse("action_id requis", 400);

  if (!isCinetpayConfigured()) {
    return errorResponse(
      "CinetPay non configuré (CINETPAY_API_KEY / CINETPAY_SITE_ID manquants)",
      400,
    );
  }

  const { data, error } = await supabaseAdmin
    .from("asvc_agent_actions")
    .select("id, action_type, status, proposed_payload, modified_payload")
    .eq("id", body.action_id)
    .single();
  if (error || !data) {
    return errorResponse(`Action introuvable: ${error?.message ?? body.action_id}`, 404);
  }
  const action = data as ActionRow;

  if (!["approved", "modified"].includes(action.status)) {
    return errorResponse(`Action non approuvée (status=${action.status})`, 400);
  }

  if (action.action_type !== "generate_invoice_payment_link") {
    return errorResponse(`action_type non supporté: ${action.action_type}`, 400);
  }

  const payload = (action.modified_payload ?? action.proposed_payload) as Record<string, unknown>;
  const invoiceId = payload.invoice_id as string | undefined;
  if (!invoiceId) return errorResponse("invoice_id manquant dans payload", 400);

  try {
    const result = await ensureCinetpayPaymentLink(invoiceId);

    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "cinetpay",
          payment_url: result.payment_url,
          external_transaction_id: result.external_transaction_id,
          amount_fcfa: result.amount_fcfa,
        },
      })
      .eq("id", body.action_id);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "cinetpay_payment_link_generated",
      p_resource_type: "asvc_invoices",
      p_resource_id: invoiceId,
      p_payload: {
        action_id: body.action_id,
        external_transaction_id: result.external_transaction_id,
        amount_fcfa: result.amount_fcfa,
      },
    });

    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "cinetpay_connector_failed",
      p_resource_type: "asvc_invoices",
      p_resource_id: invoiceId,
      p_payload: { error: msg },
    });
    return errorResponse(`CinetPay connector failed: ${msg}`, 500);
  }
});
