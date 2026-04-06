import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { subscription_id, new_plan_id, new_cycle } = await req.json();

    const { data: sub } = await supabaseAdmin.from("subscriptions").select("*, plans(*)").eq("id", subscription_id).single();
    const { data: newPlan } = await supabaseAdmin.from("plans").select("*").eq("id", new_plan_id).single();
    if (!sub || !newPlan) return new Response(JSON.stringify({ error: "Données introuvables" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: prorata } = await supabaseAdmin.rpc("calculate_prorata", { p_subscription_id: subscription_id, p_new_plan_id: new_plan_id, p_new_cycle: new_cycle || sub.billing_cycle });
    const isUpgrade = prorata?.is_upgrade;

    if (isUpgrade) {
      await supabaseAdmin.from("subscriptions").update({ plan_id: new_plan_id, billing_cycle: new_cycle || sub.billing_cycle, mrr_fcfa: (new_cycle === "annual" ? Math.round((newPlan.price_annual_fcfa || 0) / 12) : newPlan.price_monthly_fcfa) || 0, updated_at: new Date().toISOString() }).eq("id", subscription_id);
      await supabaseAdmin.from("licences").update({ plan_id: new_plan_id, max_seats: newPlan.max_seats === -1 ? 9999 : newPlan.max_seats }).eq("subscription_id", subscription_id);
      await supabaseAdmin.from("subscription_changes").insert({ subscription_id, tenant_id: sub.tenant_id, change_type: "upgrade", from_plan_id: sub.plan_id, to_plan_id: new_plan_id, effective_immediately: true, effective_date: new Date().toISOString().split("T")[0], prorata_charge_fcfa: prorata?.supplement_fcfa || 0, initiated_by: user.id, actor_type: "client" });
      return new Response(JSON.stringify({ success: true, type: "upgrade", effective: "immediate", supplement_fcfa: prorata?.supplement_fcfa || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } else {
      await supabaseAdmin.from("subscriptions").update({ pending_plan_id: new_plan_id, pending_billing_cycle: new_cycle || sub.billing_cycle, pending_change_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", subscription_id);
      await supabaseAdmin.from("subscription_changes").insert({ subscription_id, tenant_id: sub.tenant_id, change_type: "downgrade", from_plan_id: sub.plan_id, to_plan_id: new_plan_id, effective_immediately: false, effective_date: sub.current_period_end, prorata_credit_fcfa: prorata?.avoir_fcfa || 0, initiated_by: user.id, actor_type: "client" });
      return new Response(JSON.stringify({ success: true, type: "downgrade", effective: sub.current_period_end, avoir_fcfa: prorata?.avoir_fcfa || 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
