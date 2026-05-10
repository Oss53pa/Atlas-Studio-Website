// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : FISCAL approfondi (au-dela de finance.ts)
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools fiscaux specialises :
//   1. compute_irvm              : Impot sur Revenus de Valeurs Mobilieres
//   2. compute_droit_enregistrement : droits d'enregistrement actes
//   3. compute_minimum_forfaitaire : impot minimum forfaitaire pays UEMOA
//   4. forecast_dsf              : aide a la projection DSF (declaration synthetique)
//   5. compute_credit_tva        : credit de TVA + remboursement exigible
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. IRVM (Impot sur Revenus de Valeurs Mobilieres) ─────────────────────
/**
 * IRVM : retenue a la source sur dividendes / interets distribues.
 *
 * Taux par pays UEMOA (2024) :
 *   CI : 10% (15% non-residents)
 *   SN : 13% (15% non-residents)
 *   BF : 12.5%
 *   ML/BJ/TG/NE : 10%
 *
 * Conventions fiscales bilaterales peuvent reduire ces taux.
 */
const IRVM_RATES: Record<string, { resident: number; non_resident: number }> = {
  CI: { resident: 0.10, non_resident: 0.15 },
  SN: { resident: 0.13, non_resident: 0.15 },
  BF: { resident: 0.125, non_resident: 0.125 },
  ML: { resident: 0.10, non_resident: 0.10 },
  BJ: { resident: 0.10, non_resident: 0.10 },
  TG: { resident: 0.10, non_resident: 0.10 },
  NE: { resident: 0.10, non_resident: 0.10 },
  CM: { resident: 0.165, non_resident: 0.165 },
  GA: { resident: 0.20, non_resident: 0.20 },
};

export function computeIrvm(args: {
  montant_brut_centimes: string | bigint;
  pays: string;
  beneficiaire_residence: "resident" | "non_resident";
  type_revenu?: "dividende" | "interet" | "redevance";
}): {
  ok: boolean;
  pays: string;
  beneficiaire_residence: string;
  taux_applique: number;
  montant_brut_centimes: string;
  irvm_centimes: string;
  net_a_verser_centimes: string;
  net_formatted: string;
  error?: string;
} {
  const rates = IRVM_RATES[args.pays];
  if (!rates) {
    return { ok: false, pays: args.pays, beneficiaire_residence: args.beneficiaire_residence, taux_applique: 0, montant_brut_centimes: "0", irvm_centimes: "0", net_a_verser_centimes: "0", net_formatted: "0 FCFA", error: `IRVM ${args.pays} non disponible` };
  }
  const taux = args.beneficiaire_residence === "non_resident" ? rates.non_resident : rates.resident;
  const brut = BigInt(args.montant_brut_centimes);
  const tauxBp = BigInt(Math.round(taux * 10000));
  const irvm = (brut * tauxBp) / 10000n;
  const net = brut - irvm;

  return {
    ok: true,
    pays: args.pays,
    beneficiaire_residence: args.beneficiaire_residence,
    taux_applique: taux,
    montant_brut_centimes: brut.toString(),
    irvm_centimes: irvm.toString(),
    net_a_verser_centimes: net.toString(),
    net_formatted: formatMoneyFcfa(net),
  };
}

// ─── 2. Droit d'enregistrement ─────────────────────────────────────────────
/**
 * Droit d'enregistrement : taxe sur certains actes (cession parts sociales,
 * vente immobiliere, augmentation capital, contrats > seuil).
 *
 * Taux courants UEMOA (2024) :
 *   - Cession parts sociales : 1-3% selon pays
 *   - Vente immobiliere : 4-7% (CI 4%, SN 7%, BF 5%)
 *   - Augmentation capital : 0.5-1% (au-dela d'un seuil)
 *   - Bail commercial : 1-3% du loyer annuel × duree
 */
