import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return errorResponse("Missing stripe-signature", 400);

  const body = await req.text();
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature failed:", err.message);
    return errorResponse(`Webhook Error: ${err.message}`, 400);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const { userId, appId, plan, subscriptionId, type } = session.metadata || {};

        if (type === "regularization" && subscriptionId) {
          await supabaseAdmin.from("subscriptions").update({
            status: "active",
            stripe_subscription_id: session.subscription as string,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", subscriptionId);
        } else if (type === "reactivation" && subscriptionId) {
          await supabaseAdmin.from("subscriptions").update({
            status: "active",
            stripe_subscription_id: session.subscription as string,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
            cancelled_at: null,
            updated_at: new Date().toISOString(),
          }).eq("id", subscriptionId);
        } else if (userId && appId && plan) {
          await supabaseAdmin.from("subscriptions").insert({
            user_id: userId,
            app_id: appId,
            plan,
            status: "active",
            stripe_subscription_id: session.subscription as string,
            price_at_subscription: (session.amount_total || 0) / 100,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          });
        }

        if (userId && appId) {
          await supabaseAdmin.from("invoices").insert({
            invoice_number: `INV-${Date.now()}`,
            user_id: userId,
            app_id: appId,
            plan: plan || "unknown",
            amount: (session.amount_total || 0) / 100,
            currency: "XOF",
            status: "paid",
            paid_at: new Date().toISOString(),
            stripe_payment_intent_id: session.payment_intent as string,
            payment_method: "stripe",
          });
        }

        await supabaseAdmin.from("activity_log").insert({
          user_id: userId || null,
          action: "payment_completed",
          metadata: { appId, plan, amount: (session.amount_total || 0) / 100, provider: "stripe" },
        });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subRef = (invoice as any).parent?.subscription_details?.subscription;
        const subId = typeof subRef === "string" ? subRef : subRef?.id;
        if (subId) {
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          await supabaseAdmin.from("subscriptions").update({
            current_period_start: new Date((stripeSub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((stripeSub as any).current_period_end * 1000).toISOString(),
            status: "active",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subRef2 = (invoice as any).parent?.subscription_details?.subscription;
        const subId = typeof subRef2 === "string" ? subRef2 : subRef2?.id;
        if (subId) {
          await supabaseAdmin.from("subscriptions").update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          }).eq("stripe_subscription_id", subId);

          await supabaseAdmin.from("activity_log").insert({
            action: "payment_failed",
            metadata: { stripe_subscription_id: subId, provider: "stripe" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        await supabaseAdmin.from("subscriptions").update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", subscription.id);
        break;
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    return errorResponse("Webhook processing failed");
  }
});
