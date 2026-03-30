/**
 * Edge Function: export-balance
 * Called by Atlas F&A after fiscal year closure.
 * Stores the closing trial balance in atlas_balance_exports table
 * so that Liass'Pilot can import it automatically.
 *
 * POST /functions/v1/export-balance
 * Body: {
 *   fiscalYear: string,
 *   companyName?: string,
 *   balanceData: Array<{
 *     accountNumber: string,
 *     accountName: string,
 *     debitOpening: number,
 *     creditOpening: number,
 *     debitMovement: number,
 *     creditMovement: number,
 *     debitClosing: number,
 *     creditClosing: number,
 *   }>
 * }
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/mailer.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    const user = await requireUser(req);
    const { fiscalYear, companyName, balanceData } = await req.json();

    if (!fiscalYear || !balanceData || !Array.isArray(balanceData)) {
      return errorResponse("fiscalYear et balanceData (array) requis", 400);
    }

    // Store the balance export
    const { data: exportRow, error: insertError } = await supabaseAdmin
      .from("atlas_balance_exports")
      .insert({
        user_id: user.id,
        fiscal_year: fiscalYear,
        company_name: companyName || null,
        data: balanceData,
        format: "syscohada",
        status: "available",
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse("Erreur lors de l'export", 500);
    }

    // Check if user also has Liass'Pilot subscription
    const { data: lpSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("app_id", "taxpilot")
      .in("status", ["active", "trial"])
      .single();

    let liassPilotNotified = false;

    if (lpSub) {
      // User has both apps — notify them
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      if (profile?.email) {
        try {
          await sendMail({
            to: profile.email,
            subject: `Balance ${fiscalYear} disponible dans Liass'Pilot`,
            html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;"><h1 style="margin:0;font-size:22px;">Atlas <span style="color:#C8A960;">Studio</span></h1></div><div style="background:#fff;padding:30px;"><h2>Bonjour ${profile.full_name || ""},</h2><p>La balance de cloture de l'exercice <strong>${fiscalYear}</strong> a ete exportee depuis Atlas F&A.</p><p>Elle est maintenant <strong>disponible dans Liass'Pilot</strong> pour generer votre liasse fiscale.</p><div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;"><p><strong>Exercice :</strong> ${fiscalYear}</p><p><strong>Comptes :</strong> ${balanceData.length}</p><p><strong>Entreprise :</strong> ${companyName || "—"}</p></div><p style="text-align:center;margin:30px 0;"><a href="https://liasspilot.atlasstudio.app/import-balance" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Ouvrir Liass'Pilot</a></p></div></div>`,
          });
          liassPilotNotified = true;
        } catch (e) {
          console.error("Notification email error:", e);
        }
      }
    }

    return jsonResponse({
      success: true,
      exportId: exportRow?.id,
      liassPilotAvailable: !!lpSub,
      liassPilotNotified,
      accounts: balanceData.length,
    });
  } catch (error: any) {
    console.error("export-balance error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message || "Erreur interne", 500);
  }
});
