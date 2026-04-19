import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyPayment } from "../_shared/cinetpay.ts";
import { createLicenceAfterPayment } from "../_shared/licence-helpers.ts";

// CinetPay IPN signature (x-token header) = HMAC SHA256 of a specific field
// concatenation with the merchant secret. See CinetPay V2 IPN docs.
async function verifyCinetPaySignature(payload: Record<string, unknown>, token: string | null): Promise<boolean> {
  const secret = Deno.env.get("CINETPAY_SECRET_KEY");
  if (!secret) {
    console.warn("[cinetpay-webhook] CINETPAY_SECRET_KEY not set — signature check skipped");
    return true; // backward compatibility; prefer setting the env var
  }
  if (!token) return false;
  const fields = [
    "cpm_site_id", "cpm_trans_id", "cpm_trans_date", "cpm_amount", "cpm_currency",
    "signature", "payment_method", "cel_phone_num", "cpm_phone_prefixe",
    "cpm_language", "cpm_version", "cpm_payment_config", "cpm_page_action",
    "cpm_custom", "cpm_designation", "cpm_error_message",
  ];
  const data = fields.map(k => String(payload[k] ?? "")).join("");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
  return sigHex.toLowerCase() === token.toLowerCase();
}

Deno.serve(async (req) => {
  try {
    const rawText = await req.text();
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawText);
    } catch {
      // CinetPay IPN can also arrive as x-www-form-urlencoded
      payload = Object.fromEntries(new URLSearchParams(rawText));
    }

    const token = req.headers.get("x-token");
    const validSig = await verifyCinetPaySignature(payload, token);
    if (!validSig) {
      console.warn("[cinetpay-webhook] signature invalide", { token, keys: Object.keys(payload) });
      return errorResponse("Invalid signature", 401);
    }

    const cpm_trans_id = payload.cpm_trans_id as string | undefined;
    if (!cpm_trans_id) return errorResponse("Transaction ID manquant", 400);

    // Idempotence: skip if we already flagged this transaction as paid
    const { data: already } = await supabaseAdmin
      .from("invoices")
      .select("id, status")
      .eq("cinetpay_transaction_id", cpm_trans_id)
      .maybeSingle();
    if (already?.status === "paid") {
      return jsonResponse({ received: true, deduped: true });
    }

    const verification = await verifyPayment(cpm_trans_id);
    if (verification.code !== "00" || verification.data.status !== "ACCEPTED") {
      return jsonResponse({ received: true, status: verification.data?.status || "pending" });
    }

    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("*")
      .eq("cinetpay_transaction_id", cpm_trans_id)
      .single();
    if (!invoice) return jsonResponse({ received: true, status: "no_invoice" });

    await supabaseAdmin.from("invoices").update({
      status: "paid",
      paid_at: new Date().toISOString(),
    }).eq("id", invoice.id);

    let subscriptionIdForLicence: string | null = invoice.subscription_id || null;
    if (invoice.subscription_id) {
      await supabaseAdmin.from("subscriptions").update({
        status: "active",
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
        cancelled_at: null,
        updated_at: new Date().toISOString(),
      }).eq("id", invoice.subscription_id);
    } else {
      const { data: newSub } = await supabaseAdmin.from("subscriptions").insert({
        user_id: invoice.user_id,
        app_id: invoice.app_id,
        plan: invoice.plan,
        status: "active",
        price_at_subscription: invoice.amount,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      }).select("id").single();
      subscriptionIdForLicence = newSub?.id || null;
    }

    await supabaseAdmin.from("activity_log").insert({
      user_id: invoice.user_id,
      action: "payment_completed",
      metadata: { appId: invoice.app_id, plan: invoice.plan, amount: invoice.amount, provider: "cinetpay" },
    });

    // Licence generation — best effort, does not block the response
    if (subscriptionIdForLicence && invoice.user_id && invoice.app_id && invoice.plan) {
      const licResult = await createLicenceAfterPayment({
        userId: invoice.user_id,
        appSlug: invoice.app_id,
        planName: invoice.plan,
        subscriptionId: subscriptionIdForLicence,
      });
      if (licResult) console.log("[cinetpay-webhook] licence created", licResult.licenceId);
      else console.warn("[cinetpay-webhook] licence skipped", invoice.user_id, invoice.app_id, invoice.plan);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("CinetPay webhook error:", error);
    return errorResponse("Webhook processing failed");
  }
});
