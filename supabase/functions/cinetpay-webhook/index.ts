import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { verifyPayment } from "../_shared/cinetpay.ts";

Deno.serve(async (req) => {
  try {
    const { cpm_trans_id } = await req.json();

    if (!cpm_trans_id) {
      return errorResponse("Transaction ID manquant", 400);
    }

    const verification = await verifyPayment(cpm_trans_id);

    if (verification.code === "00" && verification.data.status === "ACCEPTED") {
      const { data: invoice } = await supabaseAdmin
        .from("invoices")
        .select("*")
        .eq("cinetpay_transaction_id", cpm_trans_id)
        .single();

      if (invoice) {
        await supabaseAdmin.from("invoices").update({
          status: "paid",
          paid_at: new Date().toISOString(),
        }).eq("id", invoice.id);

        if (invoice.subscription_id) {
          await supabaseAdmin.from("subscriptions").update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          }).eq("id", invoice.subscription_id);
        } else {
          await supabaseAdmin.from("subscriptions").insert({
            user_id: invoice.user_id,
            app_id: invoice.app_id,
            plan: invoice.plan,
            status: "active",
            price_at_subscription: invoice.amount,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }

        await supabaseAdmin.from("activity_log").insert({
          user_id: invoice.user_id,
          action: "payment_completed",
          metadata: { appId: invoice.app_id, plan: invoice.plan, amount: invoice.amount, provider: "cinetpay" },
        });
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("CinetPay webhook error:", error);
    return errorResponse("Webhook processing failed");
  }
});
