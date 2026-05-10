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

  // ─── RH L2 (10) ───
  { name: "compute_smig", category: "RH L2", args: { pays: "CI" }, validate: (r: any) => r?.ok && r?.smig_fcfa > 0 ? null : "smig ko" },
  { name: "compute_salaire_net", category: "RH L2", args: { salaire_brut_centimes: "50000000", pays: "CI" }, validate: (r: any) => r?.ok && BigInt(r?.salaire_net_centimes) > 0n ? null : "net ko" },
  { name: "compute_iuts", category: "RH L2", args: { salaire_brut_centimes: "20000000" }, validate: (r: any) => r?.ok ? null : "iuts ko" },
  { name: "compute_its", category: "RH L2", args: { salaire_imposable_centimes: "200000000", pays: "CI" }, validate: (r: any) => r?.ok && BigInt(r?.its_centimes) > 0n ? null : "its ko" },
  { name: "compute_taxes_parafiscales", category: "RH L2", args: { salaire_brut_centimes: "50000000", pays: "CI" }, validate: (r: any) => r?.ok && r?.taxes?.length > 0 ? null : "parafiscales ko" },
  { name: "compute_conges_payes", category: "RH L2", args: { salaire_mensuel_brut_centimes: "30000000", mois_travailles: 12, jours_deja_pris: 10 }, validate: (r: any) => r?.ok && r?.jours_acquis === 30 ? null : `conges ko: ${r?.jours_acquis}` },
  { name: "compute_indemnite_licenciement", category: "RH L2", args: { salaire_moyen_centimes: "30000000", annees_anciennete: 7 }, validate: (r: any) => r?.ok ? null : "licenciement ko" },
  { name: "compute_prime_anciennete", category: "RH L2", args: { salaire_base_centimes: "30000000", annees_anciennete: 5 }, validate: (r: any) => r?.ok && r?.taux === 0.05 ? null : `anciennete ko: ${r?.taux}` },
  { name: "generate_fiche_paie", category: "RH L2", args: { salarie: { nom: "Test", matricule: "M001" }, periode: "2025-01", pays: "CI", salaire_base_centimes: "50000000", primes_centimes: "5000000", annees_anciennete: 3 }, validate: (r: any) => r?.ok && r?.fiche?.lignes_brut?.length > 0 ? null : "fiche ko" },
  { name: "simulate_embauche_cost", category: "RH L2", args: { salaire_brut_mensuel_centimes: "60000000", pays: "CI", duree_mois: 12 }, validate: (r: any) => r?.ok && BigInt(r?.cout_total_centimes) > 0n ? null : "embauche ko" },

  // ─── IMMOBILIER L2 (5) ───
  { name: "compute_loyer_revise", category: "IMMO L2", args: { loyer_actuel_centimes: "30000000", inflation_pct: 3 }, validate: (r: any) => r?.ok && BigInt(r?.loyer_revise_centimes) > BigInt(r?.loyer_actuel_centimes) ? null : "loyer ko" },
  { name: "compute_depot_garantie", category: "IMMO L2", args: { loyer_mensuel_centimes: "30000000", usage: "habitation" }, validate: (r: any) => r?.ok && r?.nb_mois === 2 ? null : "depot ko" },
  { name: "compute_taxe_fonciere", category: "IMMO L2", args: { valeur_locative_annuelle_centimes: "360000000", pays: "CI", type: "bati" }, validate: (r: any) => r?.ok && r?.taux === 0.04 ? null : "taxe_fonciere ko" },
  { name: "compute_charges_copropriete", category: "IMMO L2", args: { charges_annuelles_totales_centimes: "12000000000", lots: [{ id: "A1", tantieme: 250 }, { id: "A2", tantieme: 250 }, { id: "A3", tantieme: 500 }] }, validate: (r: any) => r?.ok && r?.repartition_par_lot?.length === 3 ? null : "copro ko" },
  { name: "compute_rendement_locatif", category: "IMMO L2", args: { prix_achat_centimes: "5000000000000", loyer_mensuel_centimes: "30000000" }, validate: (r: any) => r?.ok && r?.rendement_brut_pct > 0 ? null : "rendement ko" },

  // ─── RETAIL L2 (5) ───
  { name: "compute_marge_brute", category: "RETAIL L2", args: { ca_ht_centimes: "10000000000", cout_achat_marchandises_centimes: "6000000000" }, validate: (r: any) => r?.ok && r?.taux_marge_pct === 40 ? null : `marge ko: ${r?.taux_marge_pct}` },
  { name: "compute_taux_marque", category: "RETAIL L2", args: { prix_achat_centimes: "100000", prix_vente_centimes: "150000" }, validate: (r: any) => r?.ok && r?.taux_marque_pct > 0 && r?.taux_marge_pct === 50 ? null : "taux ko" },
  { name: "compute_rotation_stocks", category: "RETAIL L2", args: { ca_ou_achats_centimes: "12000000000", stock_debut_centimes: "1000000000", stock_fin_centimes: "1000000000" }, validate: (r: any) => r?.ok && r?.rotation_par_an === 12 ? null : `rotation ko: ${r?.rotation_par_an}` },
  { name: "compute_point_mort", category: "RETAIL L2", args: { charges_fixes_centimes: "1000000000", ca_total_centimes: "5000000000", charges_variables_centimes: "3000000000" }, validate: (r: any) => r?.ok && BigInt(r?.point_mort_chiffre_centimes) > 0n ? null : "point_mort ko" },
  { name: "compute_panier_moyen", category: "RETAIL L2", args: { ca_total_centimes: "100000000", nb_transactions: 1000, nb_clients_uniques: 250, duree_retention_annees: 3, marge_brute_pct: 30 }, validate: (r: any) => r?.ok && BigInt(r?.panier_moyen_centimes) > 0n ? null : "panier ko" },

  // ─── DOCUMENTAIRE L2 (5) ───
  { name: "classify_document", category: "DOC L2", args: { text_content: "Facture n° INV-2025-001 - TVA 18% - Net a payer 1 500 000 FCFA - Echeance 30 jours" }, validate: (r: any) => r?.ok && r?.detected_type === "facture" ? null : `classify ko: ${r?.detected_type}` },
  { name: "extract_document_metadata", category: "DOC L2", args: { text_content: "Facture du 15/01/2025. Montant 1 500 000 FCFA. Email contact@atlas.ci. SARL ATLAS STUDIO." }, validate: (r: any) => r?.ok && r?.dates?.length > 0 && r?.amounts?.length > 0 ? null : "metadata ko" },
  { name: "compute_legal_retention", category: "DOC L2", args: { document_type: "facture", date_creation: "2024-01-15" }, validate: (r: any) => r?.ok && r?.duree_annees === 10 ? null : "retention ko" },
  { name: "detect_document_duplicates", category: "DOC L2", args: { documents: [{ id: "d1", content_hash: "abc" }, { id: "d2", content_hash: "abc" }, { id: "d3", content_hash: "xyz" }] }, validate: (r: any) => r?.ok && r?.duplicates?.length >= 1 ? null : "dup ko" },
  { name: "generate_archive_index", category: "DOC L2", args: { documents: [{ id: "d1", type: "facture", title: "Test facture", date_creation: "2024-01-15", amount_centimes: "100000000" }], format: "csv" }, validate: (r: any) => r?.ok && r?.archive_index?.length > 0 ? null : "archive ko" },

  // ─── AUDIT L2 (5) ───
  { name: "compute_audit_sample", category: "AUDIT L2", args: { population_size: 500, confidence_level: 0.95, expected_error_rate: 0.05, tolerable_error_rate: 0.10 }, validate: (r: any) => r?.ok && r?.sample_size_recommandee > 0 ? null : "sample ko" },
  { name: "compute_materiality", category: "AUDIT L2", args: { resultat_avant_impot_centimes: "1000000000", approche: "resultat" }, validate: (r: any) => r?.ok && BigInt(r?.seuil_signification_centimes) > 0n ? null : "materiality ko" },
  { name: "test_balance_general", category: "AUDIT L2", args: { balance: [{ compte: "411000", solde_debiteur_centimes: "1000000", solde_crediteur_centimes: "0" }, { compte: "701000", solde_debiteur_centimes: "0", solde_crediteur_centimes: "1000000" }] }, validate: (r: any) => r?.ok && r?.equilibre === true ? null : `balance ko: ${r?.ecart_centimes}` },
  { name: "analyze_variance_interperiode", category: "AUDIT L2", args: { exercice_n: [{ compte: "411", solde_centimes: "5000000000" }], exercice_n_minus_1: [{ compte: "411", solde_centimes: "1000000000" }] }, validate: (r: any) => r?.ok && r?.total_significatifs > 0 ? null : "variance ko" },
  { name: "score_internal_control", category: "AUDIT L2", args: { responses: [{ category: "environnement", question: "Charte ethique?", reponse: "oui" }, { category: "risques", question: "Cartographie?", reponse: "partiel" }, { category: "activites", question: "Separation taches?", reponse: "oui" }, { category: "information", question: "Reporting?", reponse: "oui" }, { category: "pilotage", question: "Audit interne?", reponse: "non" }] }, validate: (r: any) => r?.ok && typeof r?.score_global === "number" ? null : "control ko" },

  // ─── TRESORERIE L2 (5) ───
  { name: "forecast_cashflow", category: "TRESO L2", args: { solde_initial_centimes: "100000000", encaissements: [{ semaine: 1, montant_centimes: "50000000" }, { semaine: 5, montant_centimes: "200000000" }], decaissements: [{ semaine: 2, montant_centimes: "300000000" }], horizon_semaines: 8 }, validate: (r: any) => r?.ok && r?.forecast?.length === 8 ? null : "cashflow ko" },
  { name: "compute_decouvert_cost", category: "TRESO L2", args: { montant_decouvert_centimes: "10000000000", duree_jours: 30, taux_decouvert_annuel: 0.15, cpfd_pct: 0.0005, frais_fixes_centimes: "500000" }, validate: (r: any) => r?.ok && BigInt(r?.cout_total_centimes) > 0n ? null : "decouvert ko" },
  { name: "compute_escompte_commercial", category: "TRESO L2", args: { valeur_nominale_centimes: "100000000000", taux_escompte_pct: 2, jours_avant_echeance: 60, taux_placement_alternatif_pct: 5 }, validate: (r: any) => r?.ok && BigInt(r?.escompte_centimes) > 0n ? null : "escompte ko" },
  { name: "compute_factoring_cost", category: "TRESO L2", args: { montant_creance_centimes: "100000000000", jours_avant_echeance: 60, commission_factoring_pct: 0.5, taux_financement_annuel_pct: 8, retenue_garantie_pct: 10 }, validate: (r: any) => r?.ok && BigInt(r?.cout_total_centimes) > 0n ? null : "factoring ko" },
  { name: "score_bank_health", category: "TRESO L2", args: { bank_name: "Test Bank", criteria: { reactivite_sav: 4, competitivite_couts: 3, couverture_geo: 5, solidite_financiere: 5, digital_quality: 4 } }, validate: (r: any) => r?.ok && r?.score_global > 0 ? null : "bank ko" },

  // ─── COMMERCIAL L2 (5) ───
  { name: "score_lead", category: "COMM L2", args: { budget_confirme: true, decideur_identifie: true, besoin_exprime: "urgent", timeline_mois: 2, industrie_strategique: true, taille_entreprise: "ETI" }, validate: (r: any) => r?.ok && r?.classement === "hot" ? null : `lead ko: ${r?.classement}` },
  { name: "compute_commission", category: "COMM L2", args: { ca_realise_centimes: "100000000000", quota_centimes: "80000000000", paliers: [{ taux: 0.05, jusqua_centimes: "80000000000" }, { taux: 0.10, jusqua_centimes: "infini" }], bonus_quota_pct: 5 }, validate: (r: any) => r?.ok && BigInt(r?.commission_totale_centimes) > 0n ? null : "comm ko" },
  { name: "forecast_pipeline", category: "COMM L2", args: { opportunites: [{ id: "o1", montant_centimes: "10000000000", stage: "negociation" }, { id: "o2", montant_centimes: "5000000000", stage: "proposition" }] }, validate: (r: any) => r?.ok && BigInt(r?.total_pondere_centimes) > 0n ? null : "pipeline ko" },
  { name: "score_churn_risk", category: "COMM L2", args: { derniere_commande_jours: 200, frequence_actuelle: 1, frequence_baseline: 5, tickets_critiques_ouverts: 1 }, validate: (r: any) => r?.ok && typeof r?.score_risque === "number" ? null : "churn ko" },
  { name: "analyze_customer_segment", category: "COMM L2", args: { clients: [{ id: "c1", recence_jours: 10, frequence: 20, montant_total_centimes: "10000000000" }, { id: "c2", recence_jours: 400, frequence: 1, montant_total_centimes: "100000000" }, { id: "c3", recence_jours: 30, frequence: 12, montant_total_centimes: "5000000000" }] }, validate: (r: any) => r?.ok && Object.keys(r?.segments || {}).length > 0 ? null : "rfm ko" },

  // ─── FISCAL L2 (5) ───
  { name: "compute_irvm", category: "FISC L2", args: { montant_brut_centimes: "100000000", pays: "CI", beneficiaire_residence: "resident" }, validate: (r: any) => r?.ok && r?.taux_applique === 0.10 ? null : "irvm ko" },
  { name: "compute_droit_enregistrement", category: "FISC L2", args: { type_acte: "vente_immobiliere", montant_acte_centimes: "5000000000000", pays: "CI" }, validate: (r: any) => r?.ok && r?.taux === 0.04 ? null : "droit_enr ko" },
  { name: "compute_minimum_forfaitaire", category: "FISC L2", args: { ca_ht_centimes: "1000000000000", is_calcule_centimes: "100000000", pays: "CI" }, validate: (r: any) => r?.ok && BigInt(r?.impot_du_centimes) > 0n ? null : "imf ko" },
  { name: "forecast_dsf", category: "FISC L2", args: { pays: "CI", exercice: "2025", ca_ht_centimes: "5000000000000", benefice_imposable_centimes: "1000000000000", taux_is_pays: 0.25 }, validate: (r: any) => r?.ok && BigInt(r?.total_a_payer_centimes) > 0n ? null : "dsf ko" },
  { name: "compute_credit_tva", category: "FISC L2", args: { tva_collectee_centimes: "100000000", tva_deductible_centimes: "200000000", pays: "CI", type_activite: "exportateur" }, validate: (r: any) => r?.ok && r?.position === "credit_tva" ? null : "credit_tva ko" },

  // ─── JURIDIQUE L2 (5) ───
  { name: "compute_capital_minimum", category: "JURI L2", args: { forme_juridique: "SA", capital_propose_centimes: "1500000000" }, validate: (r: any) => r?.ok && r?.capital_min_fcfa === 10_000_000 ? null : "capital ko" },
  { name: "validate_societe_creation", category: "JURI L2", args: { forme_juridique: "SARL", pays: "CI", nb_associes: 2, capital_propose_centimes: "200000000", statuts_rediges: true, rccm_depose: true, publication_jal: true, numero_ifu_obtenu: true, declaration_existence_fiscale: true }, validate: (r: any) => r?.ok && typeof r?.taux_conformite_pct === "number" ? null : "creation ko" },
  { name: "forecast_ag_quorum", category: "JURI L2", args: { forme_juridique: "SA", type_assemblee: "AGE", capital_total_centimes: "1000000000000", capital_present_centimes: "600000000000", voix_pour: 700, voix_contre: 200, premiere_convocation: true }, validate: (r: any) => r?.ok && r?.quorum_atteint === true ? null : "quorum ko" },
  { name: "compute_mise_demeure_delai", category: "JURI L2", args: { date_mise_demeure: "2025-01-01", montant_principal_centimes: "10000000000", taux_legal_annuel: 0.06 }, validate: (r: any) => r?.ok && r?.date_limite_executoire ? null : "med ko" },
  { name: "analyze_contract_clauses", category: "JURI L2", args: { contract_text: "Entre les soussignes, d'une part X SA et d'autre part Y SARL. Le contrat a pour objet la prestation de services. Prix : 5 000 000 FCFA. Duree : 12 mois. Tribunal de commerce d'Abidjan competent. Resiliation anticipee possible avec preavis 3 mois." }, validate: (r: any) => r?.ok && r?.score_completude > 50 ? null : `clauses ko: ${r?.score_completude}` },

  // ─── MARKETING L2 (5) ───
  { name: "compute_cac_ltv_ratio", category: "MKT L2", args: { marketing_spend_centimes: "100000000000", nb_nouveaux_clients: 100, panier_moyen_centimes: "500000000", frequence_achats_par_an: 4, duree_retention_annees: 3, marge_brute_pct: 30 }, validate: (r: any) => r?.ok && r?.ratio_ltv_cac > 0 ? null : "cac/ltv ko" },
  { name: "compute_campaign_roi", category: "MKT L2", args: { campagne_nom: "Test campaign", cout_campagne_centimes: "10000000000", revenu_attribue_centimes: "40000000000", nb_conversions: 100 }, validate: (r: any) => r?.ok && r?.roas === 4 ? null : `roi ko: ${r?.roas}` },
  { name: "ab_test_significance", category: "MKT L2", args: { variant_a: { nom: "A", impressions: 5000, conversions: 100 }, variant_b: { nom: "B", impressions: 5000, conversions: 150 }, niveau_confiance: 0.95 }, validate: (r: any) => r?.ok && r?.significatif === true ? null : "ab ko" },
  { name: "compute_conversion_funnel", category: "MKT L2", args: { steps: [{ nom: "Visite", visiteurs: 10000 }, { nom: "Inscription", visiteurs: 1000 }, { nom: "Premier achat", visiteurs: 200 }] }, validate: (r: any) => r?.ok && r?.taux_global_pct === 2 ? null : `funnel ko: ${r?.taux_global_pct}` },
  { name: "forecast_growth_compound", category: "MKT L2", args: { valeur_initiale: 1000, taux_croissance_mensuel_pct: 5, horizon_mois: 12 }, validate: (r: any) => r?.ok && r?.valeur_finale > r?.projection_mensuelle?.[0]?.valeur ? null : "growth ko" },

  // ─── PRODUCTIVITE L2 (5) ───
  { name: "prioritize_tasks", category: "PROD L2", args: { tasks: [{ id: "t1", title: "Bug prod", urgent: true, important: true, estimated_hours: 4 }, { id: "t2", title: "Strategie 2026", urgent: false, important: true }, { id: "t3", title: "Email reactif", urgent: true, important: false }, { id: "t4", title: "Newsletter", urgent: false, important: false }] }, validate: (r: any) => r?.ok && r?.matrice?.Q1_faire_maintenant?.length === 1 ? null : "eisenhower ko" },
  { name: "compute_meeting_efficiency", category: "PROD L2", args: { duree_minutes: 60, nb_participants: 5, taux_horaire_moyen_centimes: "5000000", decisions_prises: 3, actions_definies: 5, alignement_atteint: 2 }, validate: (r: any) => r?.ok && BigInt(r?.cout_reunion_centimes) > 0n ? null : "meeting ko" },
  { name: "schedule_optimization", category: "PROD L2", args: { events: [{ date: "2025-01-15", debut_heure: "10:00", fin_heure: "11:00", titre: "Standup" }, { date: "2025-01-15", debut_heure: "14:00", fin_heure: "15:00", titre: "Review" }] }, validate: (r: any) => r?.ok && r?.focus_blocks_disponibles?.length > 0 ? null : "schedule ko" },
  { name: "estimate_project_duration", category: "PROD L2", args: { taches: [{ id: "t1", libelle: "Setup", optimiste_jours: 2, vraisemblable_jours: 3, pessimiste_jours: 5 }, { id: "t2", libelle: "Dev", optimiste_jours: 10, vraisemblable_jours: 15, pessimiste_jours: 25 }] }, validate: (r: any) => r?.ok && r?.total_esperance_jours > 0 ? null : "pert ko" },
  { name: "compute_team_capacity", category: "PROD L2", args: { nb_membres: 10, jours_ouvrables_periode: 20, meeting_overhead_pct: 15, conges_pct: 10, context_switch_pct: 20 }, validate: (r: any) => r?.ok && r?.capacite_nette_jh > 0 && r?.capacite_nette_jh < r?.capacite_brute_jh ? null : "capacity ko" },

  // ─── SUPPORT L2 (5) ───
  { name: "compute_csat_nps", category: "SUPP L2", args: { scores: [10, 9, 8, 9, 10, 7, 6, 5, 9, 10], type: "both" }, validate: (r: any) => r?.ok && r?.csat && r?.nps ? null : "csat/nps ko" },
  { name: "score_ticket_priority", category: "SUPP L2", args: { impact_users_pct: 60, service_status: "down", has_workaround: false, sla_breached: true }, validate: (r: any) => r?.ok && r?.priority === "P0" ? null : `priority ko: ${r?.priority}` },
  { name: "compute_sla_compliance", category: "SUPP L2", args: { tickets: [{ id: "t1", priority: "P1", created_at: "2025-01-10T10:00:00Z", first_response_at: "2025-01-10T11:00:00Z", resolved_at: "2025-01-10T15:00:00Z", status: "resolved" }] }, validate: (r: any) => r?.ok && r?.first_response_compliance_pct === 100 ? null : "sla ko" },
  { name: "predict_resolution_time", category: "SUPP L2", args: { category: "Bug technique", complexity: "medium", team_load_pct: 70, created_at: "2025-01-15T10:00:00Z", historical_resolutions_hours: [3, 4, 5, 6, 4, 3, 5, 4, 6, 5] }, validate: (r: any) => r?.ok && r?.estimated_hours > 0 ? null : "predict ko" },
  { name: "analyze_ticket_categories", category: "SUPP L2", args: { tickets_current: [{ id: "t1", category: "Bug", resolution_hours: 4, status: "resolved" }, { id: "t2", category: "Bug", resolution_hours: 6, status: "resolved" }, { id: "t3", category: "Question", resolution_hours: 1, status: "resolved" }] }, validate: (r: any) => r?.ok && r?.top_categories?.length > 0 ? null : "ticket_cat ko" },

  // ─── WORKFLOWS orchestres (5) ───
  { name: "workflow_audit_complet_societe", category: "WORKFLOWS", args: { raison_sociale: "Test SA", exercice: "2025", entries: [{ compte: "411000", debit_centimes: "1000000", credit_centimes: "0", date: "2025-01-15", numero_piece: "P001" }, { compte: "701000", debit_centimes: "0", credit_centimes: "1000000", date: "2025-01-15", numero_piece: "P001" }] }, validate: (r: any) => r?.ok && r?.synthese?.score_audit !== undefined ? null : "audit workflow ko" },
  { name: "workflow_closing_mensuel", category: "WORKFLOWS", args: { raison_sociale: "Test SA", mois: "2025-01", entries: [{ compte: "101000", debit_centimes: "0", credit_centimes: "10000000", date: "2025-01-01", numero_piece: "P000" }, { compte: "521000", debit_centimes: "10000000", credit_centimes: "0", date: "2025-01-01", numero_piece: "P000" }] }, validate: (r: any) => r?.ok && r?.report_markdown?.length > 0 ? null : "closing workflow ko" },
  { name: "workflow_due_diligence_lite", category: "WORKFLOWS", args: { raison_sociale: "Cible SA", inputs_financiers: { totalActif: "100000000000", capitauxPropres: "30000000000", dettesFinancieres: "20000000000", immobilisationsNettes: "60000000000", chiffreAffaires: "50000000000", achatsConsommes: "20000000000", chargesPersonnel: "10000000000", impotsTaxes: "2000000000", resultatNet: "5000000000" } }, validate: (r: any) => r?.ok && ["go", "nogo", "approfondir"].includes(r?.recommendation) ? null : "dd ko" },
  { name: "workflow_simulation_recrutement", category: "WORKFLOWS", args: { poste: "Developpeur senior", salaire_brut_mensuel_centimes: "80000000", pays: "CI", duree_mois: 12, annees_anciennete: 3 }, validate: (r: any) => r?.ok && r?.smig_check && r?.cout_total_centimes ? null : "recrutement workflow ko" },
  { name: "workflow_analyse_client_360", category: "WORKFLOWS", args: { client_id: "C001", nom_client: "ACME SA", derniere_commande_jours: 45, frequence_actuelle: 2, frequence_baseline: 5, panier_moyen_centimes: "500000000", nb_transactions_total: 24, marge_brute_pct: 30, cac_centimes: "5000000000", tickets_critiques_ouverts: 0 }, validate: (r: any) => r?.ok && ["P0_save", "P1_engage", "P2_growth", "P3_steady"].includes(r?.niveau_priorite) ? null : "client_360 ko" },

  // ─── WORKFLOWS v2 (3) ───
  { name: "workflow_closing_annuel", category: "WF v2", args: { raison_sociale: "Test SA", exercice: "2024", pays: "CI", entries: [{ compte: "411000", debit_centimes: "1000000", credit_centimes: "0", date: "2024-12-30" }, { compte: "701000", debit_centimes: "0", credit_centimes: "1000000", date: "2024-12-30" }] }, validate: (r: any) => r?.ok && r?.report_markdown ? null : "closing annuel ko" },
  { name: "workflow_paie_mensuelle", category: "WF v2", args: { raison_sociale: "Test SA", pays: "CI", periode: "2025-01", salaries: [{ id: "s1", nom: "Alice", salaire_base_centimes: "50000000" }, { id: "s2", nom: "Bob", salaire_base_centimes: "60000000" }] }, validate: (r: any) => r?.ok && BigInt(r?.total_brut_centimes) > 0n ? null : "paie mensuelle ko" },
  { name: "workflow_audit_juridique", category: "WF v2", args: { raison_sociale: "Test SA", forme_juridique: "SA", pays: "CI", capital_propose_centimes: "1500000000", nb_associes: 3, societe_creation_check: { statuts_rediges: true, rccm_depose: true, publication_jal: true, numero_ifu_obtenu: true, declaration_existence_fiscale: true } }, validate: (r: any) => r?.ok && typeof r?.score_juridique === "number" ? null : "audit juridique ko" },

  // ─── META-tools (3) ───
  { name: "load_domain_tools", category: "META", args: { domain: "rh" }, validate: (r: any) => r?.ok && r?.count > 0 ? null : "load_domain ko" },
  { name: "list_available_tools", category: "META", args: {}, validate: (r: any) => r?.ok && r?.total > 100 ? null : `list_tools ko: ${r?.total}` },
  { name: "describe_tool", category: "META", args: { tool_name: "compute_ratio" }, validate: (r: any) => r?.ok && r?.found && r?.tool?.name === "compute_ratio" ? null : "describe ko" },

  // ─── L3 Cockpit FA (8) ───
  { name: "compute_kpi_dashboard", category: "L3 Cockpit-FA", args: { ca_total_centimes: "100000000000", total_creances_centimes: "20000000000", total_dettes_centimes: "15000000000", tresorerie_centimes: "5000000000", total_actif_centimes: "200000000000", capitaux_propres_centimes: "60000000000" }, validate: (r: any) => r?.ok && r?.kpis?.autonomie_pct ? null : "kpi ko" },
  { name: "detect_cycle_breaks", category: "L3 Cockpit-FA", args: { pieces: [{ journal: "VE", numero: "001", date: "2025-01-01" }, { journal: "VE", numero: "002", date: "2025-01-02" }, { journal: "VE", numero: "005", date: "2025-01-05" }] }, validate: (r: any) => r?.ok && r?.ruptures?.length === 2 ? null : `cycle ko: ${r?.ruptures?.length}` },
  { name: "forecast_dso_evolution", category: "L3 Cockpit-FA", args: { historique_mensuel: [{ mois: "2025-01", creances_centimes: "10000000000", ca_mensuel_centimes: "5000000000" }, { mois: "2025-02", creances_centimes: "12000000000", ca_mensuel_centimes: "5000000000" }, { mois: "2025-03", creances_centimes: "15000000000", ca_mensuel_centimes: "5000000000" }] }, validate: (r: any) => r?.ok && r?.dso_moyen_jours > 0 ? null : "dso ko" },
  { name: "compute_grand_livre_summary", category: "L3 Cockpit-FA", args: { entries: [{ compte: "411000", debit_centimes: "1000000", credit_centimes: "0", date: "2025-01-01" }, { compte: "411000", debit_centimes: "0", credit_centimes: "500000", date: "2025-01-05" }] }, validate: (r: any) => r?.ok && r?.total_comptes > 0 ? null : "gl summary ko" },
  { name: "validate_clos_exercice", category: "L3 Cockpit-FA", args: { ecritures_lettrees_pct: 95, provisions_passees: true, amortissements_passes: true, inventaire_realise: true, rapprochement_bancaire_complet: true, ecarts_comptes_resolus: true, declarations_fiscales_a_jour: true }, validate: (r: any) => r?.ok && r?.pret_a_cloturer === true ? null : "clos exercice ko" },
  { name: "compute_immobilisations_amortissements", category: "L3 Cockpit-FA", args: { immobilisations: [{ id: "i1", libelle: "Vehicule", valeur_origine_centimes: "10000000000", date_acquisition: "2023-01-01", duree_annees: 5, methode: "lineaire" }], date_calcul: "2025-12-31" }, validate: (r: any) => r?.ok && BigInt(r?.total_dotation_annuelle_centimes) > 0n ? null : "amortissements ko" },
  { name: "detect_ecart_inventaire", category: "L3 Cockpit-FA", args: { stock_comptable: [{ reference: "REF1", libelle: "Article 1", quantite_comptable: 100, pu_centimes: "100000" }], stock_physique: [{ reference: "REF1", quantite_physique: 95 }] }, validate: (r: any) => r?.ok && r?.ecarts_detectes?.length === 1 ? null : "ecart inv ko" },
  { name: "generate_situation_intermediaire", category: "L3 Cockpit-FA", args: { raison_sociale: "Test", date_situation: "2025-06-30", entries_jusqu_a_date: [{ compte: "701000", debit_centimes: "0", credit_centimes: "10000000000", date: "2025-03-15" }] }, validate: (r: any) => r?.ok && BigInt(r?.ca_periode_centimes) > 0n ? null : "situation ko" },

  // ─── L3 WiseHR (6) ───
  { name: "compute_paie_batch", category: "L3 WiseHR", args: { pays: "CI", periode: "2025-01", salaries: [{ id: "s1", nom: "Alice", salaire_base_centimes: "50000000" }, { id: "s2", nom: "Bob", salaire_base_centimes: "60000000" }] }, validate: (r: any) => r?.ok && r?.detail_par_salarie?.length === 2 ? null : "paie batch ko" },
  { name: "compute_indemnite_transport", category: "L3 WiseHR", args: { montant_alloue_centimes: "5000000", pays: "CI" }, validate: (r: any) => r?.ok && r?.partie_exoneree_centimes ? null : "transport ko" },
  { name: "compute_heures_supp", category: "L3 WiseHR", args: { taux_horaire_centimes: "300000", heures_45_pct: 4, heures_50_pct: 2, heures_dimanche: 8 }, validate: (r: any) => r?.ok && r?.total_heures === 14 ? null : "hsupp ko" },
  { name: "validate_avenant_salaire", category: "L3 WiseHR", args: { salaire_actuel_centimes: "50000000", salaire_propose_centimes: "55000000", pays: "CI", smig_legal_centimes: "7500000" }, validate: (r: any) => r?.ok && r?.conformite === true ? null : "avenant ko" },
  { name: "compute_solde_tout_compte", category: "L3 WiseHR", args: { salaire_moyen_centimes: "50000000", conges_payes_restants_jours: 15, annees_anciennete: 5, type_rupture: "licenciement", pays: "CI" }, validate: (r: any) => r?.ok && r?.composition?.length > 0 ? null : "stc ko" },
  { name: "forecast_masse_salariale", category: "L3 WiseHR", args: { effectif_actuel: 20, cout_moyen_mensuel_centimes: "70000000", taux_augmentation_annuelle_pct: 3, recrutements_prevus: [], departs_prevus: [], horizon_mois: 12 }, validate: (r: any) => r?.ok && BigInt(r?.total_annuel_centimes) > 0n ? null : "masse sal ko" },

  // ─── L3 DueDeck (6) ───
  { name: "generate_lettre_affirmation", category: "L3 DueDeck", args: { raison_sociale: "Test SA", exercice: "2024", date_lettre: "2025-03-31", signataire: { nom: "Alice", titre: "DG" } }, validate: (r: any) => r?.ok && r?.lettre_markdown?.length > 100 ? null : "affirmation ko" },
  { name: "compute_risk_assessment_matrix", category: "L3 DueDeck", args: { risks: [{ id: "r1", description: "Fraude paie", category: "fraude", occurrence: 3, severite: 4, detectabilite: 2 }] }, validate: (r: any) => r?.ok && typeof r?.score_global_risque === "number" ? null : "risk matrix ko" },
  { name: "detect_round_tripping", category: "L3 DueDeck", args: { transactions: [{ id: "t1", date: "2025-01-01", emetteur: "A", receveur: "B", montant_centimes: "1000000000" }, { id: "t2", date: "2025-01-05", emetteur: "B", receveur: "C", montant_centimes: "1000000000" }, { id: "t3", date: "2025-01-10", emetteur: "C", receveur: "A", montant_centimes: "1000000000" }] }, validate: (r: any) => r?.ok && r?.schemas_detectes?.length > 0 ? null : "round trip ko" },
  { name: "compute_substantive_test", category: "L3 DueDeck", args: { bilan_n: { actif: [{ libelle: "Immo", montant_centimes: "100000000000" }, { libelle: "Tresorerie", montant_centimes: "20000000000" }], passif: [{ libelle: "Capital", montant_centimes: "50000000000" }, { libelle: "Dettes", montant_centimes: "70000000000" }] } }, validate: (r: any) => r?.ok && r?.recouvrement?.ok === true ? null : "substantive ko" },
  { name: "analyze_journal_entries_anomalies", category: "L3 DueDeck", args: { entries: [{ date: "2025-12-30", journal: "OD", compte: "471000", montant_centimes: "100000000000", libelle: "Provision exceptionnelle" }], date_cloture: "2025-12-31" }, validate: (r: any) => r?.ok && r?.anomalies?.length > 0 ? null : "JET ko" },
  { name: "generate_audit_report", category: "L3 DueDeck", args: { raison_sociale: "Test SA", exercice: "2024", date_rapport: "2025-04-15", auditeur_nom: "Jean Cabinet", opinion: "sans_reserve" }, validate: (r: any) => r?.ok && r?.rapport_markdown?.length > 200 ? null : "audit report ko" },
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
