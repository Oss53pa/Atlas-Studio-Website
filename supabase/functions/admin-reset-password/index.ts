/**
 * Edge Function: admin-reset-password
 * Generates a new random password for a user and sends it via email.
 * Admin only.
 *
 * POST /functions/v1/admin-reset-password
 * Body: { userId, email, fullName }
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/mailer.ts";

function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd + "!A1";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAdmin(req);

    const { userId, email, fullName } = await req.json();
    if (!userId || !email) {
      return errorResponse("userId et email requis", 400);
    }

    // Generate new password
    const newPassword = generatePassword();

    // Update user password
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return errorResponse(`Erreur: ${error.message}`, 500);
    }

    // Send email with new password
    await sendMail({
      to: email,
      subject: "Votre nouveau mot de passe — Atlas Studio",
      html: `
        <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
          <div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="margin:0;font-size:22px;">Atlas <span style="color:#C8A960;">Studio</span></h1>
          </div>
          <div style="background:#fff;padding:30px;">
            <h2>Bonjour ${fullName || ""},</h2>
            <p>Votre mot de passe a ete reinitialise par l'administrateur.</p>
            <div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;">
              <p style="margin:5px 0;"><strong>Nouveau mot de passe :</strong></p>
              <p style="margin:5px 0;font-size:18px;font-family:monospace;letter-spacing:2px;color:#C8A960;font-weight:bold;">${newPassword}</p>
            </div>
            <p>Connectez-vous et changez votre mot de passe des que possible.</p>
            <p style="text-align:center;margin:30px 0;">
              <a href="https://atlas-studio.org/portal/login" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Se connecter</a>
            </p>
          </div>
          <div style="text-align:center;padding:20px;color:#999;font-size:12px;">Atlas Studio</div>
        </div>
      `,
    });

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("admin-reset-password error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message || "Erreur interne", 500);
  }
});
