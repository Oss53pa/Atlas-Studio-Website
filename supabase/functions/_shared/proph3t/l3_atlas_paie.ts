// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 app-specific : ATLAS PAIE
// ═══════════════════════════════════════════════════════════════════════════
// 6 tools metier paie :
//   1. compute_paie_batch          : batch fiche paie pour N salaries
//   2. compute_indemnite_transport : transport selon barene pays
//   3. compute_heures_supp         : heures sup avec majorations legales
//   4. validate_avenant_salaire    : check coherence avenant (smic, conventions)
//   5. compute_solde_tout_compte   : solde de tout compte (rupture contrat)
//   6. forecast_masse_salariale    : projection masse salariale annuelle
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";
import { computeCnssContribution } from "./finance.ts";
import {
  computeIts, computeIuts, computeCongesPayes,
  computeIndemniteLicenciement, computePrimeAnciennete,
  generateFichePaie,
} from "./rh.ts";

// ─── 1. Paie batch ─────────────────────────────────────────────────────────
export function computePaieBatch(args: {
  pays: string;
  periode: string;
  salaries: { id: string; nom: string; salaire_base_centimes: string | bigint; primes_centimes?: string | bigint; heures_supp_centimes?: string | bigint; annees_anciennete?: number; emploi?: string; matricule?: string }[];
}): {
  ok: boolean;
  pays: string;
  periode: string;
  total_brut_centimes: string;
  total_net_centimes: string;
  total_cotisations_employeur_centimes: string;
  total_cout_employeur_centimes: string;
  total_formatted: { brut: string; net: string; cot_employeur: string; cout_total: string };
  detail_par_salarie: { id: string; nom: string; salaire_brut_centimes: string; salaire_net_centimes: string; cout_employeur_centimes: string }[];
} {
  let totalBrut = 0n, totalNet = 0n, totalCotEmp = 0n;
  const detail: any[] = [];

  for (const s of args.salaries) {
    const fiche = generateFichePaie({
      salarie: { nom: s.nom, matricule: s.matricule, emploi: s.emploi },
      periode: args.periode,
      pays: args.pays,
      salaire_base_centimes: s.salaire_base_centimes,
      primes_centimes: s.primes_centimes,
      heures_supp_centimes: s.heures_supp_centimes,
      annees_anciennete: s.annees_anciennete,
    });
    if (fiche.ok) {
      const brut = BigInt(fiche.fiche.salaire_brut_centimes);
      const net = BigInt(fiche.fiche.salaire_net_centimes);
      const cout = BigInt(fiche.fiche.cout_employeur_centimes);
      totalBrut += brut;
      totalNet += net;
      totalCotEmp += cout - brut;
      detail.push({
        id: s.id, nom: s.nom,
        salaire_brut_centimes: brut.toString(),
        salaire_net_centimes: net.toString(),
        cout_employeur_centimes: cout.toString(),
      });
    }
  }

  const coutTotal = totalBrut + totalCotEmp;
  return {
    ok: true,
    pays: args.pays,
    periode: args.periode,
    total_brut_centimes: totalBrut.toString(),
    total_net_centimes: totalNet.toString(),
    total_cotisations_employeur_centimes: totalCotEmp.toString(),
    total_cout_employeur_centimes: coutTotal.toString(),
    total_formatted: {
      brut: formatMoneyFcfa(totalBrut),
      net: formatMoneyFcfa(totalNet),
      cot_employeur: formatMoneyFcfa(totalCotEmp),
      cout_total: formatMoneyFcfa(coutTotal),
    },
    detail_par_salarie: detail,
  };
}

// ─── 2. Indemnite transport ─────────────────────────────────────────────────
/**
 * Indemnite transport non imposable selon plafond pays UEMOA.
 *
 * CI : plafond 30 000 FCFA/mois exonere
 * SN : plafond 26 000 FCFA/mois
 * BF : plafond 25 000 FCFA/mois
 * ML : plafond 20 000 FCFA/mois
 */
