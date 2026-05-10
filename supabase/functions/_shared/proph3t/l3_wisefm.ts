// L3 : WISEFM (Facility management)
import { formatMoneyFcfa } from "./calculators.ts";

export function computeMaintenanceBudget(args: {
  surface_totale_m2: number;
  type_batiment: "bureau" | "industriel" | "commercial" | "residentiel";
  age_batiment_annees: number;
  niveau_finition: "basique" | "standard" | "haut_de_gamme";
}): { ok: boolean; budget_annuel_centimes: string; budget_formatted: string; budget_m2_centimes: string; repartition: { categorie: string; pct: number; montant_centimes: string }[] } {
  // Cout maintenance/m2/an FCFA selon type & finition
  const baseM2: Record<string, number> = { bureau: 8000, industriel: 5000, commercial: 12000, residentiel: 6000 };
  const finitionMult: Record<string, number> = { basique: 0.7, standard: 1, haut_de_gamme: 1.6 };
  const ageMult = 1 + Math.max(0, (args.age_batiment_annees - 5) * 0.03);
  const m2 = (baseM2[args.type_batiment] ?? 7000) * (finitionMult[args.niveau_finition] ?? 1) * ageMult;
  const total = BigInt(Math.round(m2 * args.surface_totale_m2 * 100));
  const repartition = [
    { categorie: "Maintenance preventive", pct: 30 },
    { categorie: "Maintenance corrective", pct: 25 },
    { categorie: "Energie & fluides", pct: 20 },
    { categorie: "Securite & surveillance", pct: 15 },
    { categorie: "Nettoyage & dechets", pct: 10 },
  ].map(r => ({ ...r, montant_centimes: ((total * BigInt(r.pct)) / 100n).toString() }));
  return { ok: true, budget_annuel_centimes: total.toString(), budget_formatted: formatMoneyFcfa(total), budget_m2_centimes: BigInt(Math.round(m2 * 100)).toString(), repartition };
}

export function planContratsMaintenance(args: {
  equipements: { id: string; type: "ascenseur" | "climatisation" | "incendie" | "electricite" | "plomberie"; date_derniere_revision: string; periodicite_mois: number; criticite: "haute" | "moyenne" | "basse" }[];
  date_calcul?: string;
}): { ok: boolean; revisions_a_planifier: { id: string; type: string; jours_avant_revision: number; statut: "ok" | "imminent" | "depasse" }[]; en_retard_critique: number } {
  const now = args.date_calcul ? new Date(args.date_calcul) : new Date();
  const revisions: any[] = [];
  let critique = 0;
  for (const e of args.equipements) {
    const derniere = new Date(e.date_derniere_revision);
    const prochaine = new Date(derniere);
    prochaine.setMonth(prochaine.getMonth() + e.periodicite_mois);
    const jours = Math.ceil((prochaine.getTime() - now.getTime()) / 86400000);
    let statut: "ok" | "imminent" | "depasse" = jours < 0 ? "depasse" : jours < 30 ? "imminent" : "ok";
    if (statut === "depasse" && e.criticite === "haute") critique++;
    revisions.push({ id: e.id, type: e.type, jours_avant_revision: jours, statut });
  }
  revisions.sort((a, b) => a.jours_avant_revision - b.jours_avant_revision);
  return { ok: true, revisions_a_planifier: revisions, en_retard_critique: critique };
}

