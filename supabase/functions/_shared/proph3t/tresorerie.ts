// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : TRESORERIE / Cash management
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. forecast_cashflow         : prevision tresorerie 13 semaines
//   2. compute_decouvert_cost    : cout d'un decouvert bancaire (frais + interets)
//   3. compute_escompte_commercial : escompte commercial pour paiement anticipe
//   4. compute_factoring_cost    : cout d'une operation d'affacturage
//   5. score_bank_health         : score sante d'une banque (interlocuteur)
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. Cashflow forecast 13 semaines ──────────────────────────────────────
/**
 * Prevision de tresorerie hebdomadaire sur 13 semaines.
 * Inputs : encaissements + decaissements prevus + solde initial.
 * Output : evolution du solde par semaine + alertes (passages en negatif).
 */
export function forecastCashflow(args: {
  solde_initial_centimes: string | bigint;
  encaissements: { semaine: number; montant_centimes: string | bigint; libelle?: string; certain?: boolean }[];
  decaissements: { semaine: number; montant_centimes: string | bigint; libelle?: string; certain?: boolean }[];
  horizon_semaines?: number;
}): {
  ok: boolean;
  horizon_semaines: number;
  solde_initial_centimes: string;
  forecast: { semaine: number; encaissements_centimes: string; decaissements_centimes: string; solde_fin_centimes: string; alerte?: string }[];
  semaines_negatives: number[];
  decouvert_max_centimes: string;
  pic_tresorerie_centimes: string;
} {
  const horizon = args.horizon_semaines ?? 13;
  let solde = BigInt(args.solde_initial_centimes);
  const forecast: any[] = [];
  const negatives: number[] = [];
  let decouvertMax = 0n;
  let pic = solde;

  for (let s = 1; s <= horizon; s++) {
    const enc = args.encaissements
      .filter(e => e.semaine === s)
      .reduce((sum, e) => sum + BigInt(e.montant_centimes), 0n);
    const dec = args.decaissements
      .filter(d => d.semaine === s)
      .reduce((sum, d) => sum + BigInt(d.montant_centimes), 0n);
    solde = solde + enc - dec;
    if (solde < 0n) {
      negatives.push(s);
      if (-solde > decouvertMax) decouvertMax = -solde;
    }
    if (solde > pic) pic = solde;

    forecast.push({
      semaine: s,
      encaissements_centimes: enc.toString(),
      decaissements_centimes: dec.toString(),
      solde_fin_centimes: solde.toString(),
      alerte: solde < 0n ? "TRESORERIE NEGATIVE" : solde < BigInt(1_000_000 * 100) ? "Tresorerie tres faible" : undefined,
    });
  }

  return {
    ok: true,
    horizon_semaines: horizon,
    solde_initial_centimes: BigInt(args.solde_initial_centimes).toString(),
    forecast,
    semaines_negatives: negatives,
    decouvert_max_centimes: decouvertMax.toString(),
    pic_tresorerie_centimes: pic.toString(),
  };
}

// ─── 2. Cout decouvert bancaire ────────────────────────────────────────────
/**
 * Calcule le cout total d'un decouvert bancaire :
 *   - Interets debiteurs (taux banque)
 *   - Commission de plus fort decouvert (CPFD)
 *   - Frais de tenue de compte / agios
 *
 * Convention OHADA : interets calcules sur base 360 jours.
 * Commission CPFD : 0.05% du plus fort decouvert mensuel (norme BCEAO).
 */
