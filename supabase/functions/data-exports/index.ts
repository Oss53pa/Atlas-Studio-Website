/**
 * Edge Function: data-exports
 * Canal générique d'échange de données inter-apps (généralise le pont
 * balance-only export-balance / balance-exports pour les nouveaux flux).
 * Une app Atlas publie un jeu de données comptable (balance, grand livre,
 * états financiers, ...) une fois ; les apps satellites souscrites le tirent
 * par API au lieu d'un ré-export/ré-import Excel.
 *
 * Stocké dans atlas_balance_exports (dataset_type discrimine le contenu).
 * Auth : JWT user (scoping serveur sur les exports du caller).
 *
 *  POST /functions/v1/data-exports
 *    body { datasetType, fiscalYear, companyName?, data: [], sourceApp? }
 *    -> publie le jeu de données + notifie les apps consommatrices souscrites.
 *  GET  /functions/v1/data-exports?datasetType=&fiscalYear=&status=
 *    -> liste les exports du caller (léger, sans payload).
 *  GET  /functions/v1/data-exports?id=<uuid>
 *    -> export complet (incl. data), prêt à importer.
 *  PUT  /functions/v1/data-exports   body { exportId }
 *    -> marque l'import (status + consumed_at).
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendMail } from "../_shared/mailer.ts";

const CONSUMER_APPS: Record<string, { name: string; url: string }> = {
  "taxpilot": { name: "Liass'Pilot", url: "https://liasspilot.atlasstudio.app/import-balance" },
  "cockpit-fa": { name: "Cockpit F&A", url: "https://cockpit-fna.atlas-studio.org" },
};

// Quels jeux de données existent, et quelles apps les consomment.
const DATASETS: Record<string, { label: string; consumers: string[] }> = {
  balance: { label: "balance de clôture", consumers: ["taxpilot", "cockpit-fa"] },
  grand_livre: { label: "grand livre", consumers: ["cockpit-fa"] },
  etats_financiers: { label: "états financiers", consumers: ["cockpit-fa"] },
  balance_agee: { label: "balance âgée", consumers: ["cockpit-fa"] },
  immobilisations: { label: "immobilisations", consumers: ["cockpit-fa"] },
};

const SELECT_COLS =
  "id, dataset_type, source_app, fiscal_year, company_name, data, format, status, export_date, consumed_at, created_at";

// deno-lint-ignore no-explicit-any
function toSummary(row: any) {
  return {
    id: row.id,
    datasetType: row.dataset_type,
    sourceApp: row.source_app,
    fiscalYear: row.fiscal_year,
    companyName: row.company_name,
    format: row.format,
    status: row.status,
    records: Array.isArray(row.data) ? row.data.length : 0,
    exportDate: row.export_date,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireUser(req);
    const url = new URL(req.url);

    // ── Publier ──────────────────────────────────────────────
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const { datasetType, fiscalYear, companyName, data, sourceApp } = body ?? {};

      if (!datasetType || !DATASETS[datasetType]) {
        return errorResponse(
          `datasetType invalide (attendu: ${Object.keys(DATASETS).join(", ")})`,
          400,
        );
      }
      if (!fiscalYear || !Array.isArray(data)) {
        return errorResponse("fiscalYear et data (array) requis", 400);
      }

      const { data: exportRow, error: insertError } = await supabaseAdmin
        .from("atlas_balance_exports")
        .insert({
          user_id: user.id,
          dataset_type: datasetType,
          source_app: sourceApp ?? null,
          fiscal_year: fiscalYear,
          company_name: companyName ?? null,
          data,
          format: "syscohada",
          status: "available",
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("data-exports insert error:", insertError);
        return errorResponse("Erreur lors de la publication", 500);
      }

      // Notifier les apps consommatrices souscrites pour ce type de données.
      const { label, consumers } = DATASETS[datasetType];
      const { data: subs } = await supabaseAdmin
        .from("subscriptions")
        .select("app_id")
        .eq("user_id", user.id)
        .in("app_id", consumers)
        .in("status", ["active", "trial"]);

      const subscribed = new Set((subs ?? []).map((s) => s.app_id));
      const targets = consumers.filter((id) => subscribed.has(id) && CONSUMER_APPS[id]);

      const notified: string[] = [];
      if (targets.length > 0) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("email, full_name")
          .eq("id", user.id)
          .single();

        if (profile?.email) {
          const labelCap = label.charAt(0).toUpperCase() + label.slice(1);
          for (const id of targets) {
            const app = CONSUMER_APPS[id];
            try {
              await sendMail({
                to: profile.email,
                subject: `${labelCap} ${fiscalYear} disponible dans ${app.name}`,
                html: `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;"><div style="background:#0A0A0A;color:#fff;padding:30px;text-align:center;border-radius:12px 12px 0 0;"><h1 style="margin:0;font-size:22px;">Atlas <span style="color:#C8A960;">Studio</span></h1></div><div style="background:#fff;padding:30px;"><h2>Bonjour ${profile.full_name || ""},</h2><p>Les donnees <strong>${label}</strong> de l'exercice <strong>${fiscalYear}</strong> ont ete publiees depuis ${sourceApp || "Atlas F&A"}.</p><p>Elles sont maintenant <strong>disponibles dans ${app.name}</strong>, pretes a importer automatiquement.</p><div style="background:#FAFAF8;padding:20px;border-radius:10px;margin:20px 0;border-left:4px solid #C8A960;"><p><strong>Donnees :</strong> ${label}</p><p><strong>Exercice :</strong> ${fiscalYear}</p><p><strong>Lignes :</strong> ${data.length}</p><p><strong>Entreprise :</strong> ${companyName || "—"}</p></div><p style="text-align:center;margin:30px 0;"><a href="${app.url}" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;">Ouvrir ${app.name}</a></p></div></div>`,
              });
              notified.push(id);
            } catch (e) {
              console.error(`data-exports notify error (${id}):`, e);
            }
          }
        }
      }

      return jsonResponse({
        success: true,
        exportId: exportRow?.id,
        datasetType,
        records: data.length,
        availableIn: targets,
        notified,
      });
    }

    // ── Marquer importé ──────────────────────────────────────
    if (req.method === "PUT") {
      const body = await req.json().catch(() => ({}));
      const exportId = body?.exportId;
      if (!exportId) return errorResponse("exportId requis", 400);

      const { data, error } = await supabaseAdmin
        .from("atlas_balance_exports")
        .update({ status: "imported", consumed_at: new Date().toISOString() })
        .eq("id", exportId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (error || !data) return errorResponse("Export introuvable", 404);
      return jsonResponse({ success: true, exportId: data.id, status: "imported" });
    }

    // ── Lire (liste / détail) ────────────────────────────────
    if (req.method === "GET") {
      const id = url.searchParams.get("id");
      if (id) {
        const { data, error } = await supabaseAdmin
          .from("atlas_balance_exports")
          .select(SELECT_COLS)
          .eq("id", id)
          .eq("user_id", user.id)
          .single();
        if (error || !data) return errorResponse("Export introuvable", 404);
        return jsonResponse({ ...toSummary(data), data: data.data });
      }

      let query = supabaseAdmin
        .from("atlas_balance_exports")
        .select(SELECT_COLS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const datasetType = url.searchParams.get("datasetType");
      if (datasetType) query = query.eq("dataset_type", datasetType);
      const fiscalYear = url.searchParams.get("fiscalYear");
      if (fiscalYear) query = query.eq("fiscal_year", fiscalYear);
      const status = url.searchParams.get("status");
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return errorResponse("Erreur lors de la lecture des exports", 500);
      const exports = (data ?? []).map(toSummary);
      return jsonResponse({ exports, count: exports.length });
    }

    return errorResponse("Method not allowed", 405);
  // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    console.error("data-exports error:", error);
    if (error?.status) return errorResponse(error.message, error.status);
    return errorResponse(error?.message || "Erreur interne", 500);
  }
});
