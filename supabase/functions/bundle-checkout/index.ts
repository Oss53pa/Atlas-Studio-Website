import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripe } from "../_shared/stripe.ts";
import { initPayment } from "../_shared/cinetpay.ts";

// Checkout d'une suite (bundle). Le prix est lu en base (autoritaire) ;
// le provisioning des abonnements inclus se fait dans le webhook après paiement.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const { bundleSlug, paymentMethod } = await req.json();
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.org";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const { data: bundle, error: bErr } = await supabaseAdmin
      .from("bundles")
      .select("slug, name, price_monthly_fcfa, active")
      .eq("slug", bundleSlug)
      .single();
    if (bErr || !bundle || bundle.active === false) {
      return errorResponse("Suite introuvable", 404);
    }

    const amount = bundle.price_monthly_fcfa;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    if (paymentMethod === "cinetpay") {
      const transactionId = `cp_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
      const result = await initPayment({
        amount,
        currency: "XOF",
        transactionId,
        description: `Atlas Studio - ${bundle.name}`,
        notifyUrl: `${supabaseUrl}/functions/v1/cinetpay-webhook`,
        returnUrl: `${frontendUrl}/portal?payment=success`,
        customerName: profile?.full_name,
        customerEmail: profile?.email,
      });
      if (result.code !== "201") return errorResponse(result.message, 400);

      await supabaseAdmin.from("invoices").insert({
        invoice_number: `INV-${Date.now()}`,
        user_id: user.id,
        app_id: bundle.slug,
        plan: bundle.name,
        amount,
        bundle_slug: bundle.slug,
        currency: "XOF",
        status: "pending",
        cinetpay_transaction_id: transactionId,
        payment_method: "cinetpay",
      });

      return jsonResponse({ url: result.data.payment_url });
    }

    // Stripe
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
      unit_amount: Math.round(amount),
      currency: "xof",
      recurring: { interval: "month" },
      product_data: { name: `Atlas Studio - ${bundle.name}` },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        userId: user.id,
        type: "bundle",
        bundleSlug: bundle.slug,
      },
      success_url: `${frontendUrl}/portal?payment=success`,
      cancel_url: `${frontendUrl}/portal?payment=cancelled`,
    });

    return jsonResponse({ url: session.url });
  } catch (error: any) {
    console.error("Bundle checkout error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
