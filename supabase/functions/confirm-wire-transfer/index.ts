import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { transaction_id, bank_reference, received_amount, notes } = await req.json();

    const { data: txn } = await supabaseAdmin.from("payment_transactions").select("*").eq("id", transaction_id).single();
    if (!txn) return new Response(JSON.stringify({ error: "Transaction introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabaseAdmin.from("payment_transactions").update({
      status: "success", wire_confirmed_by: user.id, wire_confirmed_at: new Date().toISOString(),
      wire_reference: bank_reference, net_amount_fcfa: received_amount || txn.amount_fcfa,
      confirmed_at: new Date().toISOString(),
    }).eq("id", transaction_id);

    // Update invoice
    if (txn.invoice_id) {
      await supabaseAdmin.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", txn.invoice_id);
    }

    // Trigger licence generation
    if (txn.invoice_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      try {
        await fetch(`${supabaseUrl}/functions/v1/generate-licence`, {
          method: "POST",
          headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ invoice_id: txn.invoice_id }),
        });
      } catch { /* best-effort */ }
    }

    // Audit
    await supabaseAdmin.from("licence_audit_log").insert({ actor_id: user.id, actor_type: "pamela", action: "wire_transfer_confirmed", details: { transaction_id, amount: received_amount, notes } });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