export function analyzeConsommationEnergie(args: {
  consommations_mensuelles: { mois: string; kwh: number; cout_centimes: string | bigint }[];
  surface_totale_m2: number;
  benchmark_kwh_m2_annuel?: number;
}): { ok: boolean; conso_totale_kwh: number; conso_par_m2_kwh: number; cout_total_centimes: string; ecart_benchmark_pct: number; alertes: string[]; recommendations: string[] } {
  const totalKwh = args.consommations_mensuelles.reduce((s, c) => s + c.kwh, 0);
  const totalCout = args.consommations_mensuelles.reduce((s, c) => s + BigInt(c.cout_centimes), 0n);
  const parM2 = args.surface_totale_m2 > 0 ? totalKwh / args.surface_totale_m2 : 0;
  const benchmark = args.benchmark_kwh_m2_annuel ?? 200;
  const annualise = parM2 * (12 / Math.max(1, args.consommations_mensuelles.length));
  const ecart = ((annualise / benchmark) - 1) * 100;
  const alertes: string[] = [];
  if (ecart > 30) alertes.push(`Surconsommation +${ecart.toFixed(0)}% vs benchmark — audit energetique`);
  // Pic de conso
  const max = Math.max(...args.consommations_mensuelles.map(c => c.kwh));
  const moy = totalKwh / args.consommations_mensuelles.length;
  if (max > moy * 1.5) alertes.push("Pic de consommation > 1.5x moyenne — verifier equipements");
  const recos: string[] = [];
  if (ecart > 20) recos.push("Lancer un audit energetique ISO 50001");
  if (ecart > 10) recos.push("Programmer extinction nocturne / WE des equipements non critiques");
  return { ok: true, conso_totale_kwh: totalKwh, conso_par_m2_kwh: Math.round(parM2 * 100) / 100, cout_total_centimes: totalCout.toString(), ecart_benchmark_pct: Math.round(ecart * 100) / 100, alertes, recommendations: recos };
}

export function trackTicketsFM(args: {
  tickets: { id: string; categorie: "panne" | "demande" | "amelioration"; criticite: "P1" | "P2" | "P3"; date_ouverture: string; date_resolution?: string; cout_intervention_centimes?: string | bigint }[];
}): { ok: boolean; total_tickets: number; tickets_ouverts: number; tickets_resolus: number; mttr_jours_par_criticite: Record<string, number>; cout_total_interventions_centimes: string } {
  const ouverts = args.tickets.filter(t => !t.date_resolution).length;
  const resolus = args.tickets.filter(t => t.date_resolution).length;
  const mttr: Record<string, { count: number; total_jours: number }> = {};
  let coutTotal = 0n;
  for (const t of args.tickets) {
    if (t.cout_intervention_centimes) coutTotal += BigInt(t.cout_intervention_centimes);
    if (t.date_resolution) {
      const jours = (new Date(t.date_resolution).getTime() - new Date(t.date_ouverture).getTime()) / 86400000;
      mttr[t.criticite] ??= { count: 0, total_jours: 0 };
      mttr[t.criticite].count++;
      mttr[t.criticite].total_jours += jours;
    }
  }
  const mttrFinal: Record<string, number> = {};
  for (const [k, v] of Object.entries(mttr)) mttrFinal[k] = Math.round((v.total_jours / v.count) * 10) / 10;
  return { ok: true, total_tickets: args.tickets.length, tickets_ouverts: ouverts, tickets_resolus: resolus, mttr_jours_par_criticite: mttrFinal, cout_total_interventions_centimes: coutTotal.toString() };
}

export function computeContratsRenewalForecast(args: {
  contrats: { id: string; prestataire: string; type: string; date_fin: string; montant_annuel_centimes: string | bigint; performance_score?: 1 | 2 | 3 | 4 | 5 }[];
  date_horizon?: string;
}): { ok: boolean; contrats_a_renouveler: { id: string; prestataire: string; jours_avant_fin: number; recommendation: "renouveler" | "renegocier" | "remplacer" }[]; total_engagements_renouveler_centimes: string } {
  const horizon = args.date_horizon ? new Date(args.date_horizon) : new Date(Date.now() + 90 * 86400000);
  const now = new Date();
  const contrats: any[] = [];
  let total = 0n;
  for (const c of args.contrats) {
    const fin = new Date(c.date_fin);
    if (fin > horizon) continue;
    const jours = Math.ceil((fin.getTime() - now.getTime()) / 86400000);
    const score = c.performance_score ?? 3;
    let reco: "renouveler" | "renegocier" | "remplacer";
    if (score >= 4) reco = "renouveler";
    else if (score === 3) reco = "renegocier";
    else reco = "remplacer";
    contrats.push({ id: c.id, prestataire: c.prestataire, jours_avant_fin: jours, recommendation: reco });
    total += BigInt(c.montant_annuel_centimes);
  }
  return { ok: true, contrats_a_renouveler: contrats, total_engagements_renouveler_centimes: total.toString() };
}
