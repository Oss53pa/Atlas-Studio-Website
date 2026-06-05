// Dispatcher pour les tools L3 app-specific (au-delà des L3 câblés dans tools.ts).
// Permet d'ajouter les runners sans bloater tools.ts.
//
// Apps actives ici (présentes au catalogue commercial) :
//   advist · atlasbanx · liasspilot · tablesmart · atlas-fa
// Les 9 apps « fantômes » (cashpilot, duedeck, wisehr, wisefm, atlas-lease,
// atlas-mall-suite, atlastrade, docjourney, cockpit-journey) ont été purgées du
// registry + routing (audit 360° §Uniformité, décision : purge). Leurs fichiers
// l3_*.ts restent en dépôt (réactivables) mais ne sont plus branchés.

import * as advist from "./l3_advist.ts";
import * as atlasbanx from "./l3_atlasbanx.ts";
import * as liass from "./l3_liasspilot.ts";
import * as table from "./l3_tablesmart.ts";
import * as atlasFa from "./l3_atlas_fa.ts";

export const L3_DISPATCHER: Record<string, (args: any) => any> = {
  // advist — signature électronique (Loi 2013-546)
  verify_signature_validity: advist.verifySignatureValidity,
  generate_otp_challenge: advist.generateOtpChallenge,
  define_signature_circuit: advist.defineSignatureCircuit,
  track_signature_status: advist.trackSignatureStatus,
  compute_signature_legal_value: advist.computeSignatureLegalValue,
  // atlasbanx — audit d'anomalies bancaires (Benford / Z-score / ghost fees)
  apply_benford_analysis: atlasbanx.applyBenfordAnalysis,
  compute_zscore_anomalies: atlasbanx.computeZscoreAnomalies,
  detect_ghost_fees: atlasbanx.detectGhostFees,
  score_bank_risk_global: atlasbanx.scoreBankRiskGlobal,
  generate_audit_report_anomalies: atlasbanx.generateAuditReportAnomalies,
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
};

/**
 * Genere les declarations OllamaTool pour les tools L3 du dispatcher.
 * Schemas simplifies (objects ouverts) car les implementations valident.
 */
export function getL3PhaseDeclarations() {
  const labels: Record<string, string> = {
    verify_signature_validity: "[Advist] Validité juridique d'une signature électronique (Loi 2013-546).",
    generate_otp_challenge: "[Advist] Défi OTP d'authentification du signataire (canal + TTL + tentatives).",
    define_signature_circuit: "[Advist] Circuit de validation (parapheur) + détection d'incohérences.",
    track_signature_status: "[Advist] Suivi d'avancement du dossier de signature + relances.",
    compute_signature_legal_value: "[Advist] Score de valeur probante du dossier de signature.",
    apply_benford_analysis: "[AtlasBanx] Loi de Benford sur les montants (MAD, conformité).",
    compute_zscore_anomalies: "[AtlasBanx] Z-score : montants statistiquement aberrants.",
    detect_ghost_fees: "[AtlasBanx] Ghost fees : doublons, surfacturations, récurrences anormales.",
    score_bank_risk_global: "[AtlasBanx] Score de risque global 0-100 par compte/client.",
    generate_audit_report_anomalies: "[AtlasBanx] Rapport d'audit des anomalies (SYSCOHADA).",
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
  advist: ["verify_signature_validity", "generate_otp_challenge", "define_signature_circuit", "track_signature_status", "compute_signature_legal_value"],
  atlasbanx: ["apply_benford_analysis", "compute_zscore_anomalies", "detect_ghost_fees", "score_bank_risk_global", "generate_audit_report_anomalies"],
  liasspilot: ["generate_liasse_fiscale", "check_conformite_fiscale", "compute_acomptes_provisionnels", "generate_declaration_tva", "detect_erreurs_liasse"],
  tablesmart: ["compute_addition_table", "compute_taux_occupation_salle", "analyze_menu_performance", "forecast_approvisionnement", "compute_pourboire_repartition"],
  "atlas-fa": ["consolidate_group_accounts", "compute_intercompany_eliminations", "generate_reporting_pnl", "compute_free_cash_flow", "compute_wacc_company"],
};
