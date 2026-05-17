// ASVC v2.1 — Tech Debt Agent endpoint.
// POST /asvc-tech-debt-scan { apps?: string[], mode?: 'full' | 'internal_only' | 'lighthouse_only' }
//
// Scans configurés :
//   - DB security (RLS missing, SECURITY DEFINER search_path) via RPCs SQL
//   - Lighthouse via PageSpeed Insights API (si PAGESPEED_API_KEY env)
//   - SonarCloud / npm audit : placeholder (à venir via GitHub Action Node)
//
// Auth :
//   - JWT admin (déclenchement UI) OU shared secret cron (Vercel Cron / pg_cron)

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { authorizeRequest } from "../_shared/asvc/auth.ts";
import { runScan, type ScanMode } from "../_shared/asvc/tech-debt.ts";

const VALID_MODES: ScanMode[] = ["full", "internal_only", "lighthouse_only"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse("Method not allowed", 405);

  const authz = await authorizeRequest(req);
  if (!authz.ok) return errorResponse(authz.reason, 401);

  let body: { apps?: string[]; mode?: string } = {};
  try {
    const txt = await req.text();
    if (txt.trim().length > 0) body = JSON.parse(txt) as typeof body;
  } catch {
    return errorResponse("Body JSON invalide", 400);
  }

  if (body.mode && !VALID_MODES.includes(body.mode as ScanMode)) {
    return errorResponse(`mode invalide: ${body.mode}`, 400);
  }
  if (body.apps && (!Array.isArray(body.apps) || body.apps.some((a) => typeof a !== "string"))) {
    return errorResponse("apps doit être un array de strings", 400);
  }

  try {
    const result = await runScan({
      apps: body.apps,
      mode: (body.mode as ScanMode) ?? "full",
    });

    await supabaseAdmin.rpc("asvc_log_audit", {
      p_actor_type: authz.isCron ? "system" : "ceo",
      p_actor_id: authz.actor,
      p_event_type: "tech_debt_scan_completed",
      p_resource_type: "asvc_code_health_audits",
      p_resource_id: null,
      p_payload: {
        apps_count: result.audits.length,
        total_items: result.totalItems,
        total_critical: result.totalCritical,
        mode: body.mode ?? "full",
      },
    });

    return jsonResponse({
      ok: true,
      summary: {
        apps_scanned: result.audits.length,
        total_items_detected: result.totalItems,
        total_critical: result.totalCritical,
      },
      audits: result.audits,
    });
  } catch (err) {
    return errorResponse(`tech-debt scan failed: ${(err as Error).message}`);
  }
});
