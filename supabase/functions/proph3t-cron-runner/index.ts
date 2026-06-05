// PROPH3T CRON Runner — execute des workflows automatiquement.
// Appele soit par pg_cron (HTTP supabase function), soit par GitHub Actions
// avec un secret CRON_SHARED_SECRET.
//
// Body : { task: "monthly_closing" | "weekly_dso_check" | "daily_alerts", tenant_filter?: object }
// Retour : { ok, executed: [...], failed: [...] }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { runTool } from "../_shared/proph3t/tools.ts";
import { appendAudit } from "../_shared/proph3t/audit.ts";

interface CronBody {
  task: "monthly_closing" | "weekly_dso_check" | "daily_alerts" | "quarterly_acomptes";
  tenant_filter?: { ids?: string[]; pays?: string };
  dry_run?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth via shared secret (pas de JWT user)
  const auth = req.headers.get("authorization") ?? "";
  const expectedSecret = Deno.env.get("CRON_SHARED_SECRET");
  // Comparaison EXACTE sur `Bearer <secret>` (pas includes() : une sous-chaîne
  // ne doit pas authentifier). Cohérent avec _shared/asvc/auth.ts. (Audit — WF-1)
  if (!expectedSecret || auth !== `Bearer ${expectedSecret}`) {
    return errorResponse("Unauthorized — CRON_SHARED_SECRET requis", 401);
  }

  try {
    const body = await req.json() as CronBody;
    const t0 = Date.now();
    const executed: any[] = [];
    const failed: any[] = [];

    // 1. Recuperer tenants concernes
    let qb = supabaseAdmin.from("profiles").select("id, full_name, company_name").limit(100);
    if (body.tenant_filter?.ids) qb = qb.in("id", body.tenant_filter.ids);
    const { data: tenants, error } = await qb;
    if (error) throw new Error(`tenants: ${error.message}`);

    if (body.dry_run) {
      return jsonResponse({ ok: true, dry_run: true, tenants_concernes: tenants?.length ?? 0, task: body.task });
    }

    // 2. Pour chaque tenant, executer la tache CRON
    for (const t of tenants ?? []) {
      try {
        let result: any;
        if (body.task === "monthly_closing") {
          // Si on avait un mecanisme pour aller chercher les ecritures du mois pour le tenant,
          // on appellerait workflow_closing_mensuel ici. En attente d'une integration,
          // on log juste l'intent.
          await appendAudit({
            action: "cron_monthly_closing",
            actor_user_id: t.id,
            content: { tenant: t.company_name, task: body.task, scheduled: true },
          });
          result = { intent: "monthly_closing_scheduled", tenant: t.id };
        } else if (body.task === "weekly_dso_check") {
          // Genere une alerte DSO si historique disponible (placeholder)
          result = await runTool("generate_alert" as any, {
            society_id: t.id,
            product: "cockpit-fa",
            severity: "P2",
            alert_type: "weekly_dso_check",
            title: "Verification DSO hebdomadaire",
            message: "Penser a verifier l'evolution du DSO et relancer les clients en retard.",
          });
        } else if (body.task === "daily_alerts") {
          // Aggregation heuristique : un seul appel pour le tenant
          result = { intent: "daily_alerts_check", tenant: t.id };
        } else if (body.task === "quarterly_acomptes") {
          await appendAudit({
            action: "cron_quarterly_acomptes",
            actor_user_id: t.id,
            content: { tenant: t.company_name, reminder: "Acompte IS provisionnel a payer" },
          });
          result = { intent: "quarterly_acomptes_reminder", tenant: t.id };
        }
        executed.push({ tenant_id: t.id, tenant_nom: t.company_name, result });
      } catch (e) {
        failed.push({ tenant_id: t.id, error: (e as Error).message });
      }
    }

    return jsonResponse({
      ok: true,
      task: body.task,
      tenants_total: tenants?.length ?? 0,
      executed_count: executed.length,
      failed_count: failed.length,
      duration_ms: Date.now() - t0,
      executed: executed.slice(0, 20),
      failed,
    });
  } catch (err) {
    return errorResponse((err as Error).message);
  }
});
