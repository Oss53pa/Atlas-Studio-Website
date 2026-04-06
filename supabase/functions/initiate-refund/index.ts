import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { transaction_id, refund_type, refund_amount_fcfa, reason } = await req.json();

    const { data: txn } = await supabaseAdmin.from("payment_transactions").select("*").eq("id", transaction_id).single();
    if (!txn || txn.status !== "success") return new Response(JSON.stringify({ error: "Transaction non remboursable" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const amount = refund_type === "full" ? txn.amount_fcfa : (refund_amount_fcfa || 0);

    await supabaseAdmin.from("payment_transactions").update({
      status: refund_type === "full" ? "refunded" : "partial_refund",
      refund_amount_fcfa: amount, refund_reason: reason,
      refunded_at: new Date().toISOString(), refunded_by: user.id,
    }).eq("id", transaction_id);

    // If full refund, suspend the linked licence
    if (refund_type === "full" && txn.subscription_id) {
      await supabaseAdmin.from("licences").update({ status: "suspended", suspended_at: new Date().toISOString(), suspension_reason: "Remboursement total" }).eq("subscription_id", txn.subscription_id);
    }

    await supabaseAdmin.from("licence_audit_log").insert({ actor_id: user.id, actor_type: "pamela", action: "refund_initiated", details: { transaction_id, amount, reason, type: refund_type } });

    return new Response(JSON.stringify({ success: true, refunded: amount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
