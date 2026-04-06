import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async () => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const results: string[] = [];

    // 1. Expired trials
    const { data: expiredTrials } = await supabaseAdmin.from("subscriptions").select("*").eq("status", "trial").lte("trial_ends_at", today);
    for (const sub of expiredTrials || []) {
      await supabaseAdmin.from("subscriptions").update({ status: "past_due" }).eq("id", sub.id);
      await supabaseAdmin.from("renewal_log").insert({ subscription_id: sub.id, tenant_id: sub.tenant_id, renewal_type: "grace_period", status: "trial_expired" });
      results.push(`Trial expired: ${sub.id}`);
    }

    // 2. Renewals due today
    const { data: renewals } = await supabaseAdmin.from("subscriptions").select("*, plans(*), tenants(name, email)").eq("status", "active").eq("next_renewal_date", today);
    for (const sub of renewals || []) {
      // Try saved payment method
      const { data: savedMethod } = await supabaseAdmin.from("saved_payment_methods").select("*").eq("tenant_id", sub.tenant_id).eq("is_default", true).single();
      if (!savedMethod) {
        await supabaseAdmin.from("subscriptions").update({ status: "past_due" }).eq("id", sub.id);
        await supabaseAdmin.from("renewal_log").insert({ subscription_id: sub.id, tenant_id: sub.tenant_id, renewal_type: "grace_period", details: { reason: "no_saved_method" } });
      }
      // In production: attempt auto-payment here
      results.push(`Renewal processed: ${sub.id}`);
    }

    // 3. Apply pending downgrades
    const { data: downgrades } = await supabaseAdmin.from("subscriptions").select("*").not("pending_plan_id", "is", null).lte("current_period_end", today);
    for (const sub of downgrades || []) {
      await supabaseAdmin.from("subscriptions").update({ plan_id: sub.pending_plan_id, billing_cycle: sub.pending_billing_cycle || sub.billing_cycle, pending_plan_id: null, pending_billing_cycle: null, pending_change_at: null }).eq("id", sub.id);
      results.push(`Downgrade applied: ${sub.id}`);
    }

    // 4. Past due -> degraded (1 day after period end)
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const { data: toDegraded } = await supabaseAdmin.from("subscriptions").select("*").eq("status", "past_due").lte("current_period_end", yesterday);
    for (const sub of toDegraded || []) {
      await supabaseAdmin.from("subscriptions").update({ status: "degraded" }).eq("id", sub.id);
      await supabaseAdmin.from("renewal_log").insert({ subscription_id: sub.id, tenant_id: sub.tenant_id, renewal_type: "degraded_mode" });
      results.push(`Degraded: ${sub.id}`);
    }

    // 5. Degraded -> suspended (7 days after period end)
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
    const { data: toSuspend } = await supabaseAdmin.from("subscriptions").select("*").eq("status", "degraded").lte("current_period_end", sevenAgo);
    for (const sub of toSuspend || []) {
      await supabaseAdmin.from("subscriptions").update({ status: "suspended" }).eq("id", sub.id);
      await supabaseAdmin.from("licences").update({ status: "suspended", suspended_at: new Date().toISOString() }).eq("subscription_id", sub.id);
      await supabaseAdmin.from("renewal_log").insert({ subscription_id: sub.id, tenant_id: sub.tenant_id, renewal_type: "suspension" });
      results.push(`Suspended: ${sub.id}`);
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