export function computeDecouvertCost(args: {
  montant_decouvert_centimes: string | bigint;
  duree_jours: number;
  taux_decouvert_annuel?: number;        // ex 0.15 (15%)
  cpfd_pct?: number;                      // commission plus fort decouvert
  frais_fixes_centimes?: string | bigint;
}): {
  ok: boolean;
  duree_jours: number;
  taux_annuel: number;
  interets_centimes: string;
  cpfd_centimes: string;
  frais_fixes_centimes: string;
  cout_total_centimes: string;
  cout_total_formatted: string;
  taux_effectif_global_pct: number;
} {
  const montant = BigInt(args.montant_decouvert_centimes);
  const tauxAn = args.taux_decouvert_annuel ?? 0.15;
  const cpfdPct = args.cpfd_pct ?? 0.0005;
  const fraisFixes = args.frais_fixes_centimes ? BigInt(args.frais_fixes_centimes) : 0n;

  // Interets prorata 360 jours
  const tauxJourBp = BigInt(Math.round((tauxAn / 360) * 1_000_000));
  const interets = (montant * tauxJourBp * BigInt(args.duree_jours)) / 1_000_000n;

  // CPFD
  const cpfdBp = BigInt(Math.round(cpfdPct * 10000));
  const cpfd = (montant * cpfdBp) / 10000n;

  const cout = interets + cpfd + fraisFixes;
  // TEG = cout total / montant × (360 / duree)
  const teg = montant > 0n && args.duree_jours > 0
    ? (Number(cout) / Number(montant)) * (360 / args.duree_jours) * 100
    : 0;

  return {
    ok: true,
    duree_jours: args.duree_jours,
    taux_annuel: tauxAn,
    interets_centimes: interets.toString(),
    cpfd_centimes: cpfd.toString(),
    frais_fixes_centimes: fraisFixes.toString(),
    cout_total_centimes: cout.toString(),
    cout_total_formatted: formatMoneyFcfa(cout),
    taux_effectif_global_pct: Math.round(teg * 100) / 100,
  };
}

// ─── 3. Escompte commercial ─────────────────────────────────────────────────
/**
 * Escompte commercial = remise pour paiement anticipe.
 *   Valeur actuelle = Valeur nominale × (1 - taux × jours / 360)
 *
 * Aussi : decision optimale entre paiement immediat avec escompte vs paiement
 * a l'echeance (comparer cout opportunite avec taux placement).
 */
export function computeEscompteCommercial(args: {
  valeur_nominale_centimes: string | bigint;
  taux_escompte_pct: number;            // ex 2 pour 2%
  jours_avant_echeance: number;
  taux_placement_alternatif_pct?: number;  // pour comparaison
}): {
  ok: boolean;
  valeur_nominale_centimes: string;
  escompte_centimes: string;
  valeur_actuelle_centimes: string;
  formule: string;
  taux_actuariel_pct: number;
  decision_recommandee?: string;
} {
  const nom = BigInt(args.valeur_nominale_centimes);
  const tauxBp = BigInt(Math.round((args.taux_escompte_pct / 100) * 1_000_000));
  const escompte = (nom * tauxBp * BigInt(args.jours_avant_echeance)) / (360n * 1_000_000n);
  const va = nom - escompte;

  // Taux actuariel = (escompte / VA) × (360 / jours)
  const tauxActuariel = va > 0n && args.jours_avant_echeance > 0
    ? (Number(escompte) / Number(va)) * (360 / args.jours_avant_echeance) * 100
    : 0;

  let decision: string | undefined;
  if (args.taux_placement_alternatif_pct !== undefined) {
    decision = tauxActuariel > args.taux_placement_alternatif_pct
      ? `Prendre l'escompte : taux actuariel ${tauxActuariel.toFixed(2)}% > placement alternatif ${args.taux_placement_alternatif_pct}%`
      : `Refuser l'escompte : taux actuariel ${tauxActuariel.toFixed(2)}% < placement alternatif ${args.taux_placement_alternatif_pct}%`;
  }

  return {
    ok: true,
    valeur_nominale_centimes: nom.toString(),
    escompte_centimes: escompte.toString(),
    valeur_actuelle_centimes: va.toString(),
    formule: `VA = ${nom} × (1 - ${args.taux_escompte_pct}% × ${args.jours_avant_echeance}/360)`,
    taux_actuariel_pct: Math.round(tauxActuariel * 100) / 100,
    decision_recommandee: decision,
  };
}

// ─── 4. Cout factoring (affacturage) ───────────────────────────────────────
/**
 * Calcule le cout d'une operation d'affacturage :
 *   - Commission factoring (% du montant cede)
 *   - Commission financiere (taux × jours / 360)
 *   - Retenue de garantie (% restitue a l'echeance)
 *
 * Le factor avance immediatement (montant - commissions - retenue) et
 * collecte la creance a l'echeance.
 */
