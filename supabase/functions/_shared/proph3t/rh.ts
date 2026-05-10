// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : RH / Paie OHADA
// ═══════════════════════════════════════════════════════════════════════════
// 10 tools metier RH (CDC §3.3) :
//   1. compute_smig             : SMIG mensuel par pays UEMOA/CEMAC
//   2. compute_salaire_net      : Brut -> Net (cotisations + IRPP-salarie)
//   3. compute_iuts             : Impot Unique sur Traitements/Salaires (BF)
//   4. compute_its              : Impot sur Traitements et Salaires (CI/SN/etc.)
//   5. compute_taxes_parafiscales : FDFP, FSL, AGEFOP, FPE selon pays
//   6. compute_conges_payes     : conges payes selon Code du travail
//   7. compute_indemnite_licenciement : indemnite legale rupture CDI
//   8. compute_prime_anciennete : prime anciennete progressive
//   9. generate_fiche_paie      : fiche de paie complete avec lignes
//  10. simulate_embauche_cost   : cout total employeur d'une embauche
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. SMIG par pays UEMOA/CEMAC (FCFA mensuel, 2024) ────────────────────
const SMIG: Record<string, { mensuel_fcfa: number; horaire_fcfa?: number; reference: string }> = {
  CI: { mensuel_fcfa: 75_000, horaire_fcfa: 433, reference: "Decret 2023-543 portant relevement du SMIG en CI" },
  SN: { mensuel_fcfa: 64_374, horaire_fcfa: 333, reference: "Convention collective SN 2019" },
  BF: { mensuel_fcfa: 45_000, horaire_fcfa: 265, reference: "Decret 2024 SMIG BF" },
  ML: { mensuel_fcfa: 40_000, horaire_fcfa: 230, reference: "Code du travail ML" },
  BJ: { mensuel_fcfa: 52_000, horaire_fcfa: 300, reference: "Decret BJ 2023" },
  TG: { mensuel_fcfa: 52_500, horaire_fcfa: 303, reference: "Decret TG 2022" },
  NE: { mensuel_fcfa: 30_047, horaire_fcfa: 173, reference: "Convention collective NE" },
  CM: { mensuel_fcfa: 60_000, horaire_fcfa: 346, reference: "Decret CM 2023" },
  CG: { mensuel_fcfa: 90_000, horaire_fcfa: 519, reference: "Decret CG 2024" },
  GA: { mensuel_fcfa: 150_000, horaire_fcfa: 866, reference: "Decret GA 2010 SMIG" },
  TD: { mensuel_fcfa: 60_000, horaire_fcfa: 346, reference: "Code du travail TD" },
};

export function computeSmig(args: { pays: string; type?: "mensuel" | "horaire" }): {
  ok: boolean; pays: string; type: string; smig_fcfa: number; smig_centimes: string; reference?: string; error?: string;
} {
  const cfg = SMIG[args.pays];
  if (!cfg) return { ok: false, pays: args.pays, type: args.type ?? "mensuel", smig_fcfa: 0, smig_centimes: "0", error: `SMIG ${args.pays} non disponible` };
  const type = args.type ?? "mensuel";
  const value = type === "horaire" ? (cfg.horaire_fcfa ?? Math.round(cfg.mensuel_fcfa / 173)) : cfg.mensuel_fcfa;
  return {
    ok: true, pays: args.pays, type,
    smig_fcfa: value, smig_centimes: (value * 100).toString(),
    reference: cfg.reference,
  };
}

// ─── 2. Salaire NET (brut -> net) ──────────────────────────────────────────
import { computeCnssContribution } from "./finance.ts";

/**
 * Calcule le salaire net depuis le brut :
 *   1. Cotisations CNSS salarie
 *   2. ITS / IUTS (impot sur salaire)
 *   3. Net = Brut - Cotisations salarie - ITS
 */