const TRANSPORT_PLAFONDS_FCFA: Record<string, { plafond: number; reference: string }> = {
  CI: { plafond: 30_000, reference: "CGI CI art. 81" },
  SN: { plafond: 26_000, reference: "CGI SN" },
  BF: { plafond: 25_000, reference: "CGI BF" },
  ML: { plafond: 20_000, reference: "CGI ML" },
  BJ: { plafond: 25_000, reference: "Convention BJ" },
  TG: { plafond: 25_000, reference: "Convention TG" },
};

export function computeIndemniteTransport(args: {
  montant_alloue_centimes: string | bigint;
  pays: string;
}): {
  ok: boolean;
  pays: string;
  montant_alloue_centimes: string;
  plafond_exonere_centimes: string;
  partie_exoneree_centimes: string;
  partie_imposable_centimes: string;
  reference?: string;
  error?: string;
} {
  const cfg = TRANSPORT_PLAFONDS_FCFA[args.pays];
  if (!cfg) return { ok: false, pays: args.pays, montant_alloue_centimes: "0", plafond_exonere_centimes: "0", partie_exoneree_centimes: "0", partie_imposable_centimes: "0", error: `Pays ${args.pays} non supporte` };

  const alloue = BigInt(args.montant_alloue_centimes);
  const plafond = BigInt(cfg.plafond * 100);
  const exonere = alloue < plafond ? alloue : plafond;
  const imposable = alloue - exonere;

  return {
    ok: true,
    pays: args.pays,
    montant_alloue_centimes: alloue.toString(),
    plafond_exonere_centimes: plafond.toString(),
    partie_exoneree_centimes: exonere.toString(),
    partie_imposable_centimes: imposable.toString(),
    reference: cfg.reference,
  };
}

// ─── 3. Heures supplementaires ─────────────────────────────────────────────
/**
 * Heures supplementaires SYSCOHADA / Code travail :
 *   - 8h hebdo dela 40h : majoration 15%
 *   - heures suivantes : 50%
 *   - heures de nuit / dimanche : 75%-100%
 *   - jours feries : 100%
 */
export function computeHeuresSupp(args: {
  taux_horaire_centimes: string | bigint;
  heures_45_pct: number;        // 0-15 (premieres 8h)
  heures_50_pct: number;        // au-dela
  heures_nuit?: number;
  heures_dimanche?: number;
  heures_jour_ferie?: number;
}): {
  ok: boolean;
  detail: { type: string; heures: number; taux_majoration: number; montant_centimes: string }[];
  total_heures: number;
  total_montant_centimes: string;
  total_formatted: string;
} {
  const taux = BigInt(args.taux_horaire_centimes);
  const detail: any[] = [];
  let totalH = 0;
  let totalM = 0n;

  const lignes: { type: string; heures: number; majoration: number }[] = [
    { type: "Heures sup 15% (40-48h hebdo)", heures: args.heures_45_pct, majoration: 0.15 },
    { type: "Heures sup 50% (>48h)", heures: args.heures_50_pct, majoration: 0.50 },
    { type: "Heures de nuit", heures: args.heures_nuit ?? 0, majoration: 0.75 },
    { type: "Heures dimanche", heures: args.heures_dimanche ?? 0, majoration: 0.75 },
    { type: "Jour ferie", heures: args.heures_jour_ferie ?? 0, majoration: 1.0 },
  ];

  for (const l of lignes) {
    if (l.heures <= 0) continue;
    const tauxMajore = (taux * BigInt(Math.round((1 + l.majoration) * 10000))) / 10000n;
    const montant = tauxMajore * BigInt(Math.round(l.heures * 100)) / 100n;
    detail.push({ type: l.type, heures: l.heures, taux_majoration: l.majoration, montant_centimes: montant.toString() });
    totalH += l.heures;
    totalM += montant;
  }

  return {
    ok: true,
    detail,
    total_heures: Math.round(totalH * 100) / 100,
    total_montant_centimes: totalM.toString(),
    total_formatted: formatMoneyFcfa(totalM),
  };
}

// ─── 4. Validate avenant ──────────────────────────────────────────────────
/**
 * Check coherence d'un avenant salaire :
 *   - Pas de baisse de salaire (interdit unilateralement)
 *   - Salaire >= SMIG legal
 *   - Coherence avec convention collective si applicable
 */
