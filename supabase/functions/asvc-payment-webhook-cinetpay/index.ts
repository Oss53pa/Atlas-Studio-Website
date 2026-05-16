// ASVC — Webhook CinetPay (paiement validé).
//
// POST /asvc-payment-webhook-cinetpay
// Auth: AUCUN — appelé par CinetPay backend (server-to-server).
// Sécurité: vérifie l'événement en rappellant CinetPay verifyPayment(tx_id)
// avant toute mise à jour. Aucun donnée du body n'est crue sans cette
// vérif aller-retour côté CinetPay.
//
// Body CinetPay typique (form-data):
//   - cpm_trans_id : transaction_id que NOUS avons généré (asvc-<invoice_num>-<ts>)
//   - cpm_site_id : doit matcher CINETPAY_SITE_ID
//   - cpm_amount : montant
//   - cpm_currency : XOF
//   - cpm_result : code (0 = succès, autre = erreur)
//
// Mais on ne fait CONFIANCE qu'à la verification API.

import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyPayment } from "../_shared/cinetpay.ts";

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

  // Parse body (form-data OR JSON)
  let txId: string | undefined;
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const j = await req.json();
      txId = j?.cpm_trans_id ?? j?.transaction_id;
    } else {
      const form = await req.formData();
      txId = form.get("cpm_trans_id")?.toString();
    }
  } catch {
    return plain(400, "invalid body");
  }
  if (!txId) return plain(400, "missing cpm_trans_id");

  // Vérifie via CinetPay verifyPayment (round-trip authoritative)
  let verifyData;
  try {
    const verify = await verifyPayment(txId);
    if (verify.code !== "00" || verify.data?.status !== "ACCEPTED") {
      // Paiement non confirmé / refusé — log mais ne marque pas paid
      await supabaseAdmin.rpc("asvc_log_audit", {
        p_actor_type: "external",
        p_actor_id: "cinetpay_webhook",
        p_event_type: "cinetpay_webhook_unconfirmed",
        p_resource_type: null,
        p_resource_id: null,
        p_payload: { tx_id: txId, code: verify.code, status: verify.data?.status },
      });
      return jsonRes({ ok: false, status: verify.data?.status, code: verify.code });
    }
    verifyData = verify.data;
  } catch (e) {
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: "external",
      p_actor_id: "cinetpay_webhook",
      p_event_type: "cinetpay_webhook_verify_failed",
      p_resource_type: null,
      p_resource_id: null,
      p_payload: { tx_id: txId, error: (e as Error).message },
    });
    return plain(500, "verify failed");
  }

  // Trouve l'invoice par transaction_id
  const { data: invoiceId } = await supabaseAdmin.rpc("asvc_find_invoice_by_tx", { p_tx: txId });
  if (!invoiceId) {
    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: "external",
      p_actor_id: "cinetpay_webhook",
      p_event_type: "cinetpay_webhook_invoice_not_found",
      p_resource_type: null,
      p_resource_id: null,
      p_payload: { tx_id: txId },
    });
    return jsonRes({ ok: false, error: "invoice not found" }, 404);
  }

  // Marque paid (idempotent via RPC)
  const amountFcfa = parseInt(verifyData?.amount ?? "0", 10);
  const paymentMethod = verifyData?.payment_method
    ? `cinetpay_${verifyData.payment_method.toLowerCase()}`
    : "cinetpay";

  const { data: markResult, error: markErr } = await supabaseAdmin.rpc("asvc_mark_invoice_paid", {
    p_invoice_id: invoiceId,
    p_external_tx_id: txId,
    p_amount_paid_fcfa: amountFcfa,
    p_currency: verifyData?.currency ?? "XOF",
    p_payment_method: paymentMethod,
    p_paid_date: verifyData?.payment_date
      ? new Date(verifyData.payment_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    p_payload: verifyData as unknown as Record<string, unknown>,
  });

  if (markErr) {
    return plain(500, `mark paid failed: ${markErr.message}`);
  }

  return jsonRes({ ok: true, invoice_id: invoiceId, result: markResult });
});
