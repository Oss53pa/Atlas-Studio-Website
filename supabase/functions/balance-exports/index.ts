/**
 * Edge Function: balance-exports
 * Pull side of the Atlas F&A -> satellite apps balance bridge.
 * Lets Liass'Pilot / Cockpit F&A fetch a closing balance published by
 * Atlas F&A (via `export-balance`) and import it automatically — the user
 * never re-exports/re-imports an Excel file.
 *
 * Auth: user JWT (RLS-scoped server-side to the caller's own exports).
 *
 *  GET  /functions/v1/balance-exports
 *         -> list the caller's balance exports (lightweight, no payload).
 *         Optional query: ?fiscalYear=2024  ?status=available
 *  GET  /functions/v1/balance-exports?id=<uuid>
 *         -> full export incl. balanceData, ready to import.
 *  POST /functions/v1/balance-exports
 *         body { exportId: string } -> mark as imported (status + consumed_at).
 */
import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const SELECT_COLS =
  "id, fiscal_year, company_name, data, format, status, export_date, consumed_at, created_at";

// deno-lint-ignore no-explicit-any
function toSummary(row: any) {
  return {
    id: row.id,
    fiscalYear: row.fiscal_year,
    companyName: row.company_name,
    format: row.format,
    status: row.status,
    accounts: Array.isArray(row.data) ? row.data.length : 0,
    exportDate: row.export_date,
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireUser(req);
    const url = new URL(req.url);

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

        return jsonResponse({ ...toSummary(data), balanceData: data.data });
      }

      let query = supabaseAdmin
        .from("atlas_balance_exports")
        .select(SELECT_COLS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const fiscalYear = url.searchParams.get("fiscalYear");
      if (fiscalYear) query = query.eq("fiscal_year", fiscalYear);
      const status = url.searchParams.get("status");
      if (status) query = query.eq("status", status);

      const { data, error } = await query;
      if (error) return errorResponse("Erreur lors de la lecture des exports", 500);

      const exports = (data ?? []).map(toSummary);
      return jsonResponse({ exports, count: exports.length });
    }

    if (req.method === "POST") {
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

    return errorResponse("Method not allowed", 405);
  // deno-lint-ignore no-explicit-any
  } catch (error: any) {
    console.error("balance-exports error:", error);
    if (error?.status) return errorResponse(error.message, error.status);
    return errorResponse(error?.message || "Erreur interne", 500);
  }
});
