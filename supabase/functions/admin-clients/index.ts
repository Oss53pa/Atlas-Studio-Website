/**
 * Edge Function: admin-clients
 *
 * D6 — Création d'un client par le staff Atlas SANS mot de passe en clair.
 * Le compte est créé sans mot de passe ; le client reçoit un **lien sécurisé**
 * de définition de mot de passe (e-mail d'auth harmonisé, palette par app).
 * Provisionne aussi le trial demandé. Admin only.
 *
 * POST   Body: { email, full_name, company_name?, phone?,
 *                 trial_app_id?, trial_plan?, trial_days? }
 * DELETE ?id=<userId>
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

    if (req.method === "POST") {
      const {
        email,
        full_name,
        company_name,
        phone,
        trial_app_id,
        trial_plan,
        trial_days,
      } = await req.json();

      if (!email || !full_name) {
        return errorResponse("email et full_name requis", 400);
      }

      // 1. Créer le compte SANS mot de passe (email confirmé). Le mot de passe
      //    sera défini par le client via le lien envoyé plus bas.
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name, company_name: company_name || "" },
      });

      if (authError) return errorResponse(authError.message, 400);
      const userId = authUser.user.id;

      // 2. Profil
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        email,
        full_name,
        company_name: company_name || "",
        phone: phone || "",
        role: "client",
        is_active: true,
      });

      // 3. Trial (optionnel)
      if (trial_app_id && trial_plan) {
        const days = Number(trial_days) > 0 ? Number(trial_days) : 14;
        const now = new Date();
        const end = new Date(Date.now() + days * 86400000);
        const { error: subError } = await supabaseAdmin.from("subscriptions").insert({
          user_id: userId,
          app_id: trial_app_id,
          plan: trial_plan,
          status: "trial",
          price_at_subscription: 0,
          trial_ends_at: end.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: end.toISOString(),
        });
        if (subError) {
          // Non bloquant : le compte est créé, on signale le trial en échec.
          console.error("admin-clients: trial insert failed (non-blocking):", subError.message);
        }
      }

      // 4. Lien de définition de mot de passe (D6 : jamais de MDP en clair)
      const siteUrl = Deno.env.get("SITE_URL") || "https://atlas-studio.org";
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: `${siteUrl}/portal/reset-password` },
      });

      if (linkError || !linkData) {
        // Le compte existe déjà — on renvoie une erreur explicite pour que
        // l'admin puisse relancer l'envoi via « Reset mot de passe ».
        return errorResponse(
          `Client créé mais lien non généré: ${linkError?.message || "inconnu"}`,
          207,
        );
      }

      const actionLink = linkData.properties.action_link;

      // 5. E-mail d'invitation harmonisé, aux couleurs de l'app du trial.
      try {
        const brand = await resolveAuthBrand(trial_app_id || null);
        const html = renderAuthEmail(brand, {
          heading: "Bienvenue — définissez votre mot de passe",
          bodyHtml:
            `Bonjour ${escapeHtml(full_name)},<br /><br />` +
            `Un compte <strong style="color:${brand.accentDeep};">${escapeHtml(brand.app)}</strong> ` +
            `a été créé pour vous par l'équipe Atlas Studio. ` +
            `Cliquez ci-dessous pour définir votre mot de passe et accéder à votre espace.`,
          ctaLabel: "Définir mon mot de passe",
          ctaUrl: actionLink,
          securityNote:
            "Ce lien est valable une seule fois et expire sous peu. " +
            "Vous n'attendiez pas cet e-mail ? Ignorez-le, aucun accès n'est actif tant que le lien n'est pas ouvert.",
        });
        await sendMail({
          to: email,
          subject: "Votre accès Atlas Studio — définissez votre mot de passe",
          html,
        });
      } catch (emailErr) {
        console.error("admin-clients: invite email failed (non-blocking):", emailErr);
      }

      return jsonResponse({ success: true, userId });
    }

    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const id = url.searchParams.get("id");
      if (!id) return errorResponse("Client ID requis", 400);

      await supabaseAdmin.auth.admin.deleteUser(id);
      return jsonResponse({ success: true });
    }

    return errorResponse("Methode non supportee", 405);
  } catch (error: any) {
    console.error("Admin clients error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
