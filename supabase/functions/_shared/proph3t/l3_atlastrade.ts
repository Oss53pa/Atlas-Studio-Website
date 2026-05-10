// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 : ATLASTRADE (Trading / Import-Export)
// 5 tools : douane, marge import, hedging fx, conformite trade, scoring fournisseur
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

export function computeFraisDouane(args: {
  valeur_caf_centimes: string | bigint;
  pays_destination: "CI" | "SN" | "BF" | "ML" | "BJ" | "TG" | "NE";
  code_sh?: string;
  taux_dd_pct?: number;
  taux_pcs_pct?: number;
  taux_psi_pct?: number;
  taux_tva_pct?: number;
}): {
  ok: boolean;
  valeur_caf_centimes: string;
  decomposition: { libelle: string; taux_pct: number; assiette_centimes: string; montant_centimes: string }[];
  total_taxes_centimes: string;
  cout_total_centimes: string;
  cout_total_formatted: string;
} {
  const caf = BigInt(args.valeur_caf_centimes);
  const dd = args.taux_dd_pct ?? 20;
  const pcs = args.taux_pcs_pct ?? 1;
  const psi = args.taux_psi_pct ?? 0.5;
  const tva = args.taux_tva_pct ?? 18;

  const ddBp = BigInt(Math.round(dd * 100));
  const pcsBp = BigInt(Math.round(pcs * 100));
  const psiBp = BigInt(Math.round(psi * 100));
  const tvaBp = BigInt(Math.round(tva * 100));

  const ddMontant = (caf * ddBp) / 10000n;
  const pcsMontant = (caf * pcsBp) / 10000n;
  const psiMontant = (caf * psiBp) / 10000n;
  // TVA appliquee sur CAF + DD + PCS + PSI
  const baseTva = caf + ddMontant + pcsMontant + psiMontant;
  const tvaMontant = (baseTva * tvaBp) / 10000n;

  const totalTaxes = ddMontant + pcsMontant + psiMontant + tvaMontant;
  const coutTotal = caf + totalTaxes;

  return {
    ok: true,
    valeur_caf_centimes: caf.toString(),
    decomposition: [
      { libelle: "Droits de douane (DD)", taux_pct: dd, assiette_centimes: caf.toString(), montant_centimes: ddMontant.toString() },
      { libelle: "Prelevement Communautaire de Solidarite (PCS)", taux_pct: pcs, assiette_centimes: caf.toString(), montant_centimes: pcsMontant.toString() },
      { libelle: "Prelevement Statistique d Importation (PSI)", taux_pct: psi, assiette_centimes: caf.toString(), montant_centimes: psiMontant.toString() },
      { libelle: "TVA sur CAF + droits", taux_pct: tva, assiette_centimes: baseTva.toString(), montant_centimes: tvaMontant.toString() },
    ],
    total_taxes_centimes: totalTaxes.toString(),
    cout_total_centimes: coutTotal.toString(),
    cout_total_formatted: formatMoneyFcfa(coutTotal),
  };
}

export function computeMargeImport(args: {
  prix_achat_origine_centimes: string | bigint;
  taux_change: number;
  frais_transport_centimes: string | bigint;
  assurance_centimes: string | bigint;
  douanes_centimes: string | bigint;
  marge_souhaitee_pct: number;
  prix_marche_local_centimes?: string | bigint;
}): {
  ok: boolean;
  cout_revient_centimes: string;
  cout_revient_formatted: string;
  prix_vente_recommande_centimes: string;
  ecart_marche_pct?: number;
  competitif: boolean;
} {
  const achat = BigInt(args.prix_achat_origine_centimes);
  const tauxBp = BigInt(Math.round(args.taux_change * 1_000_000));
  const achatLocal = (achat * tauxBp) / 1_000_000n;
  const cout = achatLocal + BigInt(args.frais_transport_centimes) + BigInt(args.assurance_centimes) + BigInt(args.douanes_centimes);
  const margeBp = BigInt(Math.round(args.marge_souhaitee_pct * 100));
  const pv = (cout * (10000n + margeBp)) / 10000n;
  let ecart: number | undefined;
  let competitif = true;
  if (args.prix_marche_local_centimes) {
    const marche = BigInt(args.prix_marche_local_centimes);
    if (marche > 0n) {
      ecart = Math.round((Number(pv - marche) / Number(marche)) * 10000) / 100;
      competitif = ecart <= 5;
    }
  }
  return {
    ok: true,
    cout_revient_centimes: cout.toString(),
    cout_revient_formatted: formatMoneyFcfa(cout),
    prix_vente_recommande_centimes: pv.toString(),
    ecart_marche_pct: ecart,
    competitif,
  };
}