const DROIT_ENREG_RATES: Record<string, Record<string, { taux: number; reference: string }>> = {
  cession_parts_sociales: {
    CI: { taux: 0.01, reference: "CGI CI art. 754 — 1%" },
    SN: { taux: 0.01, reference: "CGI SN — 1%" },
    BF: { taux: 0.05, reference: "CGI BF" },
  },
  vente_immobiliere: {
    CI: { taux: 0.04, reference: "CGI CI art. 757 — 4%" },
    SN: { taux: 0.07, reference: "CGI SN — 7% droit principal" },
    BF: { taux: 0.05, reference: "CGI BF — 5%" },
    ML: { taux: 0.07, reference: "CGI ML — 7%" },
  },
  augmentation_capital: {
    CI: { taux: 0.006, reference: "CGI CI — 0.6% au-dela seuil" },
    SN: { taux: 0.01, reference: "CGI SN — 1%" },
  },
  bail_commercial: {
    CI: { taux: 0.025, reference: "CGI CI — 2.5% du loyer annuel × duree" },
    SN: { taux: 0.025, reference: "CGI SN — 2.5%" },
  },
};

export function computeDroitEnregistrement(args: {
  type_acte: "cession_parts_sociales" | "vente_immobiliere" | "augmentation_capital" | "bail_commercial";
  montant_acte_centimes: string | bigint;
  pays: string;
  duree_bail_annees?: number;
}): {
  ok: boolean;
  type_acte: string;
  pays: string;
  taux: number;
  base_imposable_centimes: string;
  droit_centimes: string;
  droit_formatted: string;
  reference?: string;
  error?: string;
} {
  const conf = DROIT_ENREG_RATES[args.type_acte]?.[args.pays];
  if (!conf) {
    return { ok: false, type_acte: args.type_acte, pays: args.pays, taux: 0, base_imposable_centimes: "0", droit_centimes: "0", droit_formatted: "0 FCFA", error: `Taux ${args.type_acte} ${args.pays} non disponible` };
  }
  const montant = BigInt(args.montant_acte_centimes);
  let base = montant;
  if (args.type_acte === "bail_commercial" && args.duree_bail_annees) {
    base = montant * BigInt(args.duree_bail_annees);
  }
  const tauxBp = BigInt(Math.round(conf.taux * 10000));
  const droit = (base * tauxBp) / 10000n;

  return {
    ok: true,
    type_acte: args.type_acte,
    pays: args.pays,
    taux: conf.taux,
    base_imposable_centimes: base.toString(),
    droit_centimes: droit.toString(),
    droit_formatted: formatMoneyFcfa(droit),
    reference: conf.reference,
  };
}

// ─── 3. Impot Minimum Forfaitaire ──────────────────────────────────────────
/**
 * IMF (Impot Minimum Forfaitaire) : impot du si IS calcule < seuil.
 *
 * Formule courante : IMF = max(seuil_minimal, taux × CA HT).
 *
 * Pays :
 *   CI : 0.5% du CA, minimum 3 000 000 FCFA
 *   SN : 0.5% du CA
 *   BF : 0.5% CA, min 1 000 000
 *   ML : 1% CA
 *   BJ : 0.75% CA
 */
const IMF_CONFIG: Record<string, { taux_ca: number; minimum_fcfa: number; reference: string }> = {
  CI: { taux_ca: 0.005, minimum_fcfa: 3_000_000, reference: "CGI CI art. 39 — 0.5% CA, min 3M FCFA" },
  SN: { taux_ca: 0.005, minimum_fcfa: 500_000, reference: "CGI SN — 0.5% CA" },
  BF: { taux_ca: 0.005, minimum_fcfa: 1_000_000, reference: "CGI BF — 0.5% CA min 1M FCFA" },
  ML: { taux_ca: 0.01, minimum_fcfa: 750_000, reference: "CGI ML — 1% CA" },
  BJ: { taux_ca: 0.0075, minimum_fcfa: 200_000, reference: "CGI BJ — 0.75% CA" },
  TG: { taux_ca: 0.005, minimum_fcfa: 100_000, reference: "CGI TG — 0.5% CA" },
};

