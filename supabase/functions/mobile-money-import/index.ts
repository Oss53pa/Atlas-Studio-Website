// Atlas Studio — Ingestion de relevés Mobile Money.
//
// Traite le Mobile Money comme une SOURCE DE DONNÉES (et pas seulement un moyen
// de paiement) : un relevé Orange Money / Wave / MTN / Moov / M-Pesa est
// normalisé, persisté, puis publié sur le DataBus pour être :
//   - rapproché en compta (Atlas F&A),
//   - audité (AtlasBanx : frais/agios abusifs),
//   - intégré au cash forecast (Cockpit F&A).
//
// Auth : JWT SSO de fédération (getFederationUser) → owner = compte Atlas Studio.
//
// POST {
//   provider, currency?, account_label?, account_msisdn?,
//   period_start?, period_end?, opening_balance?, closing_balance?,
//   source?='file', external_ref?, company_id?,
//   transactions: [{ occurred_at, direction, amount, fee?, balance_after?,
//                    counterparty?, counterparty_msisdn?, reference?,
//                    raw_label?, category?, raw? }],
//   publish_to?      // app cible sur le bus ; null = diffusion ; '' = ne pas publier
// }

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireFederationUser } from "../_shared/federation_auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

const PROVIDERS = [
  "orange_money", "wave", "mtn_momo", "moov_money",
  "free_money", "mpesa", "airtel_money", "other",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = await requireFederationUser(req);
    const body = await req.json().catch(() => ({}));

    if (!PROVIDERS.includes(body.provider)) {
      return errorResponse(`provider invalide (${PROVIDERS.join(", ")})`, 400);
    }
    const txInput = Array.isArray(body.transactions) ? body.transactions : [];
    if (txInput.length === 0) {
      return errorResponse("transactions requis (tableau non vide)", 400);
    }

    const currency = body.currency ?? "XOF";

    // 1. Normalise les transactions. Dédup intra-lot par référence (l'index
    //    unique partiel (statement_id, reference) rejetterait un doublon).
    const seen = new Set<string>();
    const norm = txInput
      .map((t: any) => ({
        owner_id: user.id,
        occurred_at: t.occurred_at,
        direction: t.direction === "credit" ? "credit" : "debit",
        amount: Number(t.amount) || 0,
        fee: Number(t.fee) || 0,
        balance_after: t.balance_after ?? null,
        counterparty: t.counterparty ?? null,
        counterparty_msisdn: t.counterparty_msisdn ?? null,
        reference: t.reference ?? null,
        raw_label: t.raw_label ?? null,
        category: t.category ?? null,
        raw: t.raw ?? null,
      }))
      .filter((r) => {
        if (!r.reference) return true;
        if (seen.has(r.reference)) return false;
        seen.add(r.reference);
        return true;
      });

    // 2. Crée le relevé (tx_count = lignes réellement retenues).
    const { data: stmt, error: stmtErr } = await supabaseAdmin
      .from("mobile_money_statements")
      .insert({
        owner_id: user.id,
        company_id: body.company_id ?? null,
        provider: body.provider,
        account_label: body.account_label ?? null,
        account_msisdn: body.account_msisdn ?? null,
        currency,
        period_start: body.period_start ?? null,
        period_end: body.period_end ?? null,
        opening_balance: body.opening_balance ?? null,
        closing_balance: body.closing_balance ?? null,
        source: body.source ?? "file",
        external_ref: body.external_ref ?? null,
        tx_count: norm.length,
      })
      .select("id")
      .single();

    if (stmtErr) return errorResponse(stmtErr.message, 400);

    // 3. Insère les transactions rattachées au relevé.
    const rows = norm.map((r) => ({ ...r, statement_id: stmt.id }));
    const { data: inserted, error: txErr } = await supabaseAdmin
      .from("mobile_money_transactions")
      .insert(rows)
      .select("id");

    if (txErr) return errorResponse(txErr.message, 400);

    // 4. Publie sur le DataBus (sauf si publish_to === '').
    let busObjectId: string | null = null;
    if (body.publish_to !== "") {
      const totalDebit = rows
        .filter((r) => r.direction === "debit")
        .reduce((s, r) => s + r.amount, 0);
      const totalCredit = rows
        .filter((r) => r.direction === "credit")
        .reduce((s, r) => s + r.amount, 0);
      const totalFees = rows.reduce((s, r) => s + r.fee, 0);

      const { data: busObj } = await supabaseAdmin
        .from("databus_objects")
        .insert({
          owner_id: user.id,
          company_id: body.company_id ?? null,
          producer_app: user.appId ?? "atlas-studio",
          consumer_app: body.publish_to ?? null,
          object_type: "mobile_money.statement",
          schema_version: 1,
          idempotency_key: `mm:${stmt.id}`,
          // Payload auto-suffisant : le consommateur a tout sans accès à la base centrale.
          payload: {
            statement_id: stmt.id,
            provider: body.provider,
            currency,
            account_msisdn: body.account_msisdn ?? null,
            period_start: body.period_start ?? null,
            period_end: body.period_end ?? null,
            opening_balance: body.opening_balance ?? null,
            closing_balance: body.closing_balance ?? null,
            totals: {
              debit: totalDebit,
              credit: totalCredit,
              fees: totalFees,
              count: rows.length,
            },
            transactions: rows.map((r) => ({
              occurred_at: r.occurred_at,
              direction: r.direction,
              amount: r.amount,
              fee: r.fee,
              balance_after: r.balance_after,
              counterparty: r.counterparty,
              counterparty_msisdn: r.counterparty_msisdn,
              reference: r.reference,
              raw_label: r.raw_label,
              category: r.category,
            })),
          },
        })
        .select("id")
        .single();
      busObjectId = busObj?.id ?? null;
    }

    return jsonResponse({
      statement_id: stmt.id,
      imported: inserted?.length ?? 0,
      published_object_id: busObjectId,
    });
  } catch (error: any) {
    console.error("mobile-money-import error:", error);
    if (error.status) return errorResponse(error.message, error.status);
    return errorResponse(error.message);
  }
});
