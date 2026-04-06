import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { requireUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await requireUser(req);
    const { licence_id, tenant_id, email, full_name, role, send_email } = await req.json();

    // Check quota
    const { data: quota } = await supabaseAdmin.rpc("check_seat_quota", { p_licence_id: licence_id });
    if (!quota?.can_add) return new Response(JSON.stringify({ error: `Quota atteint : ${quota?.used}/${quota?.max} sièges` }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Generate invitation token
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), v => chars[v % chars.length]).join("");
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, "0")).join("");
    const expiresAt = new Date(Date.now() + 72 * 3600000).toISOString();

    const { data: seat, error: seatErr } = await supabaseAdmin.from("licence_seats").insert({
      licence_id, tenant_id, email, full_name, role: role || "editor", status: "active",
      invitation_token: tokenHash, invitation_sent_at: new Date().toISOString(), invitation_expires_at: expiresAt,
    }).select().single();

    if (seatErr) return new Response(JSON.stringify({ error: seatErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const inviteUrl = `https://atlas-studio.org/invite/${token}`;

    if (send_email !== false) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (resendKey) {
        const { data: inviterProfile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).single();
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Pamela — Atlas Studio <notifications@atlasstudio.org>",
            to: [email],
            subject: `${inviterProfile?.full_name || "Votre administrateur"} vous invite à rejoindre Atlas Studio`,
            html: `<div style="font-family:sans-serif;max-width:580px;margin:0 auto;padding:32px;">
              <h2 style="color:#EF9F27;">Vous êtes invité(e)</h2>
              <p>${inviterProfile?.full_name || "Un administrateur"} vous a invité(e) en tant que <strong>${role || "éditeur"}</strong>.</p>
              <p><a href="${inviteUrl}" style="display:inline-block;padding:12px 32px;background:#EF9F27;color:#000;border-radius:8px;font-weight:500;text-decoration:none;">Accepter l'invitation →</a></p>
              <p style="font-size:12px;color:#888;">Ce lien expire dans 72h.</p>
            </div>`,
          }),
        });
      }
    }

    await supabaseAdmin.from("licence_audit_log").insert({ licence_id, tenant_id, actor_id: user.id, actor_type: "tenant_admin", action: "seat_invited", details: { email, role } });

    return new Response(JSON.stringify({ success: true, seat, invite_url: inviteUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
