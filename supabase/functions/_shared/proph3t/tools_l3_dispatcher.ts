// Dispatcher pour les 60 tools L3 Phase 7 (12 apps × 5 tools).
// Permet d'ajouter les runners sans bloater tools.ts.

import * as advist from "./l3_advist.ts";
import * as atlasbanx from "./l3_atlasbanx.ts";
import * as atlastrade from "./l3_atlastrade.ts";
import * as cashpilot from "./l3_cashpilot.ts";
import * as journey from "./l3_cockpit_journey.ts";
import * as docjourney from "./l3_docjourney.ts";
import * as liass from "./l3_liasspilot.ts";
import * as table from "./l3_tablesmart.ts";
import * as atlasFa from "./l3_atlas_fa.ts";
import * as atlasLease from "./l3_atlas_lease.ts";
import * as mall from "./l3_atlas_mall_suite.ts";
import * as wisefm from "./l3_wisefm.ts";

export const L3_DISPATCHER: Record<string, (args: any) => any> = {
  // advist
  compute_honoraires_conseil: advist.computeHonorairesConseil,
  define_mission_scope: advist.defineMissionScope,
  generate_rapport_conseil: advist.generateRapportConseil,
  score_mission_complexite: advist.scoreMissionComplexite,
  optimize_mission_planning: advist.optimizeMissionPlanning,
  // atlasbanx
  compute_echeancier_credit: atlasbanx.computeEcheancierCredit,
  score_credit_demande: atlasbanx.scoreCreditDemande,
  execute_batch_virements: atlasbanx.executeBatchVirements,
  reconcile_interbank: atlasbanx.reconcileInterbank,
  alertes_prudentielles: atlasbanx.alertesPrudentielles,
  // atlastrade
  compute_frais_douane: atlastrade.computeFraisDouane,
  compute_marge_import: atlastrade.computeMargeImport,
  compute_hedging_fx: atlastrade.computeHedgingFx,
  check_trade_compliance: atlastrade.checkTradeCompliance,
  score_fournisseur_international: atlastrade.scoreFournisseurInternational,
  // cashpilot
  compute_pooling_tresorerie: cashpilot.computePoolingTresorerie,
  optimize_cash_allocation: cashpilot.optimizeCashAllocation,
  detect_flux_anormaux: cashpilot.detectFluxAnormaux,
  forecast_besoin_financement: cashpilot.forecastBesoinFinancement,
  compute_net_working_capital: cashpilot.computeNetWorkingCapital,
  // cockpit-journey
  compute_per_diem_mission: journey.computePerDiemMission,
  validate_note_frais: journey.validateNoteFrais,
  generate_ordre_mission: journey.generateOrdreMission,
  analyze_missions_cost: journey.analyzeMissionsCost,
  optimize_itineraire: journey.optimizeItineraire,
  // docjourney
  define_document_workflow: docjourney.defineDocumentWorkflow,
  track_document_progress: docjourney.trackDocumentProgress,
  detect_goulots_documentaires: docjourney.detectGoulotsDocumentaires,
  search_document_semantic: docjourney.searchDocumentSemantic,
  generate_document_template: docjourney.generateDocumentTemplate,
  // liasspilot
  generate_liasse_fiscale: liass.generateLiasseFiscale,
  check_conformite_fiscale: liass.checkConformiteFiscale,
  compute_acomptes_provisionnels: liass.computeAcomptesProvisionnels,
  generate_declaration_tva: liass.generateDeclarationTva,
  detect_erreurs_liasse: liass.detectErreursLiasse,
  // tablesmart
  compute_addition_table: table.computeAdditionTable,
  compute_taux_occupation_salle: table.computeTauxOccupationSalle,
  analyze_menu_performance: table.analyzeMenuPerformance,
  forecast_approvisionnement: table.forecastApprovisionnement,
  compute_pourboire_repartition: table.computePourboireRepartition,
  // atlas-fa
  consolidate_group_accounts: atlasFa.consolidateGroupAccounts,
  compute_intercompany_eliminations: atlasFa.computeIntercompanyEliminations,
  generate_reporting_pnl: atlasFa.generateReportingPnL,
  compute_free_cash_flow: atlasFa.computeFreeCashFlow,
  compute_wacc_company: atlasFa.computeWaccCompany,
  // atlas-lease
  compute_rent_lease: atlasLease.computeRentLease,
  classify_lease_type: atlasLease.classifyLeaseType,
  generate_contrat_lease: atlasLease.generateContratLease,
  detect_impaes_lease: atlasLease.detectImpaesLease,
  compute_taxavantages_lease: atlasLease.computeTaxavantagesLease,
  // atlas-mall-suite
  compute_loyer_variable_retail: mall.computeLoyerVariableRetail,
  analyze_footfall_mall: mall.analyzeFootfallMall,
  compute_tenant_mix_optimal: mall.computeTenantMixOptimal,
  detect_charges_communes_repartition: mall.detectChargesCommunesRepartition,
  forecast_revenu_mall_annuel: mall.forecastRevenuMallAnnuel,
  // wisefm
  compute_maintenance_budget: wisefm.computeMaintenanceBudget,
  plan_contrats_maintenance: wisefm.planContratsMaintenance,
  analyze_consommation_energie: wisefm.analyzeConsommationEnergie,
  track_tickets_fm: wisefm.trackTicketsFM,
  compute_contrats_renewal_forecast: wisefm.computeContratsRenewalForecast,
};

