// ASVC — Connecteur Stripe.
//
// POST /asvc-connector-stripe { action_id, currency? }
// Auth: JWT admin OU CRON_SHARED_SECRET
//
// action_type supporté : generate_invoice_payment_link
// payload.payment_provider devrait être 'stripe' pour router ici (sinon CinetPay).

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { ensureStripePaymentLink, isStripeConfigured } from "../_shared/asvc/payments.ts";

interface Body {
  action_id?: string;
  currency?: "usd" | "eur";
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

  if (!isStripeConfigured()) {
    return errorResponse("Stripe non configuré (STRIPE_SECRET_KEY manquant)", 400);
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

  const currency = body.currency ?? (payload.currency as "usd" | "eur" | undefined) ?? "usd";

  try {
    const result = await ensureStripePaymentLink(invoiceId, currency);

    await supabaseAdmin
      .from("asvc_agent_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: {
          connector: "stripe",
          payment_url: result.payment_url,
          external_transaction_id: result.external_transaction_id,
          amount_fcfa: result.amount_fcfa,
          currency,
        },
      })
      .eq("id", body.action_id);

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "stripe_payment_link_generated",
      p_resource_type: "asvc_invoices",
      p_resource_id: invoiceId,
      p_payload: {
        action_id: body.action_id,
        external_transaction_id: result.external_transaction_id,
        amount_fcfa: result.amount_fcfa,
        currency,
      },
    });

    return jsonResponse({ ok: true, action: result });
  } catch (err) {
    const msg = (err as Error).message;
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "stripe_connector_failed",
      p_resource_type: "asvc_invoices",
      p_resource_id: invoiceId,
      p_payload: { error: msg },
    });
    return errorResponse(`Stripe connector failed: ${msg}`, 500);
  }
});
