// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 app-specific : COCKPIT FA (Cockpit Financier-Comptable)
// ═══════════════════════════════════════════════════════════════════════════
// 8 tools metier specifiques au Cockpit FA :
//   1. compute_kpi_dashboard       : 6 KPIs cles affiches sur le dashboard
//   2. detect_cycle_breaks         : ruptures dans la sequence ecritures
//   3. forecast_dso_evolution      : projection DSO 6 mois + alertes
//   4. compute_grand_livre_summary : synthese par compte (debits, credits, solde)
//   5. validate_clos_exercice      : checklist avant cloture (lettrage, prov, etc.)
//   6. compute_immobilisations_amortissements : amortissements lineaires/degressifs
//   7. detect_ecart_inventaire     : variations stocks anormales
//   8. generate_situation_intermediaire : situation comptable date X (proforma)
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. KPI Dashboard ──────────────────────────────────────────────────────
export function computeKpiDashboard(args: {
  ca_total_centimes: string | bigint;
  ca_periode_precedente_centimes?: string | bigint;
  total_creances_centimes: string | bigint;
  total_dettes_centimes: string | bigint;
  tresorerie_centimes: string | bigint;
  total_actif_centimes: string | bigint;
  capitaux_propres_centimes: string | bigint;
  jours_periode?: number;
}): {
  ok: boolean;
  kpis: {
    ca_total: { centimes: string; formatted: string; evolution_pct?: number };
    creances_clients: { centimes: string; formatted: string };
    dettes_fournisseurs: { centimes: string; formatted: string };
    tresorerie: { centimes: string; formatted: string };
    autonomie_pct: number;
    bfr_estime_centimes: string;
  };
  alertes: { code: string; severity: "info" | "warning" | "critical"; message: string }[];
} {
  const ca = BigInt(args.ca_total_centimes);
  const cre = BigInt(args.total_creances_centimes);
  const dette = BigInt(args.total_dettes_centimes);
  const treso = BigInt(args.tresorerie_centimes);
  const actif = BigInt(args.total_actif_centimes);
  const cp = BigInt(args.capitaux_propres_centimes);

  let evolution: number | undefined;
  if (args.ca_periode_precedente_centimes) {
    const prev = BigInt(args.ca_periode_precedente_centimes);
    if (prev > 0n) {
      evolution = Math.round((Number(ca - prev) / Number(prev)) * 10000) / 100;
    }
  }

  const autonomie = actif > 0n ? Math.round((Number(cp) / Number(actif)) * 10000) / 100 : 0;
  const bfr = cre - dette;

  const alertes: any[] = [];
  if (treso < 0n) alertes.push({ code: "TRESO_NEGATIVE", severity: "critical", message: "Tresorerie negative — decouvert bancaire" });
  if (autonomie < 20) alertes.push({ code: "AUTONOMIE_FAIBLE", severity: "warning", message: `Autonomie ${autonomie}% < 20% — forte dependance bancaire` });
  if (evolution !== undefined && evolution < -10) alertes.push({ code: "CA_EN_BAISSE", severity: "warning", message: `CA en baisse de ${Math.abs(evolution)}%` });
  if (cre > ca / 6n) alertes.push({ code: "CREANCES_ELEVEES", severity: "info", message: "Creances clients > 60 jours d'activite — relancer" });

  return {
    ok: true,
    kpis: {
      ca_total: { centimes: ca.toString(), formatted: formatMoneyFcfa(ca), evolution_pct: evolution },
      creances_clients: { centimes: cre.toString(), formatted: formatMoneyFcfa(cre) },
      dettes_fournisseurs: { centimes: dette.toString(), formatted: formatMoneyFcfa(dette) },
      tresorerie: { centimes: treso.toString(), formatted: formatMoneyFcfa(treso) },
      autonomie_pct: autonomie,
      bfr_estime_centimes: bfr.toString(),
    },
    alertes,
  };
}

// ─── 2. Detect cycle breaks ─────────────────────────────────────────────────
/**
 * Detecte les ruptures dans la sequence des numeros de pieces.
 * Pieces SYSCOHADA : numerotation continue obligatoire par journal.
 */