export function computeSalaireNet(args: {
  salaire_brut_centimes: string | bigint;
  pays: string;
  enfants_a_charge?: number;
}): {
  ok: boolean;
  pays: string;
  salaire_brut_centimes: string;
  cotisations_salarie_centimes: string;
  its_centimes: string;
  salaire_net_centimes: string;
  formatted: { brut: string; cotisations: string; its: string; net: string };
  error?: string;
} {
  const brut = BigInt(args.salaire_brut_centimes);
  const cnss = computeCnssContribution({ salaire_brut_centimes: brut, pays: args.pays });
  if (!cnss.ok) {
    return { ok: false, pays: args.pays, salaire_brut_centimes: brut.toString(), cotisations_salarie_centimes: "0", its_centimes: "0", salaire_net_centimes: brut.toString(), formatted: { brut: formatMoneyFcfa(brut), cotisations: "", its: "", net: formatMoneyFcfa(brut) }, error: cnss.error };
  }
  const cotSal = BigInt(cnss.cotisation_salarie_centimes);

  // ITS estimation simplifiee (taux global selon pays — implementation precise via compute_its)
  // Pour simplicite : si pays = BF -> IUTS, sinon ITS approximation 5-15%
  let its = 0n;
  if (args.pays === "BF") {
    const iutsRes = computeIuts({ salaire_brut_centimes: brut });
    its = BigInt(iutsRes.iuts_centimes);
  } else {
    const itsRes = computeIts({ salaire_imposable_centimes: brut - cotSal, pays: args.pays });
    its = BigInt(itsRes.its_centimes);
  }

  const net = brut - cotSal - its;

  return {
    ok: true,
    pays: args.pays,
    salaire_brut_centimes: brut.toString(),
    cotisations_salarie_centimes: cotSal.toString(),
    its_centimes: its.toString(),
    salaire_net_centimes: net.toString(),
    formatted: {
      brut: formatMoneyFcfa(brut),
      cotisations: formatMoneyFcfa(cotSal),
      its: formatMoneyFcfa(its),
      net: formatMoneyFcfa(net),
    },
  };
}

// ─── 3. IUTS Burkina Faso ──────────────────────────────────────────────────
/**
 * IUTS (Impot Unique sur Traitements et Salaires) au Burkina Faso.
 * Bareme progressif applique au salaire brut (apres abattement legal).
 */
const IUTS_BF_BRACKETS: { up_to: number; rate: number }[] = [
  { up_to: 30_000, rate: 0 },
  { up_to: 50_000, rate: 0.125 },
  { up_to: 80_000, rate: 0.15 },
  { up_to: 120_000, rate: 0.18 },
  { up_to: 170_000, rate: 0.20 },
  { up_to: 250_000, rate: 0.23 },
  { up_to: Infinity, rate: 0.25 },
];

export function computeIuts(args: { salaire_brut_centimes: string | bigint }): {
  ok: boolean; iuts_centimes: string; iuts_formatted: string; tranches_appliquees: { tranche: string; rate: number; impot_centimes: string }[];
} {
  const brutFcfa = Number(BigInt(args.salaire_brut_centimes) / 100n);
  let iutsTotal = 0;
  let prev = 0;
  const tranches: { tranche: string; rate: number; impot_centimes: string }[] = [];
  for (const b of IUTS_BF_BRACKETS) {
    if (brutFcfa <= prev) break;
    const upper = b.up_to === Infinity ? brutFcfa : b.up_to;
    const taxable = Math.min(brutFcfa, upper) - prev;
    if (taxable <= 0) continue;
    const part = taxable * b.rate;
    iutsTotal += part;
    tranches.push({
      tranche: `${prev.toLocaleString()} - ${b.up_to === Infinity ? "+inf" : b.up_to.toLocaleString()} FCFA`,
      rate: b.rate,
      impot_centimes: BigInt(Math.round(part * 100)).toString(),
    });
    prev = upper;
    if (brutFcfa <= upper) break;
  }
  const iutsCent = BigInt(Math.round(iutsTotal * 100));
  return {
    ok: true,
    iuts_centimes: iutsCent.toString(),
    iuts_formatted: formatMoneyFcfa(iutsCent),
    tranches_appliquees: tranches,
  };
}

// ─── 4. ITS (autres pays UEMOA) ────────────────────────────────────────────
/**
 * ITS (Impot sur Traitements et Salaires) pour CI/SN/ML/etc.
 * Note : barenes simplifies — pour calcul officiel, consulter CGI a jour.
 */
const ITS_BRACKETS: Record<string, { up_to: number; rate: number }[]> = {
  CI: [
    { up_to: 600_000, rate: 0 },
    { up_to: 1_560_000, rate: 0.10 },
    { up_to: 2_400_000, rate: 0.15 },
    { up_to: 4_800_000, rate: 0.20 },
    { up_to: 7_440_000, rate: 0.25 },
    { up_to: Infinity, rate: 0.32 },
  ],
  SN: [
    { up_to: 630_000, rate: 0 },
    { up_to: 1_500_000, rate: 0.20 },
    { up_to: 4_000_000, rate: 0.30 },
    { up_to: Infinity, rate: 0.40 },
  ],
};

