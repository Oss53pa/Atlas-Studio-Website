// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — Domain L2 : COMMERCIAL / CRM / Ventes
// ═══════════════════════════════════════════════════════════════════════════
// 5 tools metier :
//   1. score_lead              : scoring lead BANT (budget/authority/need/timeline)
//   2. compute_commission      : commission commerciale selon paliers
//   3. forecast_pipeline       : prevision CA pipeline (probabilite × montant)
//   4. score_churn_risk        : risque churn d'un client (heuristique)
//   5. analyze_customer_segment : segmentation RFM (Recence/Frequence/Montant)
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

// ─── 1. Score lead BANT ─────────────────────────────────────────────────────
/**
 * Score lead BANT (Budget, Authority, Need, Timeline) sur 100.
 *   - Budget confirme : 30 pts
 *   - Decideur identifie : 25 pts
 *   - Besoin clairement exprime : 25 pts
 *   - Timeline < 3 mois : 20 pts
 *
 * Bonus : industrie strategique +10, taille entreprise +10.
 */
export function scoreLead(args: {
  budget_confirme: boolean;
  budget_centimes?: string | bigint;
  decideur_identifie: boolean;
  besoin_exprime: "vague" | "qualifie" | "urgent";
  timeline_mois?: number;             // delai jusqu'achat estime
  industrie_strategique?: boolean;
  taille_entreprise?: "TPE" | "PME" | "ETI" | "GE";
}): {
  ok: boolean;
  score: number;
  classement: "hot" | "warm" | "cold" | "disqualifie";
  detail: { critere: string; points: number; max: number }[];
  recommendation: string;
} {
  const detail: { critere: string; points: number; max: number }[] = [];
  let score = 0;

  // Budget
  const ptsBudget = args.budget_confirme ? 30 : 0;
  detail.push({ critere: "Budget confirme", points: ptsBudget, max: 30 });
  score += ptsBudget;

  // Authority
  const ptsAuth = args.decideur_identifie ? 25 : 0;
  detail.push({ critere: "Decideur identifie", points: ptsAuth, max: 25 });
  score += ptsAuth;

  // Need
  const ptsNeed = args.besoin_exprime === "urgent" ? 25 : args.besoin_exprime === "qualifie" ? 15 : 5;
  detail.push({ critere: `Besoin (${args.besoin_exprime})`, points: ptsNeed, max: 25 });
  score += ptsNeed;

  // Timeline
  let ptsTime = 0;
  if (args.timeline_mois !== undefined) {
    ptsTime = args.timeline_mois <= 1 ? 20 : args.timeline_mois <= 3 ? 15 : args.timeline_mois <= 6 ? 10 : 5;
  }
  detail.push({ critere: `Timeline (${args.timeline_mois ?? "n/a"} mois)`, points: ptsTime, max: 20 });
  score += ptsTime;

  // Bonus
  let ptsBonus = 0;
  if (args.industrie_strategique) ptsBonus += 5;
  if (args.taille_entreprise === "GE" || args.taille_entreprise === "ETI") ptsBonus += 5;
  detail.push({ critere: "Bonus industrie/taille", points: ptsBonus, max: 10 });
  score += ptsBonus;

  score = Math.min(100, score);
  const classement: "hot" | "warm" | "cold" | "disqualifie" =
    score >= 75 ? "hot" : score >= 50 ? "warm" : score >= 30 ? "cold" : "disqualifie";

  const reco =
    classement === "hot" ? "Priorite max. Demo personnalisee + proposition rapide."
    : classement === "warm" ? "A nourrir : sequence email + appel decouverte cette semaine."
    : classement === "cold" ? "Ajouter a sequence longue (newsletter, contenus, retargeting)."
    : "Ne pas investir de temps commercial. Garder en base passive.";

  return { ok: true, score, classement, detail, recommendation: reco };
}

// ─── 2. Commission commerciale ──────────────────────────────────────────────
/**
 * Calcule la commission selon paliers progressifs (ex : 5% jusqu'a quota,
 * 10% au-dela). Mode bonus : multiplicateur si quota atteint a X%.
 */
