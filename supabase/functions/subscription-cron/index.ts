import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/mailer.ts";
import { trialExpiringEmail } from "../_shared/email-templates.ts";

/**
 * Scheduled function — invoke daily via Supabase cron (pg_cron) or external scheduler.
 * To set up: In Supabase SQL Editor, run:
 *
 * SELECT cron.schedule(
 *   'subscription-checks',
 *   '0 8 * * *',
 *   $$
 *   SELECT net.http_post(
 *     url := '<SUPABASE_URL>/functions/v1/subscription-cron',
 *     headers := jsonb_build_object('Authorization', 'Bearer <SUPABASE_SERVICE_ROLE_KEY>'),
 *     body := '{}'::jsonb
 *   );
 *   $$
 * );
 */

Deno.serve(async (req) => {
  // Verify this is called with service role key (not a random user)
  const authHeader = req.headers.get("authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader?.includes(serviceKey!)) {
    return errorResponse("Non autorise", 401);
  }

  try {
    const now = new Date();
    console.log("[CRON] Running subscription checks...");

    // 1. Trials expiring in 3 days
    const in3Days = new Date(now.getTime() + 3 * 86400000).toISOString();
    const { data: expiringTrials } = await supabaseAdmin
      .from("subscriptions")
      .select("*, profiles(full_name, email)")
      .eq("status", "trial")
      .lte("trial_ends_at", in3Days)
      .gt("trial_ends_at", now.toISOString());

    for (const sub of expiringTrials || []) {
      const profile = sub.profiles as any;
      if (profile?.email) {
        const daysLeft = Math.ceil(
          (new Date(sub.trial_ends_at!).getTime() - now.getTime()) / 86400000
        );
        const { subject, html } = trialExpiringEmail(profile.full_name, sub.app_id, daysLeft);
        await sendMail({ to: profile.email, subject, html });
        await supabaseAdmin.from("notifications").insert({
          user_id: sub.user_id,
          title: "Essai bientot termine",
          message: `Votre essai de ${sub.app_id} expire dans ${daysLeft} jours.`,
          type: "warning",
        });
      }
    }

    // 2. Expired trials
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired", updated_at: now.toISOString() })
      .eq("status", "trial")
      .lte("trial_ends_at", now.toISOString());

    // 3. Active subscriptions past period end (non-Stripe only)
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "expired", updated_at: now.toISOString() })
      .eq("status", "active")
      .is("stripe_subscription_id", null)
      .lte("current_period_end", now.toISOString());

    // 4. Renewal reminders 5 days before end
    const in5Days = new Date(now.getTime() + 5 * 86400000).toISOString();
    const { data: renewingSubs } = await supabaseAdmin
      .from("subscriptions")
      .select("*, profiles(full_name, email)")
      .eq("status", "active")
      .lte("current_period_end", in5Days)
      .gt("current_period_end", now.toISOString());

    for (const sub of renewingSubs || []) {
      await supabaseAdmin.from("notifications").insert({
        user_id: sub.user_id,
        title: "Renouvellement proche",
        message: `Votre abonnement ${sub.app_id} se renouvelle dans 5 jours.`,
        type: "info",
      });
    }

    console.log("[CRON] Subscription checks completed.");
    return jsonResponse({ success: true, timestamp: now.toISOString() });
  } catch (error) {
    console.error("[CRON] Error:", error);
    return errorResponse("Cron job failed");
  }
});
