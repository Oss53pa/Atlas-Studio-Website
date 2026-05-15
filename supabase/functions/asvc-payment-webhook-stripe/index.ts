// ASVC — Webhook Stripe (paiement validé).
//
// POST /asvc-payment-webhook-stripe
// Auth: AUCUN — appelé par Stripe backend.
// Sécurité: vérifie la signature via stripe.webhooks.constructEventAsync
// avec ASVC_STRIPE_WEBHOOK_SECRET (distinct du STRIPE_WEBHOOK_SECRET du billing
// principal — pour éviter d'interférer avec les events de l'app principale).
//
// On filtre côté metadata: on traite UNIQUEMENT les events avec
// metadata.asvc_origin = 'facturation_agent' (set par notre Checkout Session).

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

function plain(status: number, msg: string): Response {
  return new Response(msg, { status, headers: { ...corsHeaders, "Content-Type": "text/plain" } });
}

function jsonRes(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return plain(405, "method not allowed");

  const sig = req.headers.get("stripe-signature");
  if (!sig) return plain(400, "missing stripe-signature");

  const body = await req.text();
  const webhookSecret = Deno.env.get("ASVC_STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) return plain(500, "ASVC_STRIPE_WEBHOOK_SECRET non configuré");

  // Verify signature (anti-spoof)
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return plain(400, `webhook signature failed: ${(err as Error).message}`);
  }

  // On ne traite que les events liés à ASVC (filter via metadata)
  // checkout.session.completed est le principal qui nous intéresse pour le MVP
  if (event.type !== "checkout.session.completed") {
    return jsonRes({ received: true, ignored: true, type: event.type });
  }

  const session = event.data.object as {
    id: string;
    payment_status?: string;
    amount_total?: number;
    currency?: string;
    payment_intent?: string;
    metadata?: Record<string, string>;
  };

  // Filtre: doit être originé par Facturation Agent
  if (session.metadata?.asvc_origin !== "facturation_agent") {
    return jsonRes({ received: true, ignored: true, reason: "not asvc origin" });
  }

  const invoiceId = session.metadata?.asvc_invoice_id;
  if (!invoiceId) {
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: "external",
      p_actor_id: "stripe_webhook",
      p_event_type: "stripe_webhook_missing_invoice_id",
      p_resource_type: null,
      p_resource_id: null,
      p_payload: { session_id: session.id },
    });
    return jsonRes({ received: true, ignored: true, reason: "missing asvc_invoice_id" });
  }

  if (session.payment_status !== "paid") {
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: "external",
      p_actor_id: "stripe_webhook",
      p_event_type: "stripe_webhook_unpaid",
      p_resource_type: "asvc_invoices",
      p_resource_id: invoiceId,
      p_payload: { session_id: session.id, status: session.payment_status },
    });
    return jsonRes({ received: true, status: session.payment_status });
  }

  // Convertit amount_total (centimes Stripe) → FCFA via la metadata pré-stockée
  const amountFcfa = parseInt(session.metadata?.asvc_amount_fcfa ?? "0", 10);
  const paymentMethod = `stripe_${session.currency ?? "card"}`;

  const { data: markResult, error: markErr } = await supabaseAdmin.rpc("asvc_mark_invoice_paid", {
    p_invoice_id: invoiceId,
    p_external_tx_id: session.id,
    p_amount_paid_fcfa: amountFcfa,
    p_currency: (session.currency ?? "usd").toUpperCase(),
    p_payment_method: paymentMethod,
    p_paid_date: new Date().toISOString().slice(0, 10),
    p_payload: {
      session_id: session.id,
      payment_intent: session.payment_intent,
      amount_total_cents: session.amount_total,
      currency: session.currency,
    },
  });

  if (markErr) {
    return plain(500, `mark paid failed: ${markErr.message}`);
  }

  return jsonRes({ ok: true, invoice_id: invoiceId, result: markResult });
});
