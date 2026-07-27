/**
 * Edge Function: admin-reset-password
 *
 * D5/D6 — Ne génère plus de mot de passe en clair. Envoie un **lien sécurisé**
 * de définition de mot de passe (Supabase recovery link) dans l'e-mail
 * d'authentification harmonisé (palette par app, repli neutre Atlas Studio).
 * Admin only.
 *
 * POST /functions/v1/admin-reset-password
 * Body: { userId?, email, fullName?, appId? }
 *   - email  : requis (cible du lien de recovery)
 *   - appId  : optionnel — colore l'e-mail aux couleurs de l'app
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireAdmin } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/mailer.ts";
import { resolveAuthBrand, renderAuthEmail, escapeHtml } from "../_shared/authEmail.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    await requireAdmin(req);

    const { email, fullName, appId } = await req.json();
    if (!email) {
      return errorResponse("email requis", 400);
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://atlas-studio.org";

    // Lien de recovery — l'utilisateur définit lui-même son nouveau mot de passe.
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/portal/reset-password` },
    });

    if (linkError || !linkData) {
      return errorResponse(`Impossible de générer le lien: ${linkError?.message || "inconnu"}`, 500);
    }

    const actionLink = linkData.properties.action_link;

    // E-mail harmonisé, aux couleurs de l'app si fournie.
    const brand = await resolveAuthBrand(appId);
    const greeting = fullName ? `Bonjour ${escapeHtml(fullName)},<br /><br />` : "";
    const html = renderAuthEmail(brand, {
      heading: "Réinitialisation de votre mot de passe",
      bodyHtml:
        `${greeting}Une réinitialisation de mot de passe a été demandée par l'administrateur pour votre compte ` +
        `<strong style="color:${brand.accentDeep};">${escapeHtml(brand.app)}</strong>. ` +
        `Cliquez ci-dessous pour définir un nouveau mot de passe.`,
      ctaLabel: "Définir mon mot de passe",
      ctaUrl: actionLink,
      securityNote:
        "Ce lien est valable une seule fois et expire sous peu. " +
        "Vous n'avez pas demandé ce changement ? Ignorez cet e-mail : votre mot de passe actuel reste inchangé.",
    });

    await sendMail({
      to: email,
      subject: "Réinitialisation de votre mot de passe — Atlas Studio",
      html,
    });

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("admin-reset-password error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message || "Erreur interne", 500);
  }
});