/**
 * Genere les declarations OllamaTool pour les 60 tools L3 Phase 7.
 * Schemas simplifies (objects ouverts) car les implementations valident.
 */
export function getL3PhaseDeclarations() {
  const labels: Record<string, string> = {
    compute_honoraires_conseil: "[Advist] Calcul honoraires conseil selon niveau intervenant + duree.",
    define_mission_scope: "[Advist] Definition scope mission + risques scope creep.",
    generate_rapport_conseil: "[Advist] Rapport conseil avec recommandations P1/P2/P3.",
    score_mission_complexite: "[Advist] Score complexite mission + budget recommande.",
    optimize_mission_planning: "[Advist] Planning consultants + detection overload.",
    compute_echeancier_credit: "[AtlasBanx] Echeancier credit (annuites/amortissement constant/in fine).",
    score_credit_demande: "[AtlasBanx] Scoring demande credit + verdict.",
    execute_batch_virements: "[AtlasBanx] Batch virements + validation IBAN + limite journaliere.",
    reconcile_interbank: "[AtlasBanx] Rapprochement interbancaire.",
    alertes_prudentielles: "[AtlasBanx] Alertes prudentielles Bale (solvabilite, LCR).",
    compute_frais_douane: "[AtlasTrade] Frais douane UEMOA (DD + PCS + PSI + TVA).",
    compute_marge_import: "[AtlasTrade] Marge import + competitivite vs marche local.",
    compute_hedging_fx: "[AtlasTrade] Couverture FX + scenarios + recommandation.",
    check_trade_compliance: "[AtlasTrade] Conformite trade (docs + sanctions).",
    score_fournisseur_international: "[AtlasTrade] Score fournisseur international.",
    compute_pooling_tresorerie: "[CashPilot] Pooling multi-comptes + mouvements.",
    optimize_cash_allocation: "[CashPilot] Allocation cash optimale.",
    detect_flux_anormaux: "[CashPilot] Detection flux anormaux Z-score.",
    forecast_besoin_financement: "[CashPilot] Projection besoin financement.",
    compute_net_working_capital: "[CashPilot] NWC + ratio liquidite.",
    compute_per_diem_mission: "[Journey] Per diem mission selon pays + niveau.",
    validate_note_frais: "[Journey] Validation note de frais.",
    generate_ordre_mission: "[Journey] Genere ordre de mission formel.",
    analyze_missions_cost: "[Journey] Analyse cout missions + top destinations.",
    optimize_itineraire: "[Journey] Itineraire optimal multi-villes.",
    define_document_workflow: "[DocJourney] Definition workflow document + SLA.",
    track_document_progress: "[DocJourney] Suivi progression document.",
    detect_goulots_documentaires: "[DocJourney] Detection goulots workflow.",
    search_document_semantic: "[DocJourney] Recherche semantique scoring.",
    generate_document_template: "[DocJourney] Generation template document.",
    generate_liasse_fiscale: "[LiassPilot] Genere liasse fiscale OHADA.",
    check_conformite_fiscale: "[LiassPilot] Check conformite declarations + risque.",
    compute_acomptes_provisionnels: "[LiassPilot] Calcul 4 acomptes IS UEMOA.",
    generate_declaration_tva: "[LiassPilot] Generation declaration TVA.",
    detect_erreurs_liasse: "[LiassPilot] Detection erreurs liasse.",
    compute_addition_table: "[TableSmart] Addition table avec TVA + service.",
    compute_taux_occupation_salle: "[TableSmart] Taux occupation salle + creneaux.",
    analyze_menu_performance: "[TableSmart] Performance menu (matrice BCG).",
    forecast_approvisionnement: "[TableSmart] Projection approvisionnement.",
    compute_pourboire_repartition: "[TableSmart] Repartition pourboires equipe.",
    consolidate_group_accounts: "[Atlas-FA] Consolidation comptes groupe.",
    compute_intercompany_eliminations: "[Atlas-FA] Eliminations intercompany.",
    generate_reporting_pnl: "[Atlas-FA] Reporting P&L par dimension.",
    compute_free_cash_flow: "[Atlas-FA] Free Cash Flow + ratio capex/EBITDA.",
    compute_wacc_company: "[Atlas-FA] WACC + structure capital.",
    compute_rent_lease: "[Atlas-Lease] Calcul loyer leasing + valeur residuelle.",
    classify_lease_type: "[Atlas-Lease] Classification leasing financier vs operationnel.",
    generate_contrat_lease: "[Atlas-Lease] Genere contrat credit-bail.",
    detect_impaes_lease: "[Atlas-Lease] Detection impaes leasing + provisions.",
    compute_taxavantages_lease: "[Atlas-Lease] Comparaison fiscale lease vs achat.",
    compute_loyer_variable_retail: "[Mall] Loyer variable retail (min + % CA).",
    analyze_footfall_mall: "[Mall] Analyse footfall + conversion + zones.",
    compute_tenant_mix_optimal: "[Mall] Mix locataires actuel vs optimal.",
    detect_charges_communes_repartition: "[Mall] Repartition charges communes.",
    forecast_revenu_mall_annuel: "[Mall] Forecast revenu mall annuel.",
    compute_maintenance_budget: "[WiseFM] Budget maintenance par m2.",
    plan_contrats_maintenance: "[WiseFM] Planning revisions equipements.",
    analyze_consommation_energie: "[WiseFM] Analyse conso energie + benchmark.",
    track_tickets_fm: "[WiseFM] Suivi tickets FM + MTTR.",
    compute_contrats_renewal_forecast: "[WiseFM] Contrats a renouveler + recommandation.",
  };

  return Object.entries(labels).map(([name, description]) => ({
    type: "function" as const,
    function: {
      name,
      description,
      parameters: { type: "object", properties: {}, additionalProperties: true },
    },
  }));
}