export function computeFactoringCost(args: {
  montant_creance_centimes: string | bigint;
  jours_avant_echeance: number;
  commission_factoring_pct: number;            // ex 0.5 pour 0.5%
  taux_financement_annuel_pct: number;         // ex 8 pour 8%
  retenue_garantie_pct: number;                 // ex 10 pour 10%
}): {
  ok: boolean;
  montant_creance_centimes: string;
  commission_factoring_centimes: string;
  cout_financement_centimes: string;
  retenue_garantie_centimes: string;
  avance_immediate_centimes: string;
  cout_total_centimes: string;
  taux_effectif_pct: number;
} {
  const montant = BigInt(args.montant_creance_centimes);

  const commFactBp = BigInt(Math.round(args.commission_factoring_pct * 100));
  const commFact = (montant * commFactBp) / 10000n;

  const tauxFinBp = BigInt(Math.round((args.taux_financement_annuel_pct / 100) * 1_000_000));
  const coutFin = (montant * tauxFinBp * BigInt(args.jours_avant_echeance)) / (360n * 1_000_000n);

  const retenueBp = BigInt(Math.round(args.retenue_garantie_pct * 100));
  const retenue = (montant * retenueBp) / 10000n;

  const avance = montant - commFact - coutFin - retenue;
  const coutTotal = commFact + coutFin;
  const tauxEffectif = montant > 0n
    ? (Number(coutTotal) / Number(montant)) * (360 / args.jours_avant_echeance) * 100
    : 0;

  return {
    ok: true,
    montant_creance_centimes: montant.toString(),
    commission_factoring_centimes: commFact.toString(),
    cout_financement_centimes: coutFin.toString(),
    retenue_garantie_centimes: retenue.toString(),
    avance_immediate_centimes: avance.toString(),
    cout_total_centimes: coutTotal.toString(),
    taux_effectif_pct: Math.round(tauxEffectif * 100) / 100,
  };
}

// ─── 5. Score sante d'une banque ───────────────────────────────────────────
/**
 * Score un partenaire bancaire sur des criteres operationnels :
 *   - Reactivite SAV (1-5)
 *   - Couts (taux, frais, agios par rapport au marche)
 *   - Couverture geographique (multi-pays UEMOA/CEMAC)
 *   - Solidite financiere (ratio de solvabilite ou rating)
 *   - Digital (qualite plateforme, API, e-banking)
 */
export interface BankCriteria {
  reactivite_sav: 1 | 2 | 3 | 4 | 5;
  competitivite_couts: 1 | 2 | 3 | 4 | 5;
  couverture_geo: 1 | 2 | 3 | 4 | 5;
  solidite_financiere: 1 | 2 | 3 | 4 | 5;
  digital_quality: 1 | 2 | 3 | 4 | 5;
}

export function scoreBankHealth(args: {
  bank_name: string;
  criteria: BankCriteria;
}): {
  ok: boolean;
  bank_name: string;
  score_global: number;
  detail: { critere: string; note: number; ponderation: number; contribution: number }[];
  niveau: "excellent" | "satisfaisant" | "moyen" | "a_revoir";
  recommandation: string;
} {
  const ponderations: Record<keyof BankCriteria, number> = {
    reactivite_sav: 0.20,
    competitivite_couts: 0.25,
    couverture_geo: 0.15,
    solidite_financiere: 0.25,
    digital_quality: 0.15,
  };
  const detail: { critere: string; note: number; ponderation: number; contribution: number }[] = [];
  let score = 0;
  for (const [k, v] of Object.entries(args.criteria) as [keyof BankCriteria, number][]) {
    const pond = ponderations[k];
    const contribution = v * pond;
    score += contribution;
    detail.push({ critere: k, note: v, ponderation: pond, contribution: Math.round(contribution * 100) / 100 });
  }
  // Score sur 100
  const scoreGlobal = Math.round((score / 5) * 100);
  const niveau: "excellent" | "satisfaisant" | "moyen" | "a_revoir" =
    scoreGlobal >= 85 ? "excellent" : scoreGlobal >= 65 ? "satisfaisant" : scoreGlobal >= 45 ? "moyen" : "a_revoir";

  const reco =
    niveau === "excellent" ? "Banque partenaire de confiance. Concentrer le volume."
    : niveau === "satisfaisant" ? "Bonne banque. Negocier conditions tarifaires."
    : niveau === "moyen" ? "Diversifier le risque. Considerer une 2eme banque pour les operations critiques."
    : "Diminuer la dependance. Ouvrir compte chez une banque mieux classee.";

  return {
    ok: true,
    bank_name: args.bank_name,
    score_global: scoreGlobal,
    detail,
    niveau,
    recommandation: reco,
  };
}
