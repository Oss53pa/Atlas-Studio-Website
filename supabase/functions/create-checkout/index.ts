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
    const { appId, plan, priceAmount, promoCode } = await req.json();
    const frontendUrl = Deno.env.get("FRONTEND_URL") || "https://atlas-studio.org";

    // ── Validate and apply promo code ──
    let finalPrice = priceAmount;
    let appliedDiscount = 0;
    let promoRecord: { id: string; code: string; type: string; value: number } | null = null;

    if (promoCode) {
      const { data: promo, error: promoError } = await supabaseAdmin
        .from("promo_codes")
        .select("id, code, type, value, max_uses, used_count, expires_at, active")
        .eq("code", promoCode.toUpperCase())
        .eq("active", true)
        .single();

      if (promoError || !promo) {
        return errorResponse("Code promo invalide", 400);
      }
      if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
        return errorResponse("Code promo expiré", 400);
      }
      if (promo.max_uses && promo.used_count >= promo.max_uses) {
        return errorResponse("Code promo épuisé", 400);
      }

      // Apply discount
      if (promo.type === "percentage") {
        appliedDiscount = Math.round((priceAmount * promo.value) / 100);
      } else if (promo.type === "fixed") {
        appliedDiscount = promo.value;
      }
      finalPrice = Math.max(0, priceAmount - appliedDiscount);
      promoRecord = promo;
    }

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

    // Create an ad-hoc price with discount already applied
    const price = await stripe.prices.create({
      unit_amount: Math.round(finalPrice), // XOF has no decimals
      currency: "xof",
      recurring: { interval: "month" },
      product_data: { name: `Atlas Studio - ${appId} (${plan})` },
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        userId: user.id,
        appId,
        plan,
        promoCode: promoCode || "",
        originalPrice: String(priceAmount),
        discount: String(appliedDiscount),
      },
      success_url: `${frontendUrl}/portal?payment=success`,
      cancel_url: `${frontendUrl}/portal?payment=cancelled`,
    });

    // Increment promo usage count
    if (promoRecord) {
      await supabaseAdmin.rpc("increment_promo_usage", { promo_id: promoRecord.id })
        .catch(async () => {
          // Fallback if RPC doesn't exist — direct update
          await supabaseAdmin.from("promo_codes")
            .update({ used_count: ((promoRecord as any).used_count || 0) + 1 })
            .eq("id", promoRecord.id);
        });
    }

    return jsonResponse({ url: session.url, discount: appliedDiscount, finalPrice });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
