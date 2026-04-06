import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { licence_id, reason, confirm } = await req.json();
    if (!confirm) return new Response(JSON.stringify({ error: "Confirmation requise" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: licence } = await supabaseAdmin.from("licences").select("*, tenants(name, email), products(name)").eq("id", licence_id).single();
    if (!licence) return new Response(JSON.stringify({ error: "Licence introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabaseAdmin.from("licences").update({ status: "revoked", revoked_at: new Date().toISOString(), revocation_reason: reason }).eq("id", licence_id);
    await supabaseAdmin.from("licence_seats").update({ status: "revoked" }).eq("licence_id", licence_id);
    await supabaseAdmin.from("licence_audit_log").insert({ licence_id, tenant_id: licence.tenant_id, actor_type: "pamela", action: "licence_revoked", details: { reason } });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