export function computeMinimumForfaitaire(args: {
  ca_ht_centimes: string | bigint;
  is_calcule_centimes?: string | bigint;
  pays: string;
}): {
  ok: boolean;
  pays: string;
  ca_ht_centimes: string;
  is_calcule_centimes: string;
  imf_calcule_centimes: string;
  impot_du_centimes: string;
  impot_du_formatted: string;
  decision: string;
  reference?: string;
  error?: string;
} {
  const cfg = IMF_CONFIG[args.pays];
  if (!cfg) {
    return { ok: false, pays: args.pays, ca_ht_centimes: "0", is_calcule_centimes: "0", imf_calcule_centimes: "0", impot_du_centimes: "0", impot_du_formatted: "0 FCFA", decision: "", error: `IMF ${args.pays} non disponible` };
  }
  const ca = BigInt(args.ca_ht_centimes);
  const isCalc = args.is_calcule_centimes ? BigInt(args.is_calcule_centimes) : 0n;
  const tauxBp = BigInt(Math.round(cfg.taux_ca * 10000));
  const imfCalc = (ca * tauxBp) / 10000n;
  const minCent = BigInt(cfg.minimum_fcfa * 100);
  const imf = imfCalc > minCent ? imfCalc : minCent;
  const impotDu = isCalc > imf ? isCalc : imf;
  const decision = isCalc > imf
    ? `IS calcule (${formatMoneyFcfa(isCalc)}) > IMF (${formatMoneyFcfa(imf)}) -> regle classique`
    : `IS calcule (${formatMoneyFcfa(isCalc)}) < IMF (${formatMoneyFcfa(imf)}) -> impot minimum applique`;

  return {
    ok: true,
    pays: args.pays,
    ca_ht_centimes: ca.toString(),
    is_calcule_centimes: isCalc.toString(),
    imf_calcule_centimes: imf.toString(),
    impot_du_centimes: impotDu.toString(),
    impot_du_formatted: formatMoneyFcfa(impotDu),
    decision,
    reference: cfg.reference,
  };
}

// ─── 4. Forecast DSF (Declaration Synthetique de Fiscalite) ────────────────
/**
 * Aide a la projection DSF annuelle : calcule l'IS, IMF, IRVM, parafiscales
 * agreges en un seul appel pour preview.
 */
export function forecastDsf(args: {
  pays: string;
  exercice: string;
  ca_ht_centimes: string | bigint;
  benefice_imposable_centimes: string | bigint;
  taux_is_pays?: number;          // surcharge si non standard
  dividendes_distribues_centimes?: string | bigint;
  beneficiaire_dividende?: "resident" | "non_resident";
}): {
  ok: boolean;
  pays: string;
  exercice: string;
  is_calcule_centimes: string;
  imf_centimes: string;
  impot_du_centimes: string;
  irvm_centimes?: string;
  total_a_payer_centimes: string;
  total_formatted: string;
  details: { libelle: string; montant_centimes: string }[];
} {
  const ca = BigInt(args.ca_ht_centimes);
  const benef = BigInt(args.benefice_imposable_centimes);

  // IS (fallback simple)
  const tauxIs = args.taux_is_pays ?? 0.25;
  const isCalc = (benef * BigInt(Math.round(tauxIs * 10000))) / 10000n;

  // IMF
  const imfRes = computeMinimumForfaitaire({
    ca_ht_centimes: ca, is_calcule_centimes: isCalc, pays: args.pays,
  });

  let imfCent = 0n;
  let impotDu = isCalc;
  if (imfRes.ok) {
    imfCent = BigInt(imfRes.imf_calcule_centimes);
    impotDu = BigInt(imfRes.impot_du_centimes);
  }

  // IRVM si dividendes
  let irvm = 0n;
  if (args.dividendes_distribues_centimes && args.beneficiaire_dividende) {
    const irvmRes = computeIrvm({
      montant_brut_centimes: args.dividendes_distribues_centimes,
      pays: args.pays,
      beneficiaire_residence: args.beneficiaire_dividende,
    });
    if (irvmRes.ok) irvm = BigInt(irvmRes.irvm_centimes);
  }

  const total = impotDu + irvm;

  return {
    ok: true,
    pays: args.pays,
    exercice: args.exercice,
    is_calcule_centimes: isCalc.toString(),
    imf_centimes: imfCent.toString(),
    impot_du_centimes: impotDu.toString(),
    irvm_centimes: irvm > 0n ? irvm.toString() : undefined,
    total_a_payer_centimes: total.toString(),
    total_formatted: formatMoneyFcfa(total),
    details: [
      { libelle: `IS calcule (${(tauxIs * 100).toFixed(0)}% × benefice)`, montant_centimes: isCalc.toString() },
      { libelle: "IMF (minimum forfaitaire)", montant_centimes: imfCent.toString() },
      { libelle: "Impot du (max IS, IMF)", montant_centimes: impotDu.toString() },
      ...(irvm > 0n ? [{ libelle: "IRVM sur dividendes", montant_centimes: irvm.toString() }] : []),
    ],
  };
}

