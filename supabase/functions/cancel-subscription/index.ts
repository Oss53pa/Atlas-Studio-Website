import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { subscription_id, reason, immediate } = await req.json();

    if (immediate) {
      await supabaseAdmin.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString(), cancellation_reason: reason }).eq("id", subscription_id);
    } else {
      await supabaseAdmin.from("subscriptions").update({ cancel_at_period_end: true, cancellation_reason: reason, status: "cancelled_eop" }).eq("id", subscription_id);
    }

    await supabaseAdmin.from("subscription_changes").insert({ subscription_id, change_type: "cancellation", effective_immediately: !!immediate, initiated_by: user.id, actor_type: "client", notes: reason });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