export function detectCycleBreaks(args: {
  pieces: { journal: string; numero: string; date: string }[];
  format_attendu?: "numerique" | "alphanumerique";
}): {
  ok: boolean;
  ruptures: { journal: string; numero_manquant: string; numero_avant: string; numero_apres: string }[];
  total_journaux: number;
  total_pieces: number;
  taux_continuite_pct: number;
} {
  const byJournal = new Map<string, { num: number; raw: string; date: string }[]>();
  for (const p of args.pieces) {
    const num = parseInt(p.numero.replace(/\D/g, ""), 10);
    if (!isNaN(num)) {
      const arr = byJournal.get(p.journal) ?? [];
      arr.push({ num, raw: p.numero, date: p.date });
      byJournal.set(p.journal, arr);
    }
  }

  const ruptures: any[] = [];
  let totalExpected = 0;
  for (const [journal, pieces] of byJournal) {
    pieces.sort((a, b) => a.num - b.num);
    if (pieces.length < 2) { totalExpected += pieces.length; continue; }
    for (let i = 1; i < pieces.length; i++) {
      const delta = pieces[i].num - pieces[i - 1].num;
      if (delta > 1) {
        for (let g = 1; g < delta; g++) {
          ruptures.push({
            journal,
            numero_manquant: String(pieces[i - 1].num + g),
            numero_avant: pieces[i - 1].raw,
            numero_apres: pieces[i].raw,
          });
        }
      }
    }
    totalExpected += pieces[pieces.length - 1].num - pieces[0].num + 1;
  }

  const taux = totalExpected > 0 ? Math.round(((totalExpected - ruptures.length) / totalExpected) * 100) : 100;

  return {
    ok: true,
    ruptures,
    total_journaux: byJournal.size,
    total_pieces: args.pieces.length,
    taux_continuite_pct: taux,
  };
}

// ─── 3. Forecast DSO evolution ──────────────────────────────────────────────
/**
 * Projection DSO sur N mois + detection acceleration / ralentissement.
 */
export function forecastDsoEvolution(args: {
  historique_mensuel: { mois: string; creances_centimes: string | bigint; ca_mensuel_centimes: string | bigint }[];
  horizon_mois?: number;
}): {
  ok: boolean;
  dso_historique: { mois: string; dso_jours: number }[];
  dso_moyen_jours: number;
  tendance: "amelioration" | "stable" | "degradation";
  projection_dso_jours: number;
  alerte: string;
} {
  if (args.historique_mensuel.length === 0) {
    return { ok: false, dso_historique: [], dso_moyen_jours: 0, tendance: "stable", projection_dso_jours: 0, alerte: "Pas d'historique" };
  }

  const dsos = args.historique_mensuel.map(h => {
    const cre = BigInt(h.creances_centimes);
    const ca = BigInt(h.ca_mensuel_centimes);
    const dso = ca > 0n ? Math.round((Number(cre) / Number(ca)) * 30) : 0;
    return { mois: h.mois, dso_jours: dso };
  });

  const moyen = Math.round(dsos.reduce((s, d) => s + d.dso_jours, 0) / dsos.length);

  // Tendance via regression simple sur 3 derniers mois
  let tendance: "amelioration" | "stable" | "degradation" = "stable";
  if (dsos.length >= 3) {
    const last3 = dsos.slice(-3).map(d => d.dso_jours);
    const slope = (last3[2] - last3[0]) / 2;
    tendance = slope > 5 ? "degradation" : slope < -5 ? "amelioration" : "stable";
  }

  // Projection lineaire
  const projection = tendance === "degradation" ? Math.round(moyen * 1.15)
    : tendance === "amelioration" ? Math.round(moyen * 0.9)
    : moyen;

  let alerte = "Situation stable";
  if (projection > 90) alerte = "DSO projete > 90j — relancer + envisager affacturage";
  else if (tendance === "degradation") alerte = "Tendance defavorable — auditer les delais clients";
  else if (tendance === "amelioration") alerte = "Tendance favorable — maintenir la politique recouvrement";

  return {
    ok: true,
    dso_historique: dsos,
    dso_moyen_jours: moyen,
    tendance,
    projection_dso_jours: projection,
    alerte,
  };
}