export function validateAvenantSalaire(args: {
  salaire_actuel_centimes: string | bigint;
  salaire_propose_centimes: string | bigint;
  pays: string;
  smig_legal_centimes?: string | bigint;
  convention_collective_min_centimes?: string | bigint;
  motif?: string;
}): {
  ok: boolean;
  conformite: boolean;
  evolution_pct: number;
  alertes: { code: string; severity: "warning" | "critical"; message: string }[];
  recommendations: string[];
} {
  const actuel = BigInt(args.salaire_actuel_centimes);
  const propose = BigInt(args.salaire_propose_centimes);
  const evolution = actuel > 0n ? Math.round((Number(propose - actuel) / Number(actuel)) * 10000) / 100 : 0;

  const alertes: any[] = [];
  const recos: string[] = [];

  if (propose < actuel) {
    alertes.push({ code: "BAISSE_SALAIRE", severity: "critical", message: "Baisse de salaire — necessite accord ecrit du salarie + motif legitime" });
    recos.push("Documenter le motif (sanction disciplinaire, accord d'entreprise...) et obtenir signature");
  }

  if (args.smig_legal_centimes) {
    const smig = BigInt(args.smig_legal_centimes);
    if (propose < smig) {
      alertes.push({ code: "INFERIEUR_SMIG", severity: "critical", message: `Salaire ${formatMoneyFcfa(propose)} < SMIG ${formatMoneyFcfa(smig)}` });
      recos.push(`Reajuster a au moins ${formatMoneyFcfa(smig)}`);
    }
  }

  if (args.convention_collective_min_centimes) {
    const min = BigInt(args.convention_collective_min_centimes);
    if (propose < min) {
      alertes.push({ code: "INFERIEUR_CONVENTION", severity: "warning", message: `Salaire < minimum convention collective (${formatMoneyFcfa(min)})` });
      recos.push("Verifier la categorie/echelon et reajuster");
    }
  }

  if (evolution > 30) {
    alertes.push({ code: "AUGMENTATION_IMPORTANTE", severity: "warning", message: `Augmentation +${evolution}% — verifier coherence avec equite interne` });
  }

  if (recos.length === 0) recos.push("Avenant conforme. Faire signer par les 2 parties + remettre original.");

  return {
    ok: true,
    conformite: alertes.filter(a => a.severity === "critical").length === 0,
    evolution_pct: evolution,
    alertes,
    recommendations: recos,
  };
}