export function computeCommission(args: {
  ca_realise_centimes: string | bigint;
  quota_centimes: string | bigint;
  paliers: { taux: number; jusqua_centimes: string | bigint | "infini" }[];
  bonus_quota_pct?: number;              // bonus si quota atteint
  bonus_overperformance_seuil_pct?: number;  // ex 120 pour bonus si > 120% quota
  bonus_overperformance_pct?: number;
}): {
  ok: boolean;
  ca_realise_centimes: string;
  quota_centimes: string;
  taux_atteinte_quota_pct: number;
  commission_base_centimes: string;
  bonus_centimes: string;
  commission_totale_centimes: string;
  commission_formatted: string;
  detail_paliers: { palier: string; ca_dans_palier_centimes: string; taux: number; commission_centimes: string }[];
} {
  const ca = BigInt(args.ca_realise_centimes);
  const quota = BigInt(args.quota_centimes);
  const tauxAtteinte = quota > 0n ? Number(ca) / Number(quota) * 100 : 0;

  let commissionBase = 0n;
  let prevLimite = 0n;
  const detail: any[] = [];

  for (const p of args.paliers) {
    const limite = p.jusqua_centimes === "infini" ? ca : BigInt(p.jusqua_centimes);
    if (ca <= prevLimite) break;
    const dansLePalier = (ca < limite ? ca : limite) - prevLimite;
    if (dansLePalier <= 0n) continue;
    const tauxBp = BigInt(Math.round(p.taux * 10000));
    const commPalier = (dansLePalier * tauxBp) / 10000n;
    commissionBase += commPalier;
    detail.push({
      palier: `${prevLimite.toString()} - ${p.jusqua_centimes === "infini" ? "+inf" : limite.toString()}`,
      ca_dans_palier_centimes: dansLePalier.toString(),
      taux: p.taux,
      commission_centimes: commPalier.toString(),
    });
    prevLimite = limite;
    if (ca <= limite) break;
  }

  // Bonus
  let bonus = 0n;
  if (tauxAtteinte >= 100 && args.bonus_quota_pct) {
    const bonusBp = BigInt(Math.round(args.bonus_quota_pct * 100));
    bonus += (commissionBase * bonusBp) / 10000n;
  }
  if (args.bonus_overperformance_seuil_pct
      && tauxAtteinte >= args.bonus_overperformance_seuil_pct
      && args.bonus_overperformance_pct) {
    const bonusBp = BigInt(Math.round(args.bonus_overperformance_pct * 100));
    bonus += (commissionBase * bonusBp) / 10000n;
  }

  const total = commissionBase + bonus;

  return {
    ok: true,
    ca_realise_centimes: ca.toString(),
    quota_centimes: quota.toString(),
    taux_atteinte_quota_pct: Math.round(tauxAtteinte * 100) / 100,
    commission_base_centimes: commissionBase.toString(),
    bonus_centimes: bonus.toString(),
    commission_totale_centimes: total.toString(),
    commission_formatted: formatMoneyFcfa(total),
    detail_paliers: detail,
  };
}

// ─── 3. Forecast pipeline (prevision CA) ───────────────────────────────────
/**
 * Calcule la prevision pondéree d'un pipeline commercial :
 *   - Pour chaque opportunite : montant × probabilite (selon stage)
 *   - Mapping standard stages -> probabilites (configurable).
 */
const STAGE_PROBABILITIES: Record<string, number> = {
  prospect: 0.05,
  qualifie: 0.15,
  decouverte: 0.30,
  proposition: 0.50,
  negociation: 0.70,
  closed_won: 1.0,
  closed_lost: 0,
};

