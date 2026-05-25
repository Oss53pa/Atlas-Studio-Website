import { supabaseAdmin } from "./supabase.ts";
import { computePlanAmount } from "./pricing.ts";
import { createLicenceAfterPayment } from "./licence-helpers.ts";

interface BundleIncluded {
  app_id: string;
  app: string;
  plan: string;
  seats: number;
}

// Provisionne tous les abonnements d'une suite après paiement.
// Le prix de la suite est réparti proportionnellement au prix mensuel
// standalone de chaque app incluse (somme des parts = prix suite → MRR juste).
// Une app déjà active pour l'utilisateur n'est pas re-provisionnée.
export async function provisionBundle(params: {
  userId: string;
  bundleSlug: string;
  paymentMethod: string;
}): Promise<{ created: number; skipped: number }> {
  const { userId, bundleSlug, paymentMethod } = params;

  const { data: bundle } = await supabaseAdmin
    .from("bundles")
    .select("slug, price_monthly_fcfa, included")
    .eq("slug", bundleSlug)
    .single();
  if (!bundle) {
    console.warn("[provisionBundle] bundle introuvable", bundleSlug);
    return { created: 0, skipped: 0 };
  }

  const included = (bundle.included as BundleIncluded[]) || [];

  // Prix mensuel standalone de chaque app incluse (annuel mensualisé /12).
  const apps = await Promise.all(
    included.map(async (inc) => {
      const { data: app } = await supabaseAdmin
        .from("apps")
        .select("id, pricing, seat_pricing, pricing_period")
        .eq("id", inc.app_id)
        .single();
      const pricing = (app?.pricing as Record<string, number>) || {};
      const seatPricing = (app?.seat_pricing as Record<string, any>) || {};
      const { amount } = computePlanAmount(pricing, seatPricing, inc.plan, inc.seats);
      const monthly = app?.pricing_period === "an" ? Math.round(amount / 12) : amount;
      return { inc, monthly };
    }),
  );

  const totalStandalone = apps.reduce((s, a) => s + a.monthly, 0) || 1;

  // Parts proportionnelles, ajustées pour que la somme = prix suite.
  let allocated = 0;
  const shares = apps.map((a, i) => {
    if (i === apps.length - 1) return bundle.price_monthly_fcfa - allocated;
    const share = Math.round((bundle.price_monthly_fcfa * a.monthly) / totalStandalone);
    allocated += share;
    return share;
  });

  const now = new Date();
  const periodEnd = new Date(now.getTime() + 30 * 86400000);
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < apps.length; i++) {
    const { inc } = apps[i];

    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("app_id", inc.app_id)
      .in("status", ["active", "trialing"])
      .maybeSingle();
    if (existing?.id) {
      skipped++;
      continue;
    }

    const { data: newSub } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        user_id: userId,
        app_id: inc.app_id,
        plan: inc.plan,
        status: "active",
        bundle_slug: bundle.slug,
        seats_limit: inc.seats,
        price_at_subscription: shares[i],
        payment_method: paymentMethod,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      })
      .select("id")
      .single();

    if (newSub?.id) {
      created++;
      await createLicenceAfterPayment({
        userId,
        appSlug: inc.app_id,
        planName: inc.plan,
        subscriptionId: newSub.id,
      }).catch((e) => console.warn("[provisionBundle] licence échouée", inc.app_id, e));
    }
  }

  return { created, skipped };
}