export function computeHedgingFx(args: {
  exposition_centimes: string | bigint;
  devise_exposition: string;
  taux_spot: number;
  taux_forward: number;
  duree_jours: number;
  scenarios_volatilite_pct?: number[];
}): {
  ok: boolean;
  exposition_centimes: string;
  cout_couverture_centimes: string;
  taux_couverture_implicite_pct: number;
  scenarios: { volatilite_pct: number; perte_si_non_couvert_centimes: string; gain_si_couvert_centimes: string }[];
  recommendation: string;
} {
  const exp = BigInt(args.exposition_centimes);
  const ecart = args.taux_forward - args.taux_spot;
  const coutBp = BigInt(Math.round((ecart / args.taux_spot) * 1_000_000));
  const cout = (exp * coutBp) / 1_000_000n;
  const tauxAnnualise = (ecart / args.taux_spot) * (360 / args.duree_jours) * 100;
  const scenarios = (args.scenarios_volatilite_pct ?? [5, 10, 15, 20]).map(v => {
    const choc = BigInt(Math.round((v / 100) * 1_000_000));
    const perteNonCouverte = (exp * choc) / 1_000_000n;
    const gainCouvert = perteNonCouverte > cout ? perteNonCouverte - cout : 0n;
    return { volatilite_pct: v, perte_si_non_couvert_centimes: perteNonCouverte.toString(), gain_si_couvert_centimes: gainCouvert.toString() };
  });
  const reco = tauxAnnualise > 8 ? "Couverture chere — envisager option" : "Couverture rentable, recommandee";
  return { ok: true, exposition_centimes: exp.toString(), cout_couverture_centimes: cout.toString(), taux_couverture_implicite_pct: Math.round(tauxAnnualise * 100) / 100, scenarios, recommendation: reco };
}

export function checkTradeCompliance(args: {
  produit_code_sh: string;
  pays_origine: string;
  pays_destination: string;
  valeur_centimes: string | bigint;
  documents_fournis: string[];
}): { ok: boolean; conformite: boolean; alertes: { code: string; severity: "warning" | "critical"; message: string }[]; documents_manquants: string[] } {
  const requis = ["facture_commerciale", "packing_list", "certificat_origine", "bl_ou_lta"];
  if (Number(BigInt(args.valeur_centimes)) > 5_000_000_000) requis.push("attestation_inspection");
  if (["UA", "RU"].includes(args.pays_origine)) requis.push("certificat_sanctions");
  const manquants = requis.filter(r => !args.documents_fournis.includes(r));
  const alertes: any[] = [];
  if (manquants.length > 0) alertes.push({ code: "DOCS_MANQUANTS", severity: "critical", message: `${manquants.length} documents manquants` });
  // Sanctions internationales
  const sanctionsList = ["IR", "KP", "SY", "RU"];
  if (sanctionsList.includes(args.pays_origine) || sanctionsList.includes(args.pays_destination)) {
    alertes.push({ code: "SANCTIONS_OFAC", severity: "critical", message: "Pays sous sanctions internationales — verification due diligence obligatoire" });
  }
  return { ok: true, conformite: alertes.filter(a => a.severity === "critical").length === 0, alertes, documents_manquants: manquants };
}

export function scoreFournisseurInternational(args: {
  fournisseur: string;
  pays: string;
  annees_anciennete: number;
  taux_qualite_livraisons_pct: number;
  taux_respect_delais_pct: number;
  capacite_credit_score?: 1 | 2 | 3 | 4 | 5;
  certifications: string[];
  incidents_12m: number;
}): { ok: boolean; score: number; niveau: "preferred" | "qualified" | "monitor" | "blacklist"; recommendation: string } {
  let score = 0;
  score += Math.min(20, args.annees_anciennete * 2);
  score += args.taux_qualite_livraisons_pct * 0.3;
  score += args.taux_respect_delais_pct * 0.3;
  if (args.capacite_credit_score) score += args.capacite_credit_score * 4;
  score += args.certifications.length * 3;
  score -= args.incidents_12m * 8;
  score = Math.max(0, Math.min(100, score));
  const niveau: "preferred" | "qualified" | "monitor" | "blacklist" =
    score >= 80 ? "preferred" : score >= 60 ? "qualified" : score >= 35 ? "monitor" : "blacklist";
  const reco =
    niveau === "preferred" ? "Maintenir et augmenter volumes"
    : niveau === "qualified" ? "Continuer relation"
    : niveau === "monitor" ? "Audit qualite + suivi rapproche"
    : "Cesser relation, identifier alternative";
  return { ok: true, score: Math.round(score), niveau, recommendation: reco };
}
