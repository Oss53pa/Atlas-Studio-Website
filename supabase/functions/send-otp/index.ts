/**
 * send-otp
 *
 * Generates a 6-digit OTP code, stores its hash in otp_codes table,
 * and emails the code to the user.
 *
 * Purposes:
 * - first_login: validate email ownership on first connection
 * - recovery: password recovery / account access recovery
 * - reset_password: password reset flow
 *
 * Rate limiting: max 3 OTPs per 5 minutes per email.
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTPS_PER_5MIN = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, purpose = "first_login" } = await req.json();

    if (!email) return errorResponse("Email requis", 400);
    if (!["first_login", "recovery", "reset_password", "mfa"].includes(purpose)) {
      return errorResponse("Purpose invalide", 400);
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Rate limiting
    const { data: rateData } = await supabaseAdmin.rpc("count_recent_otps", {
      p_email: normalizedEmail,
      p_minutes: 5,
    });
    if ((rateData || 0) >= MAX_OTPS_PER_5MIN) {
      return errorResponse("Trop de demandes. Reessayez dans quelques minutes.", 429);
    }

    // Verify the user exists in profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, is_active, first_login_completed")
      .eq("email", normalizedEmail)
      .single();

    if (!profile) {
      // Don't reveal user existence — return success anyway
      return jsonResponse({ success: true, message: "Si un compte existe, un code a ete envoye." });
    }

    if (!profile.is_active) {
      return errorResponse("Compte desactive. Contactez le support.", 403);
    }

    // Generate 6-digit OTP
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Hash the code (SHA-256)
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(code)
    );
    const codeHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Invalidate any previous unused OTPs for this email + purpose
    await supabaseAdmin
      .from("otp_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("email", normalizedEmail)
      .eq("purpose", purpose)
      .eq("used", false);

    // Store new OTP
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    const { error: insertError } = await supabaseAdmin.from("otp_codes").insert({
      email: normalizedEmail,
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt.toISOString(),
      ip_address: req.headers.get("x-forwarded-for") || "unknown",
      user_agent: req.headers.get("user-agent") || "",
    });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return errorResponse("Impossible de generer le code", 500);
    }

    // Update last_otp_sent_at on profile
    await supabaseAdmin
      .from("profiles")
      .update({ last_otp_sent_at: new Date().toISOString() })
      .eq("id", profile.id);

    // Send email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return errorResponse("Email service non configure", 500);

    const purposeLabel = {
      first_login: "Validation de premiere connexion",
      recovery: "Recuperation de compte",
      reset_password: "Reinitialisation de mot de passe",
      mfa: "Code de verification",
    }[purpose] || "Code de verification";

    const purposeIntro = {
      first_login: "Pour finaliser votre premiere connexion a Atlas Studio, entrez ce code de verification :",
      recovery: "Pour recuperer l'acces a votre compte Atlas Studio, entrez ce code :",
      reset_password: "Pour reinitialiser votre mot de passe, entrez ce code :",
      mfa: "Voici votre code d'authentification :",
    }[purpose] || "Voici votre code :";

    const html = `<!DOCTYPE html>
<html lang="fr">
<body style="margin:0;padding:0;background:#F5F5F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:30px 20px;">
      <table role="presentation" width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
        <tr><td style="background:#0A0A0A;padding:24px 32px;border-bottom:3px solid #EF9F27;">
          <div style="color:#EF9F27;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">Atlas Studio</div>
          <div style="color:#fff;font-size:11px;margin-top:4px;opacity:0.6;">${escapeHtml(purposeLabel)}</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px;color:#1a1a1a;font-size:20px;font-weight:600;line-height:1.3;">
            Bonjour ${escapeHtml(profile.full_name || "")},
          </h1>
          <p style="margin:0 0 24px;color:#444;font-size:14px;line-height:1.6;">
            ${escapeHtml(purposeIntro)}
          </p>

          <!-- OTP Code Box -->
          <div style="text-align:center;background:#FAFAFA;border:2px dashed #EF9F27;border-radius:12px;padding:24px;margin:24px 0;">
            <div style="color:#999;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Votre code</div>
            <div style="color:#0A0A0A;font-size:36px;font-weight:700;font-family:'Courier New',monospace;letter-spacing:8px;">
              ${code}
            </div>
            <div style="color:#999;font-size:11px;margin-top:8px;">Expire dans ${OTP_EXPIRY_MINUTES} minutes</div>
          </div>

          <div style="background:#FEF3C7;border-left:4px solid #F59E0B;padding:14px 18px;border-radius:8px;margin:20px 0;">
            <div style="color:#92400E;font-size:13px;font-weight:600;margin-bottom:4px;">⚠️ Securite</div>
            <div style="color:#78350F;font-size:12px;line-height:1.5;">
              Ne partagez jamais ce code. Atlas Studio ne vous demandera jamais ce code par telephone, SMS ou email.
              Si vous n'avez pas demande ce code, ignorez cet email.
            </div>
          </div>

          <p style="margin:24px 0 0;color:#999;font-size:12px;line-height:1.5;text-align:center;">
            Adresse IP de la demande : ${req.headers.get("x-forwarded-for") || "inconnu"}
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#FAFAFA;border-top:1px solid #eee;text-align:center;">
          <div style="color:#999;font-size:11px;">
            Atlas Studio — Securite des comptes
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Atlas Studio <notifications@atlasstudio.org>",
        to: [normalizedEmail],
        subject: `Atlas Studio — Code de verification : ${code}`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return errorResponse("Echec d'envoi de l'email", 500);
    }

    return jsonResponse({
      success: true,
      message: `Code envoye a ${maskEmail(normalizedEmail)}`,
      email_hint: maskEmail(normalizedEmail),
      expires_in_minutes: OTP_EXPIRY_MINUTES,
    });
  } catch (error) {
    console.error("send-otp error:", error);
    return errorResponse((error as Error).message, 500);
  }
});

function escapeHtml(str: string): string {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = Math.min(2, local.length);
  return `${local.slice(0, visible)}${"*".repeat(Math.max(0, local.length - visible))}@${domain}`;
}