// ─── 5. Credit de TVA ──────────────────────────────────────────────────────
/**
 * Credit de TVA = TVA deductible - TVA collectee (negatif si plus collectee).
 *
 * Si TVA deductible > TVA collectee : credit reportable ou remboursable.
 * Conditions de remboursement (CI/SN/BF) :
 *   - Credit > 1.000.000 FCFA pendant 3 mois consecutifs
 *   - Exportateurs : remboursement possible chaque mois
 *   - Investissements lourds : remboursement immediat
 */
export function computeCreditTva(args: {
  tva_collectee_centimes: string | bigint;
  tva_deductible_centimes: string | bigint;
  pays: string;
  type_activite?: "exportateur" | "investissement" | "standard";
  credit_anterieur_centimes?: string | bigint;
}): {
  ok: boolean;
  pays: string;
  tva_collectee_centimes: string;
  tva_deductible_centimes: string;
  credit_anterieur_centimes: string;
  solde_centimes: string;
  position: "credit_tva" | "tva_a_payer" | "neutre";
  remboursement_eligible: boolean;
  remboursement_motif: string;
  recommandation: string;
} {
  const collect = BigInt(args.tva_collectee_centimes);
  const deduct = BigInt(args.tva_deductible_centimes);
  const credAnt = args.credit_anterieur_centimes ? BigInt(args.credit_anterieur_centimes) : 0n;
  const solde = collect - deduct - credAnt;

  let position: "credit_tva" | "tva_a_payer" | "neutre";
  if (solde > 0n) position = "tva_a_payer";
  else if (solde < 0n) position = "credit_tva";
  else position = "neutre";

  const credit = solde < 0n ? -solde : 0n;
  let eligible = false;
  let motif = "Pas de credit a rembourser";
  let reco = "";

  if (credit > 0n) {
    if (args.type_activite === "exportateur") {
      eligible = true;
      motif = "Exportateur : remboursement mensuel possible (regime favorable)";
      reco = "Constituer la demande de remboursement avec factures d'export";
    } else if (args.type_activite === "investissement") {
      eligible = true;
      motif = "Investissements lourds : remboursement immediat";
      reco = "Joindre le programme d'investissement valide";
    } else if (credit >= BigInt(1_000_000 * 100)) {
      eligible = true;
      motif = "Credit > 1 000 000 FCFA — eligible apres 3 mois consecutifs";
      reco = "Verifier credits 3 mois consecutifs avant demande";
    } else {
      motif = "Credit < seuil — reportable mais non remboursable";
      reco = "Imputer sur la TVA des prochaines declarations";
    }
  } else if (solde > 0n) {
    reco = `Payer ${formatMoneyFcfa(solde)} avant le 15 du mois suivant`;
  }

  return {
    ok: true,
    pays: args.pays,
    tva_collectee_centimes: collect.toString(),
    tva_deductible_centimes: deduct.toString(),
    credit_anterieur_centimes: credAnt.toString(),
    solde_centimes: solde.toString(),
    position,
    remboursement_eligible: eligible,
    remboursement_motif: motif,
    recommandation: reco,
  };
}
