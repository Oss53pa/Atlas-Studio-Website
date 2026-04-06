import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { licence_id } = await req.json();

    // Get tenant from licence
    const { data: licence } = await supabaseAdmin.from("licences").select("tenant_id").eq("id", licence_id).single();
    if (!licence) return new Response(JSON.stringify({ error: "Licence introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Revoke existing active links
    await supabaseAdmin.from("admin_delegate_links").update({ status: "revoked" }).eq("licence_id", licence_id).eq("status", "active");

    // Generate new token
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), v => chars[v % chars.length]).join("");
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: link } = await supabaseAdmin.from("admin_delegate_links").insert({
      licence_id, tenant_id: licence.tenant_id, created_by: user.id,
      token, token_hash: tokenHash,
      can_invite_users: true, can_manage_roles: true, can_view_users: true, can_revoke_users: true,
      can_view_billing: false, can_change_plan: false,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    }).select().single();

    await supabaseAdmin.from("licence_audit_log").insert({ licence_id, tenant_id: licence.tenant_id, actor_id: user.id, actor_type: "tenant_admin", action: "admin_link_created", details: {} });

    return new Response(JSON.stringify({ success: true, link, admin_url: `https://atlas-studio.org/admin-access/${token}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
