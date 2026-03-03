import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const { appId, plan, priceAmount } = await req.json();
    const frontendUrl = Deno.env.get("FRONTEND_URL")!;

    // Get or create Stripe customer
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

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

    // Create an ad-hoc price
    const price = await stripe.prices.create({
      unit_amount: Math.round(priceAmount * 100),
      currency: "xof",
      recurring: { interval: "month" },
      product_data: { name: `Atlas Studio - ${appId} (${plan})` },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: { userId: user.id, appId, plan },
      success_url: `${frontendUrl}/portal?payment=success`,
      cancel_url: `${frontendUrl}/portal?payment=cancelled`,
    });

    return jsonResponse({ url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