// ─── 4. Grand livre summary ────────────────────────────────────────────────
export function computeGrandLivreSummary(args: {
  entries: { compte: string; debit_centimes: string | bigint; credit_centimes: string | bigint; date: string }[];
  classes_filter?: string[];
}): {
  ok: boolean;
  total_comptes: number;
  par_compte: { compte: string; nb_mouvements: number; total_debit_centimes: string; total_credit_centimes: string; solde_centimes: string; sens: "debiteur" | "crediteur" | "solde" }[];
  par_classe: Record<string, { nb_comptes: number; total_debit: string; total_credit: string; solde: string }>;
} {
  const map = new Map<string, { nb: number; debit: bigint; credit: bigint }>();
  for (const e of args.entries) {
    const cur = map.get(e.compte) ?? { nb: 0, debit: 0n, credit: 0n };
    cur.nb++;
    cur.debit += BigInt(e.debit_centimes);
    cur.credit += BigInt(e.credit_centimes);
    map.set(e.compte, cur);
  }

  const parCompte = Array.from(map.entries())
    .filter(([c]) => !args.classes_filter || args.classes_filter.includes(c[0]))
    .map(([compte, v]) => {
      const solde = v.debit - v.credit;
      return {
        compte,
        nb_mouvements: v.nb,
        total_debit_centimes: v.debit.toString(),
        total_credit_centimes: v.credit.toString(),
        solde_centimes: solde.toString(),
        sens: solde > 0n ? "debiteur" as const : solde < 0n ? "crediteur" as const : "solde" as const,
      };
    })
    .sort((a, b) => a.compte.localeCompare(b.compte));

  // Aggregation par classe (1er chiffre)
  const parClasse: Record<string, { nb_comptes: number; total_debit: bigint; total_credit: bigint; solde: bigint }> = {};
  for (const p of parCompte) {
    const cls = p.compte[0];
    parClasse[cls] ??= { nb_comptes: 0, total_debit: 0n, total_credit: 0n, solde: 0n };
    parClasse[cls].nb_comptes++;
    parClasse[cls].total_debit += BigInt(p.total_debit_centimes);
    parClasse[cls].total_credit += BigInt(p.total_credit_centimes);
    parClasse[cls].solde += BigInt(p.solde_centimes);
  }
  const parClasseSerialized: any = {};
  for (const [k, v] of Object.entries(parClasse)) {
    parClasseSerialized[k] = {
      nb_comptes: v.nb_comptes,
      total_debit: v.total_debit.toString(),
      total_credit: v.total_credit.toString(),
      solde: v.solde.toString(),
    };
  }

  return {
    ok: true,
    total_comptes: parCompte.length,
    par_compte: parCompte,
    par_classe: parClasseSerialized,
  };
}

// ─── 5. Validate clos exercice ─────────────────────────────────────────────
export interface ClosExerciceCheck {
  ecritures_lettrees_pct?: number;
  provisions_passees?: boolean;
  amortissements_passes?: boolean;
  inventaire_realise?: boolean;
  rapprochement_bancaire_complet?: boolean;
  ecarts_comptes_resolus?: boolean;
  audit_externe_planifie?: boolean;
  declarations_fiscales_a_jour?: boolean;
}

export function validateClosExercice(args: ClosExerciceCheck): {
  ok: boolean;
  pret_a_cloturer: boolean;
  taux_completude_pct: number;
  checks: { item: string; ok: boolean; obligatoire: boolean; detail?: string }[];
  blocages: string[];
  next_actions: string[];
} {
  const checks: any[] = [];
  const blocages: string[] = [];
  const actions: string[] = [];

  const lettrage = args.ecritures_lettrees_pct ?? 0;
  const lettrageOk = lettrage >= 90;
  checks.push({ item: "Lettrage des comptes tiers", ok: lettrageOk, obligatoire: true, detail: `${lettrage}% lettre (cible >= 90%)` });
  if (!lettrageOk) { blocages.push("Lettrage incomplet"); actions.push(`Lettrer les ${100 - lettrage}% restants des comptes tiers`); }

  checks.push({ item: "Provisions passees", ok: !!args.provisions_passees, obligatoire: true });
  if (!args.provisions_passees) { blocages.push("Provisions non passees"); actions.push("Passer provisions creances douteuses, conges, IS"); }

  checks.push({ item: "Amortissements passes", ok: !!args.amortissements_passes, obligatoire: true });
  if (!args.amortissements_passes) actions.push("Calculer et passer les dotations amortissements via compute_immobilisations_amortissements");

  checks.push({ item: "Inventaire physique realise", ok: !!args.inventaire_realise, obligatoire: true });
  if (!args.inventaire_realise) blocages.push("Inventaire absent");

  checks.push({ item: "Rapprochement bancaire complet", ok: !!args.rapprochement_bancaire_complet, obligatoire: true });
  if (!args.rapprochement_bancaire_complet) blocages.push("Rapprochement bancaire incomplet");

  checks.push({ item: "Ecarts comptes resolus", ok: !!args.ecarts_comptes_resolus, obligatoire: true });
  checks.push({ item: "Audit externe planifie", ok: !!args.audit_externe_planifie, obligatoire: false });
  checks.push({ item: "Declarations fiscales a jour", ok: !!args.declarations_fiscales_a_jour, obligatoire: true });

  const obligatoiresOk = checks.filter(c => c.obligatoire && c.ok).length;
  const obligatoires = checks.filter(c => c.obligatoire).length;
  const taux = Math.round((obligatoiresOk / obligatoires) * 100);

  return {
    ok: true,
    pret_a_cloturer: blocages.length === 0,
    taux_completude_pct: taux,
    checks,
    blocages,
    next_actions: actions.length > 0 ? actions : ["Tous les checks essentiels OK. Cloturer."],
  };
}