export function computeIts(args: {
  salaire_imposable_centimes: string | bigint;
  pays: string;
}): { ok: boolean; pays: string; its_centimes: string; its_formatted: string; tranches: unknown[]; error?: string } {
  const brackets = ITS_BRACKETS[args.pays];
  if (!brackets) {
    return { ok: false, pays: args.pays, its_centimes: "0", its_formatted: "0 FCFA", tranches: [], error: `ITS ${args.pays} non disponible` };
  }
  const fcfa = Number(BigInt(args.salaire_imposable_centimes) / 100n);
  let total = 0;
  let prev = 0;
  const tr: unknown[] = [];
  for (const b of brackets) {
    if (fcfa <= prev) break;
    const upper = b.up_to === Infinity ? fcfa : b.up_to;
    const taxable = Math.min(fcfa, upper) - prev;
    if (taxable <= 0) continue;
    const part = taxable * b.rate;
    total += part;
    tr.push({ tranche: `${prev.toLocaleString()} - ${b.up_to === Infinity ? "+inf" : b.up_to.toLocaleString()}`, rate: b.rate, montant_fcfa: Math.round(part) });
    prev = upper;
    if (fcfa <= upper) break;
  }
  const cent = BigInt(Math.round(total * 100));
  return { ok: true, pays: args.pays, its_centimes: cent.toString(), its_formatted: formatMoneyFcfa(cent), tranches: tr };
}

// ─── 5. Taxes parafiscales (FDFP CI, FPE BF, etc.) ─────────────────────────
const PARAFISCALES: Record<string, { code: string; libelle: string; taux: number; assiette: "brut" | "imposable"; charge: "employeur" | "salarie" }[]> = {
  CI: [
    { code: "FDFP_TFC", libelle: "FDFP Taxe Formation Continue", taux: 0.012, assiette: "brut", charge: "employeur" },
    { code: "FDFP_TA", libelle: "FDFP Taxe Apprentissage", taux: 0.004, assiette: "brut", charge: "employeur" },
  ],
  SN: [
    { code: "FNAEF", libelle: "Fonds National Apprentissage", taux: 0.03, assiette: "brut", charge: "employeur" },
  ],
  BF: [
    { code: "TPA", libelle: "Taxe Patronale d'Apprentissage", taux: 0.03, assiette: "brut", charge: "employeur" },
  ],
};

export function computeTaxesParafiscales(args: {
  salaire_brut_centimes: string | bigint;
  pays: string;
}): { ok: boolean; pays: string; taxes: { code: string; libelle: string; taux: number; montant_centimes: string }[]; total_centimes: string; total_formatted: string; error?: string } {
  const conf = PARAFISCALES[args.pays];
  if (!conf) return { ok: false, pays: args.pays, taxes: [], total_centimes: "0", total_formatted: "0 FCFA", error: `Parafiscales ${args.pays} non disponibles` };
  const brut = BigInt(args.salaire_brut_centimes);
  const taxes = conf.map(t => {
    const tauxBp = BigInt(Math.round(t.taux * 10000));
    const m = (brut * tauxBp) / 10000n;
    return { code: t.code, libelle: t.libelle, taux: t.taux, montant_centimes: m.toString() };
  });
  const total = taxes.reduce((s, t) => s + BigInt(t.montant_centimes), 0n);
  return { ok: true, pays: args.pays, taxes, total_centimes: total.toString(), total_formatted: formatMoneyFcfa(total) };
}

// ─── 6. Conges payes ───────────────────────────────────────────────────────
/**
 * Conges payes : 2.5 jours ouvrables / mois travaille (norme OHADA Code travail).
 * Indemnite = salaire moyen des 12 derniers mois × jours_pris / 30
 */
export function computeCongesPayes(args: {
  salaire_mensuel_brut_centimes: string | bigint;
  mois_travailles: number;
  jours_deja_pris?: number;
}): { ok: boolean; jours_acquis: number; jours_restants: number; indemnite_par_jour_centimes: string; indemnite_solde_centimes: string; indemnite_formatted: string } {
  const tauxAcquisition = 2.5;  // jours / mois
  const acquis = Math.floor(args.mois_travailles * tauxAcquisition);
  const pris = args.jours_deja_pris ?? 0;
  const restants = Math.max(0, acquis - pris);
  const brut = BigInt(args.salaire_mensuel_brut_centimes);
  const indemniteJour = brut / 30n;  // 30 jours en mois moyen
  const total = indemniteJour * BigInt(restants);
  return {
    ok: true,
    jours_acquis: acquis,
    jours_restants: restants,
    indemnite_par_jour_centimes: indemniteJour.toString(),
    indemnite_solde_centimes: total.toString(),
    indemnite_formatted: formatMoneyFcfa(total),
  };
}