/**
 * Liste des tools L3 par app (pour routing).
 */
export const L3_PHASE7_BY_APP: Record<string, string[]> = {
  advist: ["compute_honoraires_conseil", "define_mission_scope", "generate_rapport_conseil", "score_mission_complexite", "optimize_mission_planning"],
  atlasbanx: ["compute_echeancier_credit", "score_credit_demande", "execute_batch_virements", "reconcile_interbank", "alertes_prudentielles"],
  atlastrade: ["compute_frais_douane", "compute_marge_import", "compute_hedging_fx", "check_trade_compliance", "score_fournisseur_international"],
  cashpilot: ["compute_pooling_tresorerie", "optimize_cash_allocation", "detect_flux_anormaux", "forecast_besoin_financement", "compute_net_working_capital"],
  "cockpit-journey": ["compute_per_diem_mission", "validate_note_frais", "generate_ordre_mission", "analyze_missions_cost", "optimize_itineraire"],
  docjourney: ["define_document_workflow", "track_document_progress", "detect_goulots_documentaires", "search_document_semantic", "generate_document_template"],
  liasspilot: ["generate_liasse_fiscale", "check_conformite_fiscale", "compute_acomptes_provisionnels", "generate_declaration_tva", "detect_erreurs_liasse"],
  tablesmart: ["compute_addition_table", "compute_taux_occupation_salle", "analyze_menu_performance", "forecast_approvisionnement", "compute_pourboire_repartition"],
  "atlas-fa": ["consolidate_group_accounts", "compute_intercompany_eliminations", "generate_reporting_pnl", "compute_free_cash_flow", "compute_wacc_company"],
  "atlas-lease": ["compute_rent_lease", "classify_lease_type", "generate_contrat_lease", "detect_impaes_lease", "compute_taxavantages_lease"],
  "atlas-mall-suite": ["compute_loyer_variable_retail", "analyze_footfall_mall", "compute_tenant_mix_optimal", "detect_charges_communes_repartition", "forecast_revenu_mall_annuel"],
  wisefm: ["compute_maintenance_budget", "plan_contrats_maintenance", "analyze_consommation_energie", "track_tickets_fm", "compute_contrats_renewal_forecast"],
};