// ─── 5. Solde tout compte ───────────────────────────────────────────────────
export function computeSoldeToutCompte(args: {
  salaire_moyen_centimes: string | bigint;
  jours_travailles_periode_partielle?: number;     // si depart en milieu de mois
  jours_dans_periode?: number;
  conges_payes_restants_jours: number;
  primes_dues_centimes?: string | bigint;
  annees_anciennete: number;
  type_rupture: "demission" | "licenciement" | "retraite" | "rupture_conventionnelle" | "fin_cdd";
  pays?: string;
}): {
  ok: boolean;
  type_rupture: string;
  composition: { libelle: string; montant_centimes: string }[];
  brut_total_centimes: string;
  brut_total_formatted: string;
  notes: string[];
} {
  const sal = BigInt(args.salaire_moyen_centimes);
  const composition: { libelle: string; montant_centimes: string }[] = [];
  const notes: string[] = [];
  let total = 0n;

  // Salaire periode partielle
  if (args.jours_travailles_periode_partielle && args.jours_dans_periode) {
    const periodPartiel = (sal * BigInt(args.jours_travailles_periode_partielle)) / BigInt(args.jours_dans_periode);
    composition.push({ libelle: "Salaire periode partielle", montant_centimes: periodPartiel.toString() });
    total += periodPartiel;
  } else {
    composition.push({ libelle: "Dernier salaire mensuel", montant_centimes: sal.toString() });
    total += sal;
  }

  // Conges payes
  const congesRes = computeCongesPayes({
    salaire_mensuel_brut_centimes: sal,
    mois_travailles: args.annees_anciennete * 12,
    jours_deja_pris: (args.annees_anciennete * 30) - args.conges_payes_restants_jours,
  });
  if (congesRes.ok) {
    composition.push({ libelle: `Indemnite conges payes (${args.conges_payes_restants_jours}j)`, montant_centimes: congesRes.indemnite_solde_centimes });
    total += BigInt(congesRes.indemnite_solde_centimes);
  }

  // Primes dues
  if (args.primes_dues_centimes) {
    composition.push({ libelle: "Primes et gratifications dues", montant_centimes: BigInt(args.primes_dues_centimes).toString() });
    total += BigInt(args.primes_dues_centimes);
  }

  // Indemnite licenciement (si applicable)
  if (args.type_rupture === "licenciement" || args.type_rupture === "rupture_conventionnelle") {
    const indemniteRes = computeIndemniteLicenciement({
      salaire_moyen_centimes: sal,
      annees_anciennete: args.annees_anciennete,
      pays: args.pays,
    });
    if (indemniteRes.ok && BigInt(indemniteRes.indemnite_centimes) > 0n) {
      composition.push({ libelle: `Indemnite ${args.type_rupture} (${args.annees_anciennete} ans)`, montant_centimes: indemniteRes.indemnite_centimes });
      total += BigInt(indemniteRes.indemnite_centimes);
    }
  }

  if (args.type_rupture === "demission") notes.push("Demission : pas d'indemnite de licenciement legale");
  if (args.type_rupture === "retraite") notes.push("Retraite : verifier l'indemnite de depart conventionnelle (souvent 1-3 mois)");
  if (args.type_rupture === "fin_cdd") notes.push("Fin de CDD : prime de precarite 5-10% du brut total cumule (selon pays)");

  return {
    ok: true,
    type_rupture: args.type_rupture,
    composition,
    brut_total_centimes: total.toString(),
    brut_total_formatted: formatMoneyFcfa(total),
    notes,
  };
}

// ─── 6. Forecast masse salariale ────────────────────────────────────────────
export function forecastMasseSalariale(args: {
  effectif_actuel: number;
  cout_moyen_mensuel_centimes: string | bigint;
  taux_augmentation_annuelle_pct?: number;     // ex 3
  recrutements_prevus: { mois: string; nb: number; cout_unitaire_mensuel_centimes: string | bigint }[];
  departs_prevus: { mois: string; nb: number }[];
  horizon_mois: number;
}): {
  ok: boolean;
  projection_mensuelle: { mois: string; effectif: number; masse_salariale_centimes: string }[];
  total_annuel_centimes: string;
  total_formatted: string;
  effectif_fin_periode: number;
  augmentation_pct: number;
} {
  const taux = (args.taux_augmentation_annuelle_pct ?? 0) / 100;
  const tauxMensuel = Math.pow(1 + taux, 1 / 12) - 1;
  let effectif = args.effectif_actuel;
  let coutUnitaire = Number(BigInt(args.cout_moyen_mensuel_centimes));
  const projection: any[] = [];
  let total = 0n;

  const today = new Date();
  for (let m = 0; m < args.horizon_mois; m++) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const monthKey = monthDate.toISOString().slice(0, 7);

    // Recrutements
    for (const r of args.recrutements_prevus) {
      if (r.mois === monthKey) {
        effectif += r.nb;
      }
    }
    // Departs
    for (const d of args.departs_prevus) {
      if (d.mois === monthKey) {
        effectif = Math.max(0, effectif - d.nb);
      }
    }

    coutUnitaire = coutUnitaire * (1 + tauxMensuel);
    const masse = BigInt(Math.round(coutUnitaire * effectif));
    projection.push({ mois: monthKey, effectif, masse_salariale_centimes: masse.toString() });
    total += masse;
  }

  const augmentation = args.cout_moyen_mensuel_centimes
    ? Math.round((coutUnitaire / Number(BigInt(args.cout_moyen_mensuel_centimes)) - 1) * 10000) / 100
    : 0;

  return {
    ok: true,
    projection_mensuelle: projection,
    total_annuel_centimes: total.toString(),
    total_formatted: formatMoneyFcfa(total),
    effectif_fin_periode: effectif,
    augmentation_pct: augmentation,
  };
}
