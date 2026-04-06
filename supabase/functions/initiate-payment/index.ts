import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { invoice_id, method, phone_number } = await req.json();

    const { data: invoice } = await supabaseAdmin.from("invoices").select("*").eq("id", invoice_id).single();
    if (!invoice || invoice.status === "paid") return new Response(JSON.stringify({ error: "Facture introuvable ou déjà payée" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Generate session token
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), v => chars[v % chars.length]).join("");
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sessionToken));
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: session } = await supabaseAdmin.from("payment_sessions").insert({
      tenant_id: invoice.user_id, invoice_id,
      amount_fcfa: invoice.amount || 0,
      description: `Atlas Studio — ${invoice.invoice_number || invoice.id}`,
      session_token: sessionToken, session_token_hash: tokenHash,
      selected_method: method,
      expires_at: new Date(Date.now() + 30 * 60000).toISOString(),
    }).select().single();

    const { data: txn } = await supabaseAdmin.from("payment_transactions").insert({
      tenant_id: invoice.user_id, invoice_id, subscription_id: invoice.subscription_id,
      amount_fcfa: invoice.amount || 0, method, status: "pending",
      phone_number, provider: "cinetpay", initiated_at: new Date().toISOString(),
      customer_ip: req.headers.get("x-forwarded-for") || "",
    }).select().single();

    if (session && txn) {
      await supabaseAdmin.from("payment_sessions").update({ transaction_id: txn.id }).eq("id", session.id);
    }

    // In production, call CinetPay API here
    const paymentUrl = `https://checkout.cinetpay.com/payment/${session?.id}`;

    return new Response(JSON.stringify({ session_id: session?.id, session_token: sessionToken, transaction_id: txn?.id, payment_url: paymentUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