export function forecastPipeline(args: {
  opportunites: { id: string; montant_centimes: string | bigint; stage: string; date_close_prevue?: string; probabilite_custom?: number }[];
  periode_mois?: number;
  stages_overrides?: Record<string, number>;
}): {
  ok: boolean;
  total_pipeline_centimes: string;
  total_pondere_centimes: string;
  total_pondere_formatted: string;
  par_stage: Record<string, { count: number; total_centimes: string; pondere_centimes: string }>;
  par_mois?: Record<string, { count: number; pondere_centimes: string }>;
} {
  const stages = { ...STAGE_PROBABILITIES, ...(args.stages_overrides ?? {}) };
  let totalPipeline = 0n;
  let totalPondere = 0n;
  const parStage: Record<string, { count: number; total_centimes: bigint; pondere_centimes: bigint }> = {};
  const parMois: Record<string, { count: number; pondere_centimes: bigint }> = {};

  for (const o of args.opportunites) {
    const m = BigInt(o.montant_centimes);
    const proba = o.probabilite_custom ?? stages[o.stage] ?? 0;
    const pondere = (m * BigInt(Math.round(proba * 10000))) / 10000n;
    totalPipeline += m;
    totalPondere += pondere;

    parStage[o.stage] ??= { count: 0, total_centimes: 0n, pondere_centimes: 0n };
    parStage[o.stage].count++;
    parStage[o.stage].total_centimes += m;
    parStage[o.stage].pondere_centimes += pondere;

    if (o.date_close_prevue) {
      const moisKey = o.date_close_prevue.slice(0, 7);
      parMois[moisKey] ??= { count: 0, pondere_centimes: 0n };
      parMois[moisKey].count++;
      parMois[moisKey].pondere_centimes += pondere;
    }
  }

  return {
    ok: true,
    total_pipeline_centimes: totalPipeline.toString(),
    total_pondere_centimes: totalPondere.toString(),
    total_pondere_formatted: formatMoneyFcfa(totalPondere),
    par_stage: Object.fromEntries(
      Object.entries(parStage).map(([k, v]) => [k, {
        count: v.count,
        total_centimes: v.total_centimes.toString(),
        pondere_centimes: v.pondere_centimes.toString(),
      }])
    ),
    par_mois: Object.keys(parMois).length > 0 ? Object.fromEntries(
      Object.entries(parMois).map(([k, v]) => [k, { count: v.count, pondere_centimes: v.pondere_centimes.toString() }])
    ) : undefined,
  };
}

// ─── 4. Risque churn ────────────────────────────────────────────────────────
/**
 * Score le risque de churn (resiliation) d'un client sur 100.
 * Heuristiques :
 *   - Recence achat > 12 mois : +30 pts
 *   - Frequence diminuee > 50% : +25 pts
 *   - Tickets supports critiques non resolus : +20 pts
 *   - Renouvellement contrat dans <30 jours sans rdv : +25 pts
 */
export function scoreChurnRisk(args: {
  derniere_commande_jours: number;
  frequence_actuelle: number;            // commandes / mois
  frequence_baseline: number;             // commandes / mois historique
  tickets_critiques_ouverts?: number;
  jours_avant_renouvellement?: number;
  rdv_planifie?: boolean;
}): {
  ok: boolean;
  score_risque: number;       // 0-100, 100 = risque max
  niveau: "faible" | "moyen" | "eleve" | "critique";
  facteurs: { facteur: string; points: number; raison: string }[];
  actions_recommandees: string[];
} {
  const facteurs: { facteur: string; points: number; raison: string }[] = [];
  const actions: string[] = [];

  if (args.derniere_commande_jours > 365) {
    facteurs.push({ facteur: "Inactivite", points: 30, raison: `${args.derniere_commande_jours}j sans commande` });
  } else if (args.derniere_commande_jours > 180) {
    facteurs.push({ facteur: "Inactivite", points: 20, raison: `${args.derniere_commande_jours}j sans commande` });
  } else if (args.derniere_commande_jours > 90) {
    facteurs.push({ facteur: "Inactivite", points: 10, raison: `${args.derniere_commande_jours}j sans commande` });
  }

  if (args.frequence_baseline > 0) {
    const ratio = args.frequence_actuelle / args.frequence_baseline;
    if (ratio < 0.3) {
      facteurs.push({ facteur: "Baisse activite", points: 25, raison: `Frequence -${((1 - ratio) * 100).toFixed(0)}% vs baseline` });
      actions.push("Appel decouverte urgent : comprendre la cause de la baisse d'activite");
    } else if (ratio < 0.5) {
      facteurs.push({ facteur: "Baisse activite", points: 15, raison: `Frequence -${((1 - ratio) * 100).toFixed(0)}%` });
      actions.push("Email checkpoint + verifier satisfaction");
    }
  }

  if ((args.tickets_critiques_ouverts ?? 0) > 0) {
    const pts = Math.min(20, args.tickets_critiques_ouverts! * 10);
    facteurs.push({ facteur: "Tickets critiques", points: pts, raison: `${args.tickets_critiques_ouverts} ticket(s) critique(s) non resolu(s)` });
    actions.push("Escalader les tickets critiques au support N2 immediatement");
  }

  if (args.jours_avant_renouvellement !== undefined && args.jours_avant_renouvellement < 30 && !args.rdv_planifie) {
    facteurs.push({ facteur: "Renouvellement imminent sans RDV", points: 25, raison: `Contrat se termine dans ${args.jours_avant_renouvellement}j, aucun RDV` });
    actions.push("Planifier un RDV de renouvellement IMMEDIATEMENT");
  }

  const score = Math.min(100, facteurs.reduce((s, f) => s + f.points, 0));
  const niveau: "faible" | "moyen" | "eleve" | "critique" =
    score < 25 ? "faible" : score < 50 ? "moyen" : score < 75 ? "eleve" : "critique";

  if (niveau === "critique" || niveau === "eleve") {
    actions.unshift("Customer Success Manager doit prendre contact sous 48h");
  }
  if (actions.length === 0) actions.push("Pas d'action specifique. Maintenir relation classique.");

  return { ok: true, score_risque: score, niveau, facteurs, actions_recommandees: actions };
}

