import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { token, password, first_name, last_name } = await req.json();

    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");

    const { data: seat } = await supabaseAdmin.from("licence_seats").select("*, licences(*, products(name))").eq("invitation_token", tokenHash).single();
    if (!seat) return new Response(JSON.stringify({ error: "Lien invalide ou déjà utilisé" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (seat.invitation_expires_at && new Date(seat.invitation_expires_at) < new Date()) return new Response(JSON.stringify({ error: "Lien expiré" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Create or find user
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find(u => u.email === seat.email);
    let userId: string;

    if (existing) {
      userId = existing.id;
    } else {
      if (!password) return new Response(JSON.stringify({ error: "Mot de passe requis", needs_signup: true, email: seat.email, role: seat.role, product: seat.licences?.products?.name }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: seat.email, password, email_confirm: true,
        user_metadata: { full_name: `${first_name || ""} ${last_name || ""}`.trim() },
      });
      if (createErr) return new Response(JSON.stringify({ error: createErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      userId = newUser.user!.id;
    }

    // Update seat
    await supabaseAdmin.from("licence_seats").update({
      user_id: userId, full_name: `${first_name || ""} ${last_name || ""}`.trim(),
      invitation_accepted_at: new Date().toISOString(), invitation_token: null,
    }).eq("id", seat.id);

    // Audit
    await supabaseAdmin.from("licence_audit_log").insert({ licence_id: seat.licence_id, tenant_id: seat.tenant_id, actor_id: userId, actor_type: "tenant_user", action: "invitation_accepted", details: { email: seat.email } });

    // Generate magic link for auto-login
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: seat.email });
    const tokenHashLogin = linkData?.properties?.action_link ? new URL(linkData.properties.action_link).searchParams.get("token_hash") : null;

    return new Response(JSON.stringify({ success: true, token_hash: tokenHashLogin, email: seat.email }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