// ─── 6. Amortissements ─────────────────────────────────────────────────────
/**
 * Calcule les dotations aux amortissements lineaires ou degressifs SYSCOHADA.
 *
 * Lineaire : annuite = valeur_origine / duree
 * Degressif : annuite = valeur_residuelle × (taux_lineaire × coefficient)
 *   coefficients : 1.5 (3-4 ans), 2 (5-6 ans), 2.5 (7+ ans)
 */
export function computeImmobilisationsAmortissements(args: {
  immobilisations: { id: string; libelle: string; valeur_origine_centimes: string | bigint; date_acquisition: string; duree_annees: number; methode?: "lineaire" | "degressif" }[];
  date_calcul: string;
}): {
  ok: boolean;
  total_dotation_annuelle_centimes: string;
  total_dotation_formatted: string;
  detail: { id: string; libelle: string; valeur_residuelle_centimes: string; dotation_annuelle_centimes: string; methode: string; pourcentage_amorti: number }[];
} {
  const dateCalc = new Date(args.date_calcul);
  let total = 0n;
  const detail: any[] = [];

  for (const i of args.immobilisations) {
    const valeur = BigInt(i.valeur_origine_centimes);
    const dateAcq = new Date(i.date_acquisition);
    const anneesEcoulees = (dateCalc.getTime() - dateAcq.getTime()) / (1000 * 60 * 60 * 24 * 365);
    const methode = i.methode ?? "lineaire";

    let dotation: bigint;
    let valeurResiduelle: bigint;

    if (methode === "lineaire") {
      const annuite = valeur / BigInt(i.duree_annees);
      const cumule = annuite * BigInt(Math.min(Math.floor(anneesEcoulees), i.duree_annees));
      valeurResiduelle = valeur - cumule;
      dotation = anneesEcoulees < i.duree_annees ? annuite : 0n;
    } else {
      // Degressif simplifie
      const coeff = i.duree_annees <= 4 ? 1.5 : i.duree_annees <= 6 ? 2 : 2.5;
      const tauxLineaire = 1 / i.duree_annees;
      const tauxDegressif = tauxLineaire * coeff;
      // Calcul iteratif valeur residuelle annee par annee
      let val = valeur;
      let dot = 0n;
      const annees = Math.min(Math.floor(anneesEcoulees) + 1, i.duree_annees);
      for (let an = 0; an < annees; an++) {
        dot = (val * BigInt(Math.round(tauxDegressif * 10000))) / 10000n;
        if (an < annees - 1) val -= dot;
      }
      valeurResiduelle = val - (anneesEcoulees < i.duree_annees ? dot : 0n);
      dotation = anneesEcoulees < i.duree_annees ? dot : 0n;
    }

    const pctAmorti = valeur > 0n ? Math.round((Number(valeur - valeurResiduelle) / Number(valeur)) * 10000) / 100 : 0;

    total += dotation;
    detail.push({
      id: i.id, libelle: i.libelle,
      valeur_residuelle_centimes: valeurResiduelle.toString(),
      dotation_annuelle_centimes: dotation.toString(),
      methode,
      pourcentage_amorti: pctAmorti,
    });
  }

  return {
    ok: true,
    total_dotation_annuelle_centimes: total.toString(),
    total_dotation_formatted: formatMoneyFcfa(total),
    detail,
  };
}

