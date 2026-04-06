import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json();

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

      // Trigger licence generation
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-licence`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ invoice_id: session.invoice_id }),
        });
      } catch { /* licence generation is best-effort from webhook */ }
    }

    await supabaseAdmin.from("payment_webhooks").update({ processed: true, transaction_id: session.transaction_id, signature_valid: true, processed_at: new Date().toISOString() }).eq("id", log?.id);

    return new Response("OK", { status: 200 });
  } catch (err) {
    return new Response("Error: " + (err as Error).message, { status: 500 });
  }
});
