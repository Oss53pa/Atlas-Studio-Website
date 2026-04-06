import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { licence_id } = await req.json();

    await supabaseAdmin.from("licences").update({ status: "active", activated_at: new Date().toISOString(), activated_by: user.id }).eq("id", licence_id).eq("status", "pending");
    await supabaseAdmin.from("licence_activations").insert({ licence_id, activated_by: user.id, activation_key: "***", ip_address: req.headers.get("x-forwarded-for") || "unknown", user_agent: req.headers.get("user-agent") || "", success: true });
    await supabaseAdmin.from("licence_audit_log").insert({ licence_id, actor_id: user.id, actor_type: "tenant_admin", action: "licence_activated", details: {} });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