// ─── 7. Detect ecart inventaire ─────────────────────────────────────────────
export function detectEcartInventaire(args: {
  stock_comptable: { reference: string; libelle: string; quantite_comptable: number; pu_centimes: string | bigint }[];
  stock_physique: { reference: string; quantite_physique: number }[];
  seuil_ecart_pct?: number;
}): {
  ok: boolean;
  total_references: number;
  ecarts_detectes: { reference: string; libelle: string; quantite_compta: number; quantite_physique: number; ecart_quantite: number; valeur_ecart_centimes: string; severity: "info" | "warning" | "critical" }[];
  perte_estimee_centimes: string;
  taux_correspondance_pct: number;
} {
  const seuil = args.seuil_ecart_pct ?? 5;
  const physMap = new Map(args.stock_physique.map(p => [p.reference, p.quantite_physique]));

  const ecarts: any[] = [];
  let perte = 0n;
  let exact = 0;

  for (const s of args.stock_comptable) {
    const physique = physMap.get(s.reference) ?? 0;
    const ecart = physique - s.quantite_comptable;
    const ecartPct = s.quantite_comptable > 0 ? Math.abs(ecart / s.quantite_comptable * 100) : (ecart === 0 ? 0 : 100);

    if (ecart === 0) {
      exact++;
      continue;
    }

    const valeurEcart = BigInt(s.pu_centimes) * BigInt(Math.abs(ecart));
    if (ecart < 0) perte += valeurEcart;

    let severity: "info" | "warning" | "critical" = "info";
    if (ecartPct > 20) severity = "critical";
    else if (ecartPct > seuil) severity = "warning";

    ecarts.push({
      reference: s.reference, libelle: s.libelle,
      quantite_compta: s.quantite_comptable,
      quantite_physique: physique,
      ecart_quantite: ecart,
      valeur_ecart_centimes: (ecart < 0 ? -valeurEcart : valeurEcart).toString(),
      severity,
    });
  }

  const taux = args.stock_comptable.length > 0 ? Math.round((exact / args.stock_comptable.length) * 100) : 100;

  return {
    ok: true,
    total_references: args.stock_comptable.length,
    ecarts_detectes: ecarts,
    perte_estimee_centimes: perte.toString(),
    taux_correspondance_pct: taux,
  };
}

// ─── 8. Situation intermediaire ────────────────────────────────────────────
/**
 * Genere une situation comptable intermediaire (proforma) a une date donnee.
 * Utile pour suivi mensuel sans cloturer l'exercice.
 */
export function generateSituationIntermediaire(args: {
  raison_sociale: string;
  date_situation: string;
  entries_jusqu_a_date: { compte: string; debit_centimes: string | bigint; credit_centimes: string | bigint; date: string }[];
}): {
  ok: boolean;
  raison_sociale: string;
  date_situation: string;
  ca_periode_centimes: string;
  charges_periode_centimes: string;
  resultat_periode_centimes: string;
  tresorerie_disponible_centimes: string;
  endettement_total_centimes: string;
  resume: string;
} {
  const dateRef = new Date(args.date_situation);
  const filtered = args.entries_jusqu_a_date.filter(e => new Date(e.date) <= dateRef);

  let ca = 0n, charges = 0n, treso = 0n, dettesTotal = 0n;
  for (const e of filtered) {
    const debit = BigInt(e.debit_centimes);
    const credit = BigInt(e.credit_centimes);
    const compte = e.compte;
    if (compte.startsWith("70") || compte.startsWith("71") || compte.startsWith("75") || compte.startsWith("77")) {
      ca += credit - debit;  // Produits sens credit
    } else if (compte.startsWith("60") || compte.startsWith("61") || compte.startsWith("62") || compte.startsWith("64") || compte.startsWith("66") || compte.startsWith("67") || compte.startsWith("68")) {
      charges += debit - credit;  // Charges sens debit
    } else if (compte.startsWith("521") || compte.startsWith("57")) {
      treso += debit - credit;
    } else if (compte.startsWith("16") || compte.startsWith("17") || compte.startsWith("40") || compte.startsWith("42") || compte.startsWith("43") || compte.startsWith("44")) {
      dettesTotal += credit - debit;
    }
  }

  const resultat = ca - charges;
  const resume = `Au ${args.date_situation} : CA ${formatMoneyFcfa(ca)}, Charges ${formatMoneyFcfa(charges)}, Resultat ${formatMoneyFcfa(resultat)}, Tresorerie ${formatMoneyFcfa(treso)}, Endettement ${formatMoneyFcfa(dettesTotal)}.`;

  return {
    ok: true,
    raison_sociale: args.raison_sociale,
    date_situation: args.date_situation,
    ca_periode_centimes: ca.toString(),
    charges_periode_centimes: charges.toString(),
    resultat_periode_centimes: resultat.toString(),
    tresorerie_disponible_centimes: treso.toString(),
    endettement_total_centimes: dettesTotal.toString(),
    resume,
  };
}
