// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : IMMOBILIER (gestion locative + fiscalite)
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. compute_loyer_revise         : indexation loyer (formule legale)
//   2. compute_depot_garantie       : depot garantie selon usage et pays
//   3. compute_taxe_fonciere        : taxe fonciere selon pays UEMOA
//   4. compute_charges_copropriete  : repartition charges au tantieme
//   5. compute_rendement_locatif    : rendement brut/net annuel
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. Loyer revise (indexation) ──────────────────────────────────────────
/**
 * Indexation loyer selon Indice Reference Loyers (IRL).
 * Formule : loyer_nouveau = loyer_initial × (IRL_n / IRL_n-1)
 *
 * Si IRL pas fourni, applique l'inflation BCEAO/BEAC moyenne 2-3% comme fallback.
 */
export function computeLoyerRevise(args: {
  loyer_actuel_centimes: string | bigint;
  irl_initial?: number;
  irl_actuel?: number;
  inflation_pct?: number;        // fallback en %, ex 2.5
}): {
  ok: boolean;
  loyer_actuel_centimes: string;
  loyer_revise_centimes: string;
  loyer_revise_formatted: string;
  augmentation_pct: number;
  augmentation_centimes: string;
  formule: string;
} {
  const actuel = BigInt(args.loyer_actuel_centimes);
  let coeffBp: bigint;
  let formule: string;
  let pct: number;

  if (args.irl_initial && args.irl_actuel) {
    coeffBp = BigInt(Math.round((args.irl_actuel / args.irl_initial) * 1_000_000));
    pct = ((args.irl_actuel / args.irl_initial) - 1) * 100;
    formule = `loyer × (IRL ${args.irl_actuel} / IRL ${args.irl_initial}) = loyer × ${(args.irl_actuel / args.irl_initial).toFixed(4)}`;
  } else {
    const infl = args.inflation_pct ?? 2.5;
    coeffBp = BigInt(Math.round((1 + infl / 100) * 1_000_000));
    pct = infl;
    formule = `loyer × (1 + inflation ${infl}%)`;
  }

  const revise = (actuel * coeffBp) / 1_000_000n;
  const augmentation = revise - actuel;

  return {
    ok: true,
    loyer_actuel_centimes: actuel.toString(),
    loyer_revise_centimes: revise.toString(),
    loyer_revise_formatted: formatMoneyFcfa(revise),
    augmentation_pct: Math.round(pct * 100) / 100,
    augmentation_centimes: augmentation.toString(),
    formule,
  };
}

// ─── 2. Depot de garantie ──────────────────────────────────────────────────
/**
 * Depot de garantie selon usage :
 *   - Habitation : 2 mois loyer (norme OHADA)
 *   - Commercial : 3 mois loyer (pratique courante UEMOA)
 *   - Bureaux : 3 mois loyer
 *
 * Restitution legale : sous 2 mois suivant remise des cles, sauf retenues justifiees.
 */
export function computeDepotGarantie(args: {
  loyer_mensuel_centimes: string | bigint;
  usage: "habitation" | "commercial" | "bureau" | "autre";
  pays?: string;
}): {
  ok: boolean;
  loyer_centimes: string;
  usage: string;
  nb_mois: number;
  depot_centimes: string;
  depot_formatted: string;
  delai_restitution_mois: number;
  base_legale: string;
} {
  const loyer = BigInt(args.loyer_mensuel_centimes);
  let nbMois: number;
  let baseLegale: string;
  switch (args.usage) {
    case "habitation": nbMois = 2; baseLegale = "Norme habitative OHADA — 2 mois de loyer"; break;
    case "commercial": nbMois = 3; baseLegale = "Pratique commerciale UEMOA — 3 mois loyer"; break;
    case "bureau": nbMois = 3; baseLegale = "Pratique professionnelle — 3 mois loyer"; break;
    default: nbMois = 2; baseLegale = "Norme generale OHADA — 2 mois";
  }
  const depot = loyer * BigInt(nbMois);
  return {
    ok: true,
    loyer_centimes: loyer.toString(),
    usage: args.usage,
    nb_mois: nbMois,
    depot_centimes: depot.toString(),
    depot_formatted: formatMoneyFcfa(depot),
    delai_restitution_mois: 2,
    base_legale: baseLegale,
  };
}

// ─── 3. Taxe fonciere ──────────────────────────────────────────────────────
/**
 * Taxes foncieres par pays UEMOA (donnees 2024 simplifiees) :
 *   - CI : Taxe Bati 4% valeur locative + Taxe Non Bati 1.5%
 *   - SN : Contribution Fonciere des Proprietes Baties 5%
 *   - BF : Taxe sur Bati 6% / Non Bati 1.5%
 */
const TAXES_FONCIERES: Record<string, { taux_bati: number; taux_non_bati: number; assiette: string }> = {
  CI: { taux_bati: 0.04, taux_non_bati: 0.015, assiette: "valeur_locative" },
  SN: { taux_bati: 0.05, taux_non_bati: 0.05, assiette: "valeur_locative" },
  BF: { taux_bati: 0.06, taux_non_bati: 0.015, assiette: "valeur_locative" },
  ML: { taux_bati: 0.03, taux_non_bati: 0.01, assiette: "valeur_venale" },
  BJ: { taux_bati: 0.06, taux_non_bati: 0.05, assiette: "valeur_locative" },
  TG: { taux_bati: 0.04, taux_non_bati: 0.01, assiette: "valeur_locative" },
};

