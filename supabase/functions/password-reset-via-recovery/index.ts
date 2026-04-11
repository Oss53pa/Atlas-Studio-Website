/**
 * password-reset-via-recovery
 *
 * Le user oublie son mot de passe et n'a plus acces a son email principal.
 * Il fournit son email principal -> on cherche son recovery_email dans profiles
 * -> on envoie un magic link de reset au recovery_email (PAS au principal).
 *
 * Ainsi, meme si le user a perdu acces a son email principal, il peut
 * recuperer son compte via son email de secours.
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email } = await req.json();
    if (!email) return errorResponse("Email requis", 400);

    // 1. Find user by primary email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, recovery_email, role, is_active")
      .eq("email", email.toLowerCase().trim())
      .single();

    // Always return success to prevent email enumeration
    if (profileError || !profile) {
      console.log("No profile found for:", email);
      return jsonResponse({ success: true, message: "Si un compte existe avec cet email, un lien de recuperation a ete envoye." });
    }

    if (!profile.is_active) {
      return jsonResponse({ success: true, message: "Si un compte existe avec cet email, un lien de recuperation a ete envoye." });
    }

    // 2. Check if user has a recovery email configured
    if (!profile.recovery_email) {
      return jsonResponse({
        success: true,
        message: "Aucune adresse de recuperation configuree pour ce compte. Contactez le support.",
      });
    }

    // 3. Generate magic link via Supabase admin
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
    });

    if (linkError || !linkData) {
      console.error("generateLink error:", linkError);
      return errorResponse("Impossible de generer le lien", 500);
    }

    const resetUrl = linkData.properties.action_link;

    // 4. Send email to RECOVERY email (not primary)
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return errorResponse("RESEND_API_KEY non configure", 500);

    const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 20px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="background:#0A0A0A;padding:24px 32px;border-bottom:3px solid #EF9F27;">
          <div style="color:#EF9F27;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Atlas Studio — Recuperation</div>
          <div style="color:#fff;font-size:11px;margin-top:4px;opacity:0.6;">Email de securite</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;color:#1a1a1a;font-size:22px;font-weight:600;">Reinitialisation de mot de passe</h1>
          <p style="margin:0 0 12px;color:#444;font-size:14px;line-height:1.6;">
            Bonjour ${escapeHtml(profile.full_name || "")},
          </p>
          <p style="margin:0 0 16px;color:#444;font-size:14px;line-height:1.6;">
            Une demande de reinitialisation de mot de passe a ete recue pour le compte
            <strong>${escapeHtml(profile.email)}</strong> (${profile.role === "super_admin" ? "Super Admin" : "Admin"}).
          </p>
          <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:14px 18px;border-radius:8px;margin:20px 0;">
            <div style="color:#92400E;font-size:13px;font-weight:600;margin-bottom:4px;">⚠️ Email de securite</div>
            <div style="color:#78350F;font-size:12px;line-height:1.5;">
              Cet email a ete envoye a votre adresse de recuperation car vous n'avez peut-etre plus acces a votre email principal.
              Si vous n'etes pas a l'origine de cette demande, ignorez cet email et changez votre mot de passe immediatement.
            </div>
          </div>
          <p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.6;">
            Cliquez sur le bouton ci-dessous pour definir un nouveau mot de passe :
          </p>
          <div style="text-align:center;margin:24px 0;">
            <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;background:#EF9F27;color:#0A0A0B;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              Reinitialiser mon mot de passe
            </a>
          </div>
          <p style="margin:24px 0 0;color:#999;font-size:11px;line-height:1.5;">
            Ce lien expire dans 1 heure pour des raisons de securite.<br>
            Si le bouton ne fonctionne pas, copiez-collez cette URL dans votre navigateur :<br>
            <span style="color:#666;word-break:break-all;font-family:monospace;font-size:10px;">${resetUrl}</span>
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#FAFAFA;border-top:1px solid #eee;text-align:center;">
          <div style="color:#999;font-size:11px;">
            Atlas Studio — Securite des comptes administrateurs
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Atlas Studio Securite <notifications@atlasstudio.org>",
        to: [profile.recovery_email],
        subject: `[SECURITE] Reinitialisation de mot de passe — ${profile.email}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return errorResponse("Echec d'envoi de l'email", 500);
    }

    // Log this critical security event in activity_log
    await supabaseAdmin.from("activity_log").insert({
      user_id: profile.id,
      action: "password_recovery_requested",
      metadata: {
        email: profile.email,
        recovery_email: maskEmail(profile.recovery_email),
        ip: req.headers.get("x-forwarded-for") || "unknown",
      },
    });

    return jsonResponse({
      success: true,
      message: `Lien envoye a l'adresse de recuperation ${maskEmail(profile.recovery_email)}`,
      recovery_hint: maskEmail(profile.recovery_email),
    });
  } catch (error) {
    console.error("password-reset-via-recovery error:", error);
    return errorResponse((error as Error).message, 500);
  }
});

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visibleChars = Math.min(2, local.length);
  return `${local.slice(0, visibleChars)}${"*".repeat(Math.max(0, local.length - visibleChars))}@${domain}`;
}