// ─── 5. Segmentation RFM ────────────────────────────────────────────────────
/**
 * Segmentation RFM (Recence, Frequence, Montant) :
 *   - R : recence du dernier achat (jours)
 *   - F : nombre d'achats sur la periode
 *   - M : montant total achete sur la periode
 *
 * Chaque dimension est notee 1-5 (5 = meilleur). Combinaison RFM identifie :
 *   555 : champions
 *   5x5 : loyaux
 *   55x : recents
 *   1xx : a risque churn
 *   x1x : a re-engager
 */
export function analyzeCustomerSegment(args: {
  clients: { id: string; recence_jours: number; frequence: number; montant_total_centimes: string | bigint }[];
  periode_jours?: number;       // periode d'analyse, defaut 365
}): {
  ok: boolean;
  total_clients: number;
  segments: Record<string, { count: number; client_ids: string[]; description: string }>;
  scores_par_client: { id: string; r: number; f: number; m: number; rfm: string; segment: string }[];
} {
  if (args.clients.length === 0) {
    return { ok: false, total_clients: 0, segments: {}, scores_par_client: [] };
  }

  // Calcul des quintiles pour R, F, M
  const recences = args.clients.map(c => c.recence_jours).sort((a, b) => a - b);
  const frequences = args.clients.map(c => c.frequence).sort((a, b) => a - b);
  const montants = args.clients.map(c => BigInt(c.montant_total_centimes)).sort((a, b) => a < b ? -1 : 1);

  const quintile = (sorted: number[] | bigint[], val: number | bigint, reverse = false): number => {
    const n = sorted.length;
    let pos = 0;
    for (let i = 0; i < n; i++) {
      if ((sorted[i] as any) <= (val as any)) pos = i;
      else break;
    }
    const q = Math.ceil(((pos + 1) / n) * 5);
    return reverse ? 6 - q : q;  // R inverse : recent = 5
  };

  const scores: any[] = [];
  const segments: Record<string, { count: number; client_ids: string[]; description: string }> = {};

  for (const c of args.clients) {
    const r = quintile(recences, c.recence_jours, true);
    const f = quintile(frequences, c.frequence);
    const m = quintile(montants as any, BigInt(c.montant_total_centimes));
    const rfm = `${r}${f}${m}`;

    let segName: string;
    let segDesc: string;
    if (r >= 4 && f >= 4 && m >= 4) { segName = "champions"; segDesc = "Meilleurs clients : recents, frequents, gros panier"; }
    else if (r >= 3 && f >= 4) { segName = "loyaux"; segDesc = "Clients fideles : achats reguliers"; }
    else if (r >= 4 && f <= 2) { segName = "nouveaux"; segDesc = "Clients recents a fideliser"; }
    else if (r <= 2 && f >= 3) { segName = "a_risque"; segDesc = "Clients fideles qui n'achetent plus — risque churn"; }
    else if (r <= 2 && m >= 4) { segName = "a_recuperer"; segDesc = "Anciens gros clients endormis — campagne de reactivation"; }
    else if (f === 1 && r <= 2) { segName = "perdus"; segDesc = "Clients perdus probables"; }
    else { segName = "moyens"; segDesc = "Clients moyens — potentiel de croissance"; }

    scores.push({ id: c.id, r, f, m, rfm, segment: segName });

    segments[segName] ??= { count: 0, client_ids: [], description: segDesc };
    segments[segName].count++;
    segments[segName].client_ids.push(c.id);
  }

  return {
    ok: true,
    total_clients: args.clients.length,
    segments,
    scores_par_client: scores,
  };
}
