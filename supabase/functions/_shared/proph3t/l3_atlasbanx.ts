// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 : ATLASBANX (Banking)
// 5 tools : echeancier credit, scoring credit, virement multiple, reconcile interbank, alertes prudentielles
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

export function computeEcheancierCredit(args: {
  capital_centimes: string | bigint;
  taux_annuel_pct: number;
  duree_mois: number;
  type: "amortissement_constant" | "annuites_constantes" | "in_fine";
}): {
  ok: boolean;
  echeancier: { mois: number; capital_du_centimes: string; interets_centimes: string; principal_centimes: string; mensualite_centimes: string; capital_restant_centimes: string }[];
  total_interets_centimes: string;
  cout_total_credit_centimes: string;
  mensualite_si_constante_centimes?: string;
} {
  const cap = BigInt(args.capital_centimes);
  const tauxMensuel = args.taux_annuel_pct / 12 / 100;
  const echeancier: any[] = [];
  let restant = cap;
  let totalInterets = 0n;

  if (args.type === "annuites_constantes") {
    const r = tauxMensuel;
    const n = args.duree_mois;
    const mens = r > 0 ? Math.round(Number(cap) * r / (1 - Math.pow(1 + r, -n))) : Math.round(Number(cap) / n);
    const mensBn = BigInt(mens);
    for (let m = 1; m <= n; m++) {
      const interets = (restant * BigInt(Math.round(tauxMensuel * 1_000_000))) / 1_000_000n;
      const principal = mensBn - interets;
      restant -= principal;
      totalInterets += interets;
      echeancier.push({
        mois: m, capital_du_centimes: (restant + principal).toString(),
        interets_centimes: interets.toString(),
        principal_centimes: principal.toString(),
        mensualite_centimes: mensBn.toString(),
        capital_restant_centimes: (restant > 0n ? restant : 0n).toString(),
      });
    }
    return { ok: true, echeancier, total_interets_centimes: totalInterets.toString(), cout_total_credit_centimes: (cap + totalInterets).toString(), mensualite_si_constante_centimes: mensBn.toString() };
  } else if (args.type === "amortissement_constant") {
    const principal = cap / BigInt(args.duree_mois);
    for (let m = 1; m <= args.duree_mois; m++) {
      const interets = (restant * BigInt(Math.round(tauxMensuel * 1_000_000))) / 1_000_000n;
      restant -= principal;
      totalInterets += interets;
      echeancier.push({
        mois: m, capital_du_centimes: (restant + principal).toString(),
        interets_centimes: interets.toString(),
        principal_centimes: principal.toString(),
        mensualite_centimes: (principal + interets).toString(),
        capital_restant_centimes: (restant > 0n ? restant : 0n).toString(),
      });
    }
  } else {
    // in_fine : pas de remboursement avant la fin
    for (let m = 1; m < args.duree_mois; m++) {
      const interets = (cap * BigInt(Math.round(tauxMensuel * 1_000_000))) / 1_000_000n;
      totalInterets += interets;
      echeancier.push({
        mois: m, capital_du_centimes: cap.toString(), interets_centimes: interets.toString(),
        principal_centimes: "0", mensualite_centimes: interets.toString(), capital_restant_centimes: cap.toString(),
      });
    }
    const interetsFin = (cap * BigInt(Math.round(tauxMensuel * 1_000_000))) / 1_000_000n;
    totalInterets += interetsFin;
    echeancier.push({ mois: args.duree_mois, capital_du_centimes: cap.toString(), interets_centimes: interetsFin.toString(), principal_centimes: cap.toString(), mensualite_centimes: (cap + interetsFin).toString(), capital_restant_centimes: "0" });
  }

  return { ok: true, echeancier, total_interets_centimes: totalInterets.toString(), cout_total_credit_centimes: (cap + totalInterets).toString() };
}

export function scoreCreditDemande(args: {
  revenus_mensuels_centimes: string | bigint;
  charges_fixes_centimes: string | bigint;
  apport_centimes: string | bigint;
  montant_credit_centimes: string | bigint;
  duree_mois: number;
  taux_annuel_pct: number;
  garanties: ("hypotheque" | "caution" | "nantissement" | "aucune")[];
  historique_bancaire_score?: 1 | 2 | 3 | 4 | 5;
}): { ok: boolean; score: number; verdict: "accord" | "etude_complementaire" | "refus"; taux_endettement_pct: number; ratio_apport_pct: number; recommendations: string[] } {
  const rev = Number(BigInt(args.revenus_mensuels_centimes));
  const charges = Number(BigInt(args.charges_fixes_centimes));
  const apport = Number(BigInt(args.apport_centimes));
  const credit = Number(BigInt(args.montant_credit_centimes));
  const tauxMensuel = args.taux_annuel_pct / 12 / 100;
  const mensualite = tauxMensuel > 0 ? credit * tauxMensuel / (1 - Math.pow(1 + tauxMensuel, -args.duree_mois)) : credit / args.duree_mois;
  const tauxEndettement = rev > 0 ? ((charges + mensualite) / rev) * 100 : 100;
  const ratioApport = (apport / (apport + credit)) * 100;

  let score = 0;
  if (tauxEndettement < 33) score += 30; else if (tauxEndettement < 40) score += 15; else score -= 20;
  if (ratioApport >= 30) score += 25; else if (ratioApport >= 20) score += 15; else if (ratioApport >= 10) score += 5;
  if (args.garanties.includes("hypotheque")) score += 20;
  else if (args.garanties.includes("caution")) score += 12;
  else if (args.garanties.includes("nantissement")) score += 10;
  else score -= 10;
  if (args.historique_bancaire_score) score += args.historique_bancaire_score * 5;

  const verdict: "accord" | "etude_complementaire" | "refus" =
    score >= 70 ? "accord" : score >= 40 ? "etude_complementaire" : "refus";
  const recos: string[] = [];
  if (tauxEndettement >= 33) recos.push(`Taux endettement ${tauxEndettement.toFixed(1)}% > 33% — augmenter apport ou allonger duree`);
  if (ratioApport < 20) recos.push("Apport < 20% — exiger garantie hypothecaire");
  if (verdict === "refus") recos.push("Refuser ou demander co-emprunteur solvable");

  return { ok: true, score: Math.max(0, score), verdict, taux_endettement_pct: Math.round(tauxEndettement * 100) / 100, ratio_apport_pct: Math.round(ratioApport * 100) / 100, recommendations: recos };
}