// ─── 7. Indemnite licenciement ─────────────────────────────────────────────
/**
 * Indemnite legale licenciement (Code travail OHADA harmonise) :
 *   < 1 an : pas d'indemnite legale
 *   1-5 ans : 30% salaire moyen × annees
 *   6-10 ans : 35% salaire moyen × annees
 *   > 10 ans : 40% salaire moyen × annees
 * Plafond : 12 mois de salaire (varie par pays).
 */
export function computeIndemniteLicenciement(args: {
  salaire_moyen_centimes: string | bigint;
  annees_anciennete: number;
  pays?: string;
}): { ok: boolean; annees: number; indemnite_centimes: string; indemnite_formatted: string; tranche: string; plafond_atteint: boolean } {
  const salaire = BigInt(args.salaire_moyen_centimes);
  if (args.annees_anciennete < 1) {
    return { ok: true, annees: args.annees_anciennete, indemnite_centimes: "0", indemnite_formatted: "0 FCFA", tranche: "Anciennete < 1 an : pas d'indemnite legale", plafond_atteint: false };
  }
  let taux: number;
  let trancheLib: string;
  if (args.annees_anciennete <= 5) { taux = 0.30; trancheLib = "1-5 ans (30%)"; }
  else if (args.annees_anciennete <= 10) { taux = 0.35; trancheLib = "6-10 ans (35%)"; }
  else { taux = 0.40; trancheLib = "+10 ans (40%)"; }
  const tauxBp = BigInt(Math.round(taux * 10000));
  let indemnite = (salaire * tauxBp * BigInt(args.annees_anciennete)) / 10000n;
  const plafond = salaire * 12n;
  const plafondAtteint = indemnite > plafond;
  if (plafondAtteint) indemnite = plafond;
  return {
    ok: true,
    annees: args.annees_anciennete,
    indemnite_centimes: indemnite.toString(),
    indemnite_formatted: formatMoneyFcfa(indemnite),
    tranche: trancheLib,
    plafond_atteint: plafondAtteint,
  };
}

// ─── 8. Prime anciennete ────────────────────────────────────────────────────
/**
 * Prime anciennete progressive (Convention collective interprofessionnelle UEMOA) :
 *   2 ans : 2%
 *   3 ans : 3%
 *   4 ans : 4%
 *   5 ans et + : 5% + 1% par annee supplementaire (max 25%)
 */
export function computePrimeAnciennete(args: {
  salaire_base_centimes: string | bigint;
  annees_anciennete: number;
}): { ok: boolean; annees: number; taux: number; prime_centimes: string; prime_formatted: string } {
  let taux = 0;
  if (args.annees_anciennete >= 2) {
    if (args.annees_anciennete < 5) taux = args.annees_anciennete / 100;
    else taux = Math.min(0.25, 0.05 + (args.annees_anciennete - 5) * 0.01);
  }
  const salaire = BigInt(args.salaire_base_centimes);
  const tauxBp = BigInt(Math.round(taux * 10000));
  const prime = (salaire * tauxBp) / 10000n;
  return {
    ok: true,
    annees: args.annees_anciennete,
    taux,
    prime_centimes: prime.toString(),
    prime_formatted: formatMoneyFcfa(prime),
  };
}