export function computeTaxeFonciere(args: {
  valeur_locative_annuelle_centimes: string | bigint;
  pays: string;
  type: "bati" | "non_bati";
}): {
  ok: boolean; pays: string; type: string; taux: number; assiette: string;
  taxe_centimes: string; taxe_formatted: string; error?: string;
} {
  const cfg = TAXES_FONCIERES[args.pays];
  if (!cfg) return { ok: false, pays: args.pays, type: args.type, taux: 0, assiette: "", taxe_centimes: "0", taxe_formatted: "0 FCFA", error: `Taxe fonciere ${args.pays} non disponible` };
  const taux = args.type === "bati" ? cfg.taux_bati : cfg.taux_non_bati;
  const valeur = BigInt(args.valeur_locative_annuelle_centimes);
  const tauxBp = BigInt(Math.round(taux * 10000));
  const taxe = (valeur * tauxBp) / 10000n;
  return { ok: true, pays: args.pays, type: args.type, taux, assiette: cfg.assiette, taxe_centimes: taxe.toString(), taxe_formatted: formatMoneyFcfa(taxe) };
}

// ─── 4. Charges copropriete ────────────────────────────────────────────────
/**
 * Repartition des charges de copropriete au tantieme (millieme de propriete).
 * Formule : charge_lot = charges_totales × (tantieme_lot / 1000)
 */
export function computeChargesCopropriete(args: {
  charges_annuelles_totales_centimes: string | bigint;
  lots: { id: string; tantieme: number; libelle?: string }[];
  cles_repartition?: { id: string; libelle: string; tantiemes_lots: Record<string, number>; montant_centimes: string | bigint }[];
}): {
  ok: boolean;
  total_tantiemes: number;
  repartition_par_lot: { id: string; libelle?: string; tantieme: number; charges_annuelles_centimes: string; charges_mensuelles_centimes: string; charges_formatted: string }[];
  warnings: string[];
} {
  const total = BigInt(args.charges_annuelles_totales_centimes);
  const totalTantiemes = args.lots.reduce((s, l) => s + l.tantieme, 0);
  const warnings: string[] = [];
  if (totalTantiemes !== 1000) warnings.push(`Total tantiemes = ${totalTantiemes}/1000 (attendu 1000)`);

  const repartition = args.lots.map(lot => {
    const part = (total * BigInt(lot.tantieme)) / BigInt(totalTantiemes);
    const mensuel = part / 12n;
    return {
      id: lot.id, libelle: lot.libelle, tantieme: lot.tantieme,
      charges_annuelles_centimes: part.toString(),
      charges_mensuelles_centimes: mensuel.toString(),
      charges_formatted: formatMoneyFcfa(part),
    };
  });

  return { ok: true, total_tantiemes: totalTantiemes, repartition_par_lot: repartition, warnings };
}

// ─── 5. Rendement locatif ──────────────────────────────────────────────────
/**
 * Rendement brut = (loyer annuel / prix d'achat) × 100
 * Rendement net  = ((loyer annuel - charges - taxes) / prix d'achat total) × 100
 *
 * Norme UEMOA : 6-10% rendement brut considere bon, > 10% excellent.
 */
export function computeRendementLocatif(args: {
  prix_achat_centimes: string | bigint;
  frais_acquisition_centimes?: string | bigint;
  loyer_mensuel_centimes: string | bigint;
  charges_annuelles_centimes?: string | bigint;
  taxe_fonciere_centimes?: string | bigint;
  vacance_locative_pct?: number;     // % du temps vacant (defaut 5%)
}): {
  ok: boolean;
  prix_total_acquisition_centimes: string;
  loyer_annuel_brut_centimes: string;
  loyer_annuel_net_centimes: string;
  rendement_brut_pct: number;
  rendement_net_pct: number;
  interpretation: string;
} {
  const prix = BigInt(args.prix_achat_centimes);
  const frais = args.frais_acquisition_centimes ? BigInt(args.frais_acquisition_centimes) : 0n;
  const totalAcquisition = prix + frais;
  const loyerMensuel = BigInt(args.loyer_mensuel_centimes);
  const vacance = args.vacance_locative_pct ?? 5;
  const loyerAnnuelBrut = loyerMensuel * 12n;
  const vacanceBp = BigInt(Math.round((1 - vacance / 100) * 10000));
  const loyerAnnuelEffectif = (loyerAnnuelBrut * vacanceBp) / 10000n;

  const charges = args.charges_annuelles_centimes ? BigInt(args.charges_annuelles_centimes) : 0n;
  const taxe = args.taxe_fonciere_centimes ? BigInt(args.taxe_fonciere_centimes) : 0n;
  const loyerAnnuelNet = loyerAnnuelEffectif - charges - taxe;

  const rendementBrut = totalAcquisition > 0n ? (Number(loyerAnnuelEffectif) / Number(totalAcquisition)) * 100 : 0;
  const rendementNet = totalAcquisition > 0n ? (Number(loyerAnnuelNet) / Number(totalAcquisition)) * 100 : 0;

  const interpretation =
    rendementNet < 4 ? "Rendement faible — privilegier autres placements"
    : rendementNet < 6 ? "Rendement moyen — acceptable selon emplacement"
    : rendementNet < 10 ? "Bon rendement — investissement interessant"
    : "Excellent rendement — verifier risque locatif et qualite du bien";

  return {
    ok: true,
    prix_total_acquisition_centimes: totalAcquisition.toString(),
    loyer_annuel_brut_centimes: loyerAnnuelEffectif.toString(),
    loyer_annuel_net_centimes: loyerAnnuelNet.toString(),
    rendement_brut_pct: Math.round(rendementBrut * 100) / 100,
    rendement_net_pct: Math.round(rendementNet * 100) / 100,
    interpretation,
  };
}