export function executeBatchVirements(args: {
  virements: { id: string; iban_destinataire: string; nom_destinataire: string; montant_centimes: string | bigint; libelle: string }[];
  compte_emetteur_solde_centimes: string | bigint;
  limite_journaliere_centimes?: string | bigint;
}): {
  ok: boolean;
  virements_valides: string[];
  virements_rejetes: { id: string; raison: string }[];
  total_debite_centimes: string;
  solde_apres_centimes: string;
  cumul_journalier_atteint: boolean;
} {
  let solde = BigInt(args.compte_emetteur_solde_centimes);
  const limite = args.limite_journaliere_centimes ? BigInt(args.limite_journaliere_centimes) : null;
  let cumul = 0n;
  const valides: string[] = [];
  const rejetes: any[] = [];
  let limiteAtteinte = false;

  for (const v of args.virements) {
    const m = BigInt(v.montant_centimes);
    if (!/^[A-Z]{2}\d{2}[\sA-Z0-9]{15,30}$/.test(v.iban_destinataire.replace(/\s/g, ""))) {
      rejetes.push({ id: v.id, raison: "IBAN invalide" }); continue;
    }
    if (m > solde) { rejetes.push({ id: v.id, raison: "Solde insuffisant" }); continue; }
    if (limite && cumul + m > limite) { rejetes.push({ id: v.id, raison: "Limite journaliere atteinte" }); limiteAtteinte = true; continue; }
    solde -= m; cumul += m; valides.push(v.id);
  }
  return {
    ok: true,
    virements_valides: valides,
    virements_rejetes: rejetes,
    total_debite_centimes: cumul.toString(),
    solde_apres_centimes: solde.toString(),
    cumul_journalier_atteint: limiteAtteinte,
  };
}

export function reconcileInterbank(args: {
  envois: { id: string; date: string; montant_centimes: string | bigint; reference: string; banque_distante: string }[];
  reception_distante: { id: string; date: string; montant_centimes: string | bigint; reference: string }[];
  tolerance_jours?: number;
}): { ok: boolean; matched: { envoi_id: string; reception_id: string }[]; envois_non_matches: string[]; receptions_non_matchees: string[] } {
  const tol = args.tolerance_jours ?? 2;
  const matched: any[] = [];
  const seenR = new Set<string>();
  const seenE = new Set<string>();
  for (const e of args.envois) {
    const r = args.reception_distante.find(rc =>
      !seenR.has(rc.id) && rc.reference === e.reference &&
      BigInt(rc.montant_centimes) === BigInt(e.montant_centimes) &&
      Math.abs(new Date(rc.date).getTime() - new Date(e.date).getTime()) / 86400000 <= tol,
    );
    if (r) { matched.push({ envoi_id: e.id, reception_id: r.id }); seenE.add(e.id); seenR.add(r.id); }
  }
  return {
    ok: true, matched,
    envois_non_matches: args.envois.filter(e => !seenE.has(e.id)).map(e => e.id),
    receptions_non_matchees: args.reception_distante.filter(r => !seenR.has(r.id)).map(r => r.id),
  };
}

export function alertesPrudentielles(args: {
  fonds_propres_centimes: string | bigint;
  total_engagements_centimes: string | bigint;
  ratio_solvabilite_minimum?: number;
  liquidite_court_terme_centimes?: string | bigint;
  exigibilites_court_terme_centimes?: string | bigint;
}): { ok: boolean; alertes: { code: string; severity: "info" | "warning" | "critical"; metric: string; valeur: number; seuil: number; message: string }[]; conformite_globale: boolean } {
  const fp = BigInt(args.fonds_propres_centimes);
  const eng = BigInt(args.total_engagements_centimes);
  const ratioMin = args.ratio_solvabilite_minimum ?? 9;
  const ratioSolv = eng > 0n ? (Number(fp) / Number(eng)) * 100 : 100;
  const alertes: any[] = [];
  if (ratioSolv < ratioMin) alertes.push({ code: "SOLVABILITE", severity: "critical", metric: "Ratio solvabilite (Bale)", valeur: Math.round(ratioSolv * 100) / 100, seuil: ratioMin, message: "Sous le seuil prudentiel — recapitaliser ou reduire engagements" });
  if (args.liquidite_court_terme_centimes && args.exigibilites_court_terme_centimes) {
    const liq = Number(BigInt(args.liquidite_court_terme_centimes));
    const exi = Number(BigInt(args.exigibilites_court_terme_centimes));
    const lcr = exi > 0 ? (liq / exi) * 100 : 100;
    if (lcr < 100) alertes.push({ code: "LIQUIDITE", severity: lcr < 80 ? "critical" : "warning", metric: "LCR", valeur: Math.round(lcr * 100) / 100, seuil: 100, message: "Sous-liquidite court terme" });
  }
  return { ok: true, alertes, conformite_globale: alertes.filter(a => a.severity === "critical").length === 0 };
}
