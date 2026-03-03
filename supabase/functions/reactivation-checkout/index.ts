import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";
import { initPayment } from "../_shared/cinetpay.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const { subscriptionId, paymentMethod } = await req.json();
    const frontendUrl = Deno.env.get("FRONTEND_URL")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", user.id)
      .single();

    if (!sub) return errorResponse("Abonnement introuvable", 404);

    if (paymentMethod === "cinetpay") {
      const transactionId = `react_${crypto.randomUUID().replace(/-/g, "").slice(0, 18)}`;
      const { data: profile } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", user.id).single();

      const result = await initPayment({
        amount: sub.price_at_subscription,
        currency: "XOF",
        transactionId,
        description: `Reactivation - ${sub.app_id} (${sub.plan})`,
        notifyUrl: `${supabaseUrl}/functions/v1/cinetpay-webhook`,
        returnUrl: `${frontendUrl}/portal?payment=success`,
        customerName: profile?.full_name,
        customerEmail: profile?.email,
      });

      if (result.code !== "201") return errorResponse(result.message, 400);

      await supabaseAdmin.from("invoices").insert({
        invoice_number: `INV-${Date.now()}`,
        user_id: user.id,
        subscription_id: sub.id,
        app_id: sub.app_id,
        plan: sub.plan,
        amount: sub.price_at_subscription,
        currency: "XOF",
        status: "pending",
        cinetpay_transaction_id: transactionId,
        payment_method: "cinetpay",
      });

      return jsonResponse({ url: result.data.payment_url });
    }

    // Default: Stripe
    const { data: profile } = await supabaseAdmin.from("profiles").select("stripe_customer_id, email, full_name").eq("id", user.id).single();
    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.full_name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
    }

    const price = await stripe.prices.create({
      unit_amount: Math.round(sub.price_at_subscription * 100),
      currency: "xof",
      recurring: { interval: "month" },
      product_data: { name: `Atlas Studio - ${sub.app_id} (${sub.plan})` },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { userId: user.id, appId: sub.app_id, plan: sub.plan, subscriptionId: sub.id, type: "reactivation" },
      success_url: `${frontendUrl}/portal?payment=success`,
      cancel_url: `${frontendUrl}/portal?payment=cancelled`,
    });

    return jsonResponse({ url: session.url });
  } catch (error: any) {
    console.error("Reactivation error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