// ─── 9. Generate fiche de paie ─────────────────────────────────────────────
export function generateFichePaie(args: {
  salarie: { nom: string; matricule?: string; emploi?: string };
  periode: string;                  // "YYYY-MM"
  pays: string;
  salaire_base_centimes: string | bigint;
  primes_centimes?: string | bigint;
  heures_supp_centimes?: string | bigint;
  annees_anciennete?: number;
}): {
  ok: boolean;
  fiche: {
    salarie: { nom: string; matricule?: string; emploi?: string };
    periode: string; pays: string;
    lignes_brut: { libelle: string; montant_centimes: string }[];
    salaire_brut_centimes: string;
    lignes_retenues: { libelle: string; taux: number; montant_centimes: string }[];
    salaire_net_centimes: string;
    cout_employeur_centimes: string;
  };
} {
  const base = BigInt(args.salaire_base_centimes);
  const primes = args.primes_centimes ? BigInt(args.primes_centimes) : 0n;
  const hs = args.heures_supp_centimes ? BigInt(args.heures_supp_centimes) : 0n;
  const anciennete = args.annees_anciennete
    ? BigInt(computePrimeAnciennete({ salaire_base_centimes: base, annees_anciennete: args.annees_anciennete }).prime_centimes)
    : 0n;
  const brut = base + primes + hs + anciennete;

  const cnss = computeCnssContribution({ salaire_brut_centimes: brut, pays: args.pays });
  const cotSal = cnss.ok ? BigInt(cnss.cotisation_salarie_centimes) : 0n;
  const cotEmp = cnss.ok ? BigInt(cnss.cotisation_employeur_centimes) : 0n;

  let its = 0n;
  let itsTaux = 0;
  if (args.pays === "BF") {
    const r = computeIuts({ salaire_brut_centimes: brut });
    its = BigInt(r.iuts_centimes);
  } else {
    const r = computeIts({ salaire_imposable_centimes: brut - cotSal, pays: args.pays });
    if (r.ok) its = BigInt(r.its_centimes);
  }

  const lignes_brut: { libelle: string; montant_centimes: string }[] = [
    { libelle: "Salaire de base", montant_centimes: base.toString() },
  ];
  if (primes > 0n) lignes_brut.push({ libelle: "Primes & gratifications", montant_centimes: primes.toString() });
  if (hs > 0n) lignes_brut.push({ libelle: "Heures supplementaires", montant_centimes: hs.toString() });
  if (anciennete > 0n) lignes_brut.push({ libelle: `Prime anciennete (${args.annees_anciennete} ans)`, montant_centimes: anciennete.toString() });

  const lignes_retenues: { libelle: string; taux: number; montant_centimes: string }[] = [
    { libelle: `CNSS salarie (${args.pays})`, taux: cnss.ok ? cnss.taux_salarie : 0, montant_centimes: cotSal.toString() },
    { libelle: args.pays === "BF" ? "IUTS" : "ITS", taux: itsTaux, montant_centimes: its.toString() },
  ];

  const net = brut - cotSal - its;
  const coutEmployeur = brut + cotEmp;

  return {
    ok: true,
    fiche: {
      salarie: args.salarie,
      periode: args.periode, pays: args.pays,
      lignes_brut, salaire_brut_centimes: brut.toString(),
      lignes_retenues, salaire_net_centimes: net.toString(),
      cout_employeur_centimes: coutEmployeur.toString(),
    },
  };
}

// ─── 10. Simulate cout total embauche ───────────────────────────────────────
export function simulateEmbaucheCost(args: {
  salaire_brut_mensuel_centimes: string | bigint;
  pays: string;
  duree_mois?: number;
}): {
  ok: boolean;
  pays: string; duree_mois: number;
  cout_total_centimes: string; cout_total_formatted: string;
  decomposition: {
    salaires_bruts_centimes: string;
    cotisations_employeur_centimes: string;
    parafiscales_centimes: string;
    primes_anciennete_estimees_centimes: string;
  };
  cout_par_mois_centimes: string;
} {
  const duree = args.duree_mois ?? 12;
  const brutMensuel = BigInt(args.salaire_brut_mensuel_centimes);
  const totalBruts = brutMensuel * BigInt(duree);

  const cnss = computeCnssContribution({ salaire_brut_centimes: brutMensuel, pays: args.pays });
  const cotEmpMensuel = cnss.ok ? BigInt(cnss.cotisation_employeur_centimes) : 0n;
  const totalCotEmp = cotEmpMensuel * BigInt(duree);

  const para = computeTaxesParafiscales({ salaire_brut_centimes: brutMensuel, pays: args.pays });
  const paraTotal = para.ok ? BigInt(para.total_centimes) * BigInt(duree) : 0n;

  // Estimation prime anciennete moyenne (0% pour 1ere annee, 1.5% pour 12 mois)
  const primeAncienneteEstim = duree >= 24 ? (totalBruts * 200n) / 10000n : 0n;

  const total = totalBruts + totalCotEmp + paraTotal + primeAncienneteEstim;

  return {
    ok: true,
    pays: args.pays, duree_mois: duree,
    cout_total_centimes: total.toString(),
    cout_total_formatted: formatMoneyFcfa(total),
    decomposition: {
      salaires_bruts_centimes: totalBruts.toString(),
      cotisations_employeur_centimes: totalCotEmp.toString(),
      parafiscales_centimes: paraTotal.toString(),
      primes_anciennete_estimees_centimes: primeAncienneteEstim.toString(),
    },
    cout_par_mois_centimes: (total / BigInt(duree)).toString(),
  };
}
