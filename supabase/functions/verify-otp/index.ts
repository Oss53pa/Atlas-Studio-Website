/**
 * verify-otp
 *
 * Verifies a 6-digit OTP code against the stored hash in otp_codes table.
 * Marks the OTP as used on success and tracks failed attempts.
 *
 * On success for purpose='first_login': marks profile.first_login_completed = true
 * On success for purpose='reset_password': returns a magic link to reset password
 * On success for purpose='recovery': generates a magic link session
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, code, purpose = "first_login" } = await req.json();

    if (!email || !code) return errorResponse("Email et code requis", 400);
    if (!/^\d{6}$/.test(code)) return errorResponse("Format de code invalide (6 chiffres)", 400);

    const normalizedEmail = email.toLowerCase().trim();

    // Hash the submitted code
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(code)
    );
    const codeHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    // Find the most recent unused OTP for this email + purpose
    const { data: otpRecord, error: findError } = await supabaseAdmin
      .from("otp_codes")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("purpose", purpose)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !otpRecord) {
      return errorResponse("Code introuvable ou expire. Demandez un nouveau code.", 404);
    }

    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabaseAdmin.from("otp_codes").update({ used: true, used_at: new Date().toISOString() }).eq("id", otpRecord.id);
      return errorResponse("Code expire. Demandez un nouveau code.", 410);
    }

    // Check max attempts
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      await supabaseAdmin.from("otp_codes").update({ used: true, used_at: new Date().toISOString() }).eq("id", otpRecord.id);
      return errorResponse("Trop de tentatives echouees. Demandez un nouveau code.", 429);
    }

    // Compare hashes
    if (otpRecord.code_hash !== codeHash) {
      // Increment attempts
      await supabaseAdmin
        .from("otp_codes")
        .update({ attempts: (otpRecord.attempts || 0) + 1 })
        .eq("id", otpRecord.id);

      const remaining = MAX_ATTEMPTS - (otpRecord.attempts + 1);
      return errorResponse(
        remaining > 0
          ? `Code incorrect. ${remaining} tentative${remaining > 1 ? "s" : ""} restante${remaining > 1 ? "s" : ""}.`
          : "Code incorrect. Code bloque.",
        401
      );
    }

    // Code is valid! Mark as used
    await supabaseAdmin
      .from("otp_codes")
      .update({ used: true, used_at: new Date().toISOString() })
      .eq("id", otpRecord.id);

    // Get the user profile
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, first_login_completed")
      .eq("email", normalizedEmail)
      .single();

    if (!profile) {
      return errorResponse("Profil introuvable", 404);
    }

    // Action based on purpose
    if (purpose === "first_login") {
      // Mark first login as completed and email as verified
      await supabaseAdmin
        .from("profiles")
        .update({
          first_login_completed: true,
          email_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      // Log activity
      await supabaseAdmin.from("activity_log").insert({
        user_id: profile.id,
        action: "first_login_otp_verified",
        metadata: { email: normalizedEmail },
      });

      return jsonResponse({
        success: true,
        purpose: "first_login",
        message: "Email valide. Connexion autorisee.",
        verified: true,
      });
    }

    if (purpose === "recovery" || purpose === "reset_password") {
      // Generate a Supabase magic link to allow password reset
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
      });

      if (linkError || !linkData) {
        console.error("generateLink error:", linkError);
        return errorResponse("Impossible de generer le lien de reinitialisation", 500);
      }

      const tokenHash = linkData.properties.hashed_token;

      await supabaseAdmin.from("activity_log").insert({
        user_id: profile.id,
        action: "recovery_otp_verified",
        metadata: { email: normalizedEmail, purpose },
      });

      return jsonResponse({
        success: true,
        purpose,
        message: "Code valide. Vous pouvez reinitialiser votre mot de passe.",
        verified: true,
        token_hash: tokenHash,
        action_link: linkData.properties.action_link,
      });
    }

    // Default success
    return jsonResponse({ success: true, verified: true, purpose });
  } catch (error) {
    console.error("verify-otp error:", error);
    return errorResponse((error as Error).message, 500);
  }
});
