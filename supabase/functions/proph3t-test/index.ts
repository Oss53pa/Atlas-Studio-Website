// PROPH3T — Suite de tests d'integration des 28 L1 + 10 L2 tools
// Reservee aux admins. Appelle chaque tool avec des args synthetiques
// et reporte succes/echec + duree pour chaque tool.

import { corsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { runTool, type ToolName } from "../_shared/proph3t/tools.ts";

interface TestCase {
  name: ToolName;
  category: string;
  args: Record<string, unknown>;
  validate?: (result: unknown) => string | null;  // retourne erreur si fail
}

const TEST_CASES: TestCase[] = [
  // ─── Calcs L1 (5) ───
  {
    name: "compute_ratio",
    category: "Calcs L1",
    args: {
      ratio_type: "fr",
      inputs: { capitauxPropres: "10000000", dettesFinancieres: "5000000", immobilisationsNettes: "8000000" },
    },
    validate: (r: any) => r?.value !== undefined ? null : "value manquante",
  },
  {
    name: "compute_tva",
    category: "Calcs L1",
    args: { base_ht_centimes: "100000000", country: "CI", rate_type: "standard" },
    validate: (r: any) => r?.totalTtc ? null : "totalTtc manquant",
  },
  {
    name: "apply_prorata_360",
    category: "Calcs L1",
    args: { amount_centimes: "120000000", days: 90 },
    validate: (r: any) => r?.result_centimes === "30000000" ? null : `resultat attendu 30000000, recu ${r?.result_centimes}`,
  },
  {
    name: "format_money_fcfa",
    category: "Calcs L1",
    args: { centimes: "1234567800" },
    validate: (r: any) => r?.formatted?.includes("FCFA") ? null : "format FCFA absent",
  },
  {
    name: "convert_currency",
    category: "Calcs L1",
    args: { amount_centimes: "1000000", from_code: "XOF", to_code: "EUR" },
    validate: (r: any) => r?.amount_centimes !== undefined ? null : "conversion vide",
  },

  // ─── Reasoning L1 (4) ───
  {
    name: "plan_task",
    category: "Reasoning L1",
    args: {
      task: "Calculer le BFR de la societe XYZ",
      steps: [
        { description: "Recuperer les donnees bilan" },
        { description: "Appeler compute_ratio bfr" },
      ],
    },
    validate: (r: any) => r?.plan?.length === 2 ? null : "plan vide",
  },
  {
    name: "chain_of_thought",
    category: "Reasoning L1",
    args: {
      question: "Le ratio d'autonomie est-il sain ?",
      reasoning_steps: ["Calculer capitaux propres / total bilan", "Comparer a la norme 30%"],
      conclusion: "Le ratio est de 35%, donc sain",
      confidence: 85,
    },
    validate: (r: any) => r?.reasoning?.confidence === 85 ? null : "confidence invalide",
  },
  {
    name: "verify_hypothesis",
    category: "Reasoning L1",
    args: {
      hypothesis: "L'entreprise est en zone de detresse Altman",
      evidence_for: ["Z-Score = 0.8"],
      evidence_against: ["Tresorerie positive"],
    },
    validate: (r: any) => ["confirmed", "rejected", "uncertain"].includes(r?.verdict) ? null : "verdict invalide",
  },
  {
    name: "route_to_model",
    category: "Reasoning L1",
    args: { task_type: "analytical", user_has_byok: { anthropic: true } },
    validate: (r: any) => r?.recommended?.provider ? null : "pas de provider",
  },

  // ─── Memory L1 (5) ───
  {
    name: "save_episodic_memory",
    category: "Memory L1",
    args: {
      event_type: "test_integration",
      event_data: { test: true, ts: new Date().toISOString() },
    },
    validate: (r: any) => r?.ok && r?.id ? null : "save_episodic ko",
  },
  {
    name: "save_semantic_memory",
    category: "Memory L1",
    args: {
      scope: "global",
      fact: "Test integration : la TVA standard CI est 18%",
      source: "manual",
      confidence: 1.0,
    },
    validate: (r: any) => r?.ok && r?.id ? null : "save_semantic ko",
  },
  {
    name: "recall_similar_cases",
    category: "Memory L1",
    args: { query: "TVA Cote d'Ivoire", scope: "both", top_k: 3 },
    validate: (r: any) => r?.ok ? null : "recall ko",
  },

  // ─── RAG L1 (3) ───
  {
    name: "search_app_knowledge",
    category: "RAG L1",
    args: { query: "SYSCOHADA classe 4", top_k: 3 },
    validate: (r: any) => r?.ok ? null : "search_app ko",
  },
  // index_document : skip (effet de bord, on testera avec un cas dedie)

  // ─── Output L1 (3) ───
  {
    name: "generate_report",
    category: "Output L1",
    args: {
      title: "Test rapport",
      sections: [
        { heading: "Section 1", content: "Contenu 1" },
        { heading: "Section 2", content: "Contenu 2" },
      ],
      format: "markdown",
    },
    validate: (r: any) => r?.report?.includes("Test rapport") ? null : "rapport vide",
  },
  {
    name: "log_decision",
    category: "Output L1",
    args: {
      decision: "Test : approuve",
      rationale: "Suite tests integration",
      confidence: 95,
    },
    validate: (r: any) => r?.ok ? null : "log_decision ko",
  },

  // ─── Security L1 (3) ───
  {
    name: "verify_rls_context",
    category: "Security L1",
    args: { user_id: "00000000-0000-0000-0000-000000000000", table_to_test: "proph3t_tools" },
    validate: (r: any) => r?.ok ? null : "verify_rls ko",
  },
  {
    name: "audit_trail_write",
    category: "Security L1",
    args: {
      action: "test_integration",
      content: { suite: "proph3t-test", ts: new Date().toISOString() },
    },
    validate: (r: any) => r?.ok && r?.hash ? null : "audit_trail ko",
  },
  {
    name: "check_compliance",
    category: "Security L1",
    args: {
      mode: "strict",
      payload: { resultat: "1234567 FCFA" },
      citations: [{ tool: "search_app_knowledge", hits: ["..."] }],
      confidence: 85,
    },
    validate: (r: any) => r?.ok ? null : "check_compliance ko",
  },

  // ─── Data legacy ───
  {
    name: "get_financial_data",
    category: "Data legacy",
    args: { society_id: "test", indicator: "CA" },
    validate: (r: any) => r?.not_implemented === true ? null : "stub manquant",
  },

  // ─── FINANCE L2 (10) ───
  {
    name: "parse_grand_livre",
    category: "FINANCE L2",
    args: {
      format: "csv",
      content: "date,piece,compte,libelle,debit,credit\n2025-01-01,P001,411000,Vente,1000000,0\n2025-01-01,P001,701000,Vente HT,0,1000000\n",
      decimal_separator: ".",
      thousand_separator: "",
    },
    validate: (r: any) => r?.ok && r?.equilibre ? null : `parse_gl ko : equilibre=${r?.equilibre}`,
  },
  {
    name: "generate_balance_sheet",
    category: "FINANCE L2",
    args: {
      entries: [
        { compte: "101000", debit_centimes: "0", credit_centimes: "10000000" },
        { compte: "201000", debit_centimes: "8000000", credit_centimes: "0" },
        { compte: "521000", debit_centimes: "2000000", credit_centimes: "0" },
      ],
      exercice: "2025",
      raison_sociale: "Test SA",
    },
    validate: (r: any) => r?.ok && r?.actif?.total_centimes ? null : "bilan ko",
  },
  {
    name: "generate_compte_resultat",
    category: "FINANCE L2",
    args: {
      entries: [
        { compte: "701000", debit_centimes: "0", credit_centimes: "5000000" },
        { compte: "601000", debit_centimes: "3000000", credit_centimes: "0" },
      ],
      exercice: "2025",
      raison_sociale: "Test SA",
    },
    validate: (r: any) => r?.ok && r?.resultat_net_centimes ? null : "compte_resultat ko",
  },
  {
    name: "apply_benford_law",
    category: "FINANCE L2",
    args: {
      // Genere 100 montants conformes Benford (loi puissance)
      amounts_centimes: Array.from({ length: 100 }, () => {
        const d = Math.floor(Math.pow(10, Math.random() * 5)) + 1;
        return (d * 1000).toString();
      }),
    },
    validate: (r: any) => r?.ok && ["conforme","suspect","fraude_probable"].includes(r?.verdict) ? null : "benford ko",
  },
  {
    name: "reconcile_bank_statement",
    category: "FINANCE L2",
    args: {
      compta_entries: [
        { date: "2025-01-15", libelle: "Virement client X", debit_centimes: "500000", credit_centimes: "0" },
      ],
      bank_entries: [
        { date: "2025-01-16", libelle: "VIR REF X", debit_centimes: "0", credit_centimes: "500000" },
      ],
    },
    validate: (r: any) => r?.ok && r?.matched_count === 1 ? null : `reconciliation ko: matched=${r?.matched_count}`,
  },
  {
    name: "compute_irpp_uemoa",
    category: "FINANCE L2",
    args: { revenu_imposable_centimes: "800000000", pays: "CI", parts_fiscales: 1 },
    validate: (r: any) => r?.ok && BigInt(r?.impot_centimes) > 0n ? null : "irpp ko",
  },
  {
    name: "compute_is_uemoa",
    category: "FINANCE L2",
    args: { benefice_imposable_centimes: "1000000000", pays: "CI" },
    validate: (r: any) => r?.ok && r?.taux === 0.25 ? null : `is ko: taux=${r?.taux}`,
  },
  {
    name: "compute_cnss_contribution",
    category: "FINANCE L2",
    args: { salaire_brut_centimes: "30000000", pays: "CI" },
    validate: (r: any) => r?.ok && r?.taux_employeur > 0 ? null : "cnss ko",
  },
  {
    name: "validate_journal_entry",
    category: "FINANCE L2",
    args: {
      entries: [
        { numero_piece: "P001", compte: "411000", debit_centimes: "1000000", credit_centimes: "0", date: "2025-01-15" },
        { numero_piece: "P001", compte: "701000", debit_centimes: "0", credit_centimes: "1000000", date: "2025-01-15" },
      ],
    },
    validate: (r: any) => r?.ok && r?.valid === true ? null : `validate ko: errors=${JSON.stringify(r?.errors)}`,
  },
  {
    name: "detect_accounting_anomalies",
    category: "FINANCE L2",
    args: {
      entries: [
        { date: "2025-01-15", compte: "601000", debit_centimes: "10000000000", credit_centimes: "0" },
        { date: "2025-01-18", compte: "601000", debit_centimes: "5000000", credit_centimes: "0" }, // Saturday
      ],
    },
    validate: (r: any) => r?.ok ? null : "anomalies ko",
  },
];

interface TestResult {
  tool: string;
  category: string;
  ok: boolean;
  duration_ms: number;
  error?: string;
  preview?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await requireUser(req);

    // Verifier que l'user est admin
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      return errorResponse("Acces reserve aux admins", 403);
    }

    const t0 = Date.now();
    const results: TestResult[] = [];

    for (const tc of TEST_CASES) {
      const start = Date.now();
      try {
        const res = await runTool(tc.name, tc.args, { user_id: user.id });
        const duration = Date.now() - start;
        if (tc.validate) {
          const validationError = tc.validate(res);
          if (validationError) {
            results.push({
              tool: tc.name, category: tc.category, ok: false, duration_ms: duration,
              error: validationError,
              preview: JSON.stringify(res).slice(0, 200),
            });
            continue;
          }
        }
        results.push({
          tool: tc.name, category: tc.category, ok: true, duration_ms: duration,
          preview: JSON.stringify(res).slice(0, 150),
        });
      } catch (err) {
        results.push({
          tool: tc.name, category: tc.category, ok: false,
          duration_ms: Date.now() - start,
          error: (err as Error).message,
        });
      }
    }

    const total = results.length;
    const passed = results.filter(r => r.ok).length;
    const failed = total - passed;
    const byCategory: Record<string, { passed: number; failed: number }> = {};
    for (const r of results) {
      byCategory[r.category] ??= { passed: 0, failed: 0 };
      if (r.ok) byCategory[r.category].passed++;
      else byCategory[r.category].failed++;
    }

    return jsonResponse({
      total_duration_ms: Date.now() - t0,
      summary: { total, passed, failed, success_rate: Math.round((passed / total) * 100) },
      by_category: byCategory,
      results,
    });
  } catch (err) {
    const e = err as Error & { status?: number };
    return errorResponse(e.message, e.status ?? 500);
  }
});
