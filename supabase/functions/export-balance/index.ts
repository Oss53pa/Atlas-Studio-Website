/**
 * Edge Function: export-balance
 * Called by Atlas F&A after fiscal year closure.
 * Stores the closing trial balance in atlas_balance_exports table so that
 * satellite apps (Liass'Pilot for the liasse fiscale, Cockpit F&A for
 * reporting) can import it automatically — no Excel re-export/re-import.
 * The stored balance is pulled back via the `balance-exports` endpoint.
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

    // Notify the satellite apps that can consume this balance automatically:
    // Liass'Pilot (liasse fiscale) and Cockpit F&A (reporting/dashboards).
    // Each subscribed app pulls the balance via the `balance-exports`
    // endpoint — the user never re-exports/re-imports an Excel file.
    const CONSUMER_APPS: { appId: string; name: string; url: string }[] = [
      { appId: "taxpilot", name: "Liass'Pilot", url: "https://liasspilot.atlasstudio.app/import-balance" },
      { appId: "cockpit-fa", name: "Cockpit F&A", url: "https://cockpit-fna.atlas-studio.org" },
    ];

    const { data: subs } = await supabaseAdmin
      .from("subscriptions")
      .select("app_id")
      .eq("user_id", user.id)
      .in("app_id", CONSUMER_APPS.map((a) => a.appId))
      .in("status", ["active", "trial"]);

    const subscribedAppIds = new Set((subs ?? []).map((s) => s.app_id));
    const targets = CONSUMER_APPS.filter((a) => subscribedAppIds.has(a.appId));

    const notified: string[] = [];
    if (targets.length > 0) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email, full_name")
        .eq("id", user.id)
        .single();

      if (profile?.email) {
        for (const app of targets) {
          try {
            await sendMail({
              to: profile.email,
              subject: `Balance ${fiscalYear} disponible dans ${app.name}`,
              html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;"><h1 style="margin:0;font-size:22px;">Atlas <span style="color:#C8A960;">Studio</span></h1></div><div style="background:#fff;padding:30px;"><h2>Bonjour ${profile.full_name || ""},</h2><p>La balance de cloture de l'exercice <strong>${fiscalYear}</strong> a ete exportee depuis Atlas F&A.</p><p>Elle est maintenant <strong>disponible dans ${app.name}</strong>, prete a importer automatiquement.</p><div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;"><p><strong>Exercice :</strong> ${fiscalYear}</p><p><strong>Comptes :</strong> ${balanceData.length}</p><p><strong>Entreprise :</strong> ${companyName || "—"}</p></div><p style="text-align:center;margin:30px 0;"><a href="${app.url}" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Ouvrir ${app.name}</a></p></div></div>`,
            });
            notified.push(app.appId);
          } catch (e) {
            console.error(`Notification email error (${app.appId}):`, e);
          }
        }
      }
    }

    return jsonResponse({
      success: true,
      exportId: exportRow?.id,
      accounts: balanceData.length,
      availableIn: targets.map((a) => a.appId),
      notified,
      // Backward-compat (anciens clients Atlas F&A)
      liassPilotAvailable: subscribedAppIds.has("taxpilot"),
      liassPilotNotified: notified.includes("taxpilot"),
    });
  } catch (error: any) {
    console.error("export-balance error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message || "Erreur interne", 500);
  }
});
