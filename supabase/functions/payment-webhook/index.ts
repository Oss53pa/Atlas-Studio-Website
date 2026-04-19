import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { createLicenceAfterPayment } from "../_shared/licence-helpers.ts";

async function verifyCinetPaySignature(payload: Record<string, unknown>, token: string | null): Promise<boolean> {
  const secret = Deno.env.get("CINETPAY_SECRET_KEY");
  if (!secret) return true; // backward compat; set this env to enforce
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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json();

    // Signature check (skipped silently if CINETPAY_SECRET_KEY is unset)
    const validSig = await verifyCinetPaySignature(payload, req.headers.get("x-token"));
    if (!validSig) return new Response("Invalid signature", { status: 401 });

    // Log raw webhook
    const { data: log } = await supabaseAdmin.from("payment_webhooks").insert({
      provider: "cinetpay", event_type: payload.cpm_trans_status || payload.status,
      raw_payload: payload, headers: Object.fromEntries(req.headers.entries()), received_at: new Date().toISOString(),
    }).select().single();

    const sessionId = payload.metadata?.session_id || payload.cpm_custom;
    if (!sessionId) return new Response("No session", { status: 200 });

    // Idempotency check
    if (payload.cpm_trans_id) {
      const { data: existing } = await supabaseAdmin.from("payment_transactions").select("id, status").eq("provider_transaction_id", payload.cpm_trans_id).single();
      if (existing?.status === "success") {
        await supabaseAdmin.from("payment_webhooks").update({ processed: true, processed_at: new Date().toISOString() }).eq("id", log?.id);
        return new Response("Already processed", { status: 200 });
      }
    }

    const { data: session } = await supabaseAdmin.from("payment_sessions").select("*").eq("id", sessionId).single();
    if (!session) return new Response("Session not found", { status: 200 });

    const isSuccess = payload.cpm_trans_status === "00" || payload.status === "ACCEPTED";
    const feeRate = 0.025;
    const fees = Math.round((session.amount_fcfa || 0) * feeRate);

    await supabaseAdmin.from("payment_transactions").update({
      status: isSuccess ? "success" : "failed",
      provider_transaction_id: payload.cpm_trans_id || payload.transaction_id,
      provider_reference: payload.cpm_payment_id,
      provider_raw_response: payload,
      phone_number: payload.cel_phone_num,
      phone_operator: payload.cpm_payment_config,
      fees_fcfa: isSuccess ? fees : 0,
      net_amount_fcfa: isSuccess ? (session.amount_fcfa || 0) - fees : 0,
      confirmed_at: isSuccess ? new Date().toISOString() : null,
      failed_at: isSuccess ? null : new Date().toISOString(),
    }).eq("id", session.transaction_id);

    if (isSuccess) {
      await supabaseAdmin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", session.invoice_id);
      await supabaseAdmin.from("payment_sessions").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", session.id);

      // Licence generation via shared helper (resolves app_slug + plan_name to UUIDs)
      const { data: inv } = await supabaseAdmin
        .from("invoices")
        .select("user_id, app_id, plan, subscription_id")
        .eq("id", session.invoice_id)
        .maybeSingle();
      if (inv?.user_id && inv.app_id && inv.plan && inv.subscription_id) {
        const licResult = await createLicenceAfterPayment({
          userId: inv.user_id,
          appSlug: inv.app_id,
          planName: inv.plan,
          subscriptionId: inv.subscription_id,
        });
        if (licResult) console.log("[payment-webhook] licence created", licResult.licenceId);
        else console.warn("[payment-webhook] licence skipped for invoice", session.invoice_id);
      }
    }

    await supabaseAdmin.from("payment_webhooks").update({ processed: true, transaction_id: session.transaction_id, signature_valid: true, processed_at: new Date().toISOString() }).eq("id", log?.id);

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Error: " + (err as Error).message, { status: 500 });
  }
});
