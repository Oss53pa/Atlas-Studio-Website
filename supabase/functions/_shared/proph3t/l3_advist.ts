// ═══════════════════════════════════════════════════════════════════════════
// Proph3t — L3 : ADVIST (Advisory / Conseil)
// 5 tools : honoraires, scope mission, rapport conseil, scoring complexite, planning
// ═══════════════════════════════════════════════════════════════════════════

import { formatMoneyFcfa } from "./calculators.ts";

export function computeHonorairesConseil(args: {
  duree_jours: number;
  taux_journalier_centimes: string | bigint;
  niveau_intervenant: "junior" | "senior" | "manager" | "associe";
  frais_deplacement_centimes?: string | bigint;
  marge_pct?: number;
}): { ok: boolean; honoraires_base_centimes: string; total_centimes: string; total_formatted: string; detail: { libelle: string; montant_centimes: string }[] } {
  const taux = BigInt(args.taux_journalier_centimes);
  const multiplicateurs: Record<string, number> = { junior: 1, senior: 1.5, manager: 2.2, associe: 3.5 };
  const mult = multiplicateurs[args.niveau_intervenant];
  const base = (taux * BigInt(Math.round(mult * 100)) * BigInt(args.duree_jours)) / 100n;
  const frais = args.frais_deplacement_centimes ? BigInt(args.frais_deplacement_centimes) : 0n;
  const margeBp = BigInt(Math.round((args.marge_pct ?? 0) * 100));
  const marge = (base * margeBp) / 10000n;
  const total = base + frais + marge;
  return {
    ok: true,
    honoraires_base_centimes: base.toString(),
    total_centimes: total.toString(),
    total_formatted: formatMoneyFcfa(total),
    detail: [
      { libelle: `Honoraires ${args.niveau_intervenant} (${args.duree_jours}j × ${mult}x)`, montant_centimes: base.toString() },
      { libelle: "Frais deplacement", montant_centimes: frais.toString() },
      { libelle: "Marge commerciale", montant_centimes: marge.toString() },
    ],
  };
}

export function defineMissionScope(args: {
  client_nom: string;
  type_mission: "audit" | "due_diligence" | "transformation" | "implementation" | "formation";
  deliverables: string[];
  exclusions?: string[];
  duree_estimee_jours: number;
}): { ok: boolean; scope: unknown; risques_identifies: string[] } {
  const risques: string[] = [];
  if (args.deliverables.length > 8) risques.push("Trop de deliverables — risque de scope creep");
  if (!args.exclusions || args.exclusions.length === 0) risques.push("Pas d'exclusions definies — vulnerable aux changements de demande");
  if (args.duree_estimee_jours > 60 && args.type_mission !== "transformation") risques.push("Mission longue pour ce type — verifier estimation");
  return {
    ok: true,
    scope: {
      client: args.client_nom,
      type: args.type_mission,
      deliverables: args.deliverables,
      exclusions: args.exclusions ?? ["Aucune exclusion definie — A clarifier !"],
      duree_estimee: args.duree_estimee_jours,
    },
    risques_identifies: risques,
  };
}

export function generateRapportConseil(args: {
  client: string;
  mission: string;
  constats: string[];
  recommendations: { titre: string; priorite: "P1" | "P2" | "P3"; effort: "S" | "M" | "L" }[];
  next_steps?: string[];
}): { ok: boolean; rapport_markdown: string; nb_recos_p1: number; estimation_effort: string } {
  const p1 = args.recommendations.filter(r => r.priorite === "P1").length;
  const efforts = args.recommendations.map(r => r.effort);
  const totalL = efforts.filter(e => e === "L").length;
  const totalM = efforts.filter(e => e === "M").length;
  const estimation = totalL >= 3 ? "Programme strategique 6+ mois" : totalM >= 5 ? "Plan tactique 3-6 mois" : "Quick wins 1-3 mois";

  const md = `# Rapport conseil — ${args.client}

## Mission : ${args.mission}

## Constats
${args.constats.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## Recommandations (${args.recommendations.length})
${args.recommendations.map(r => `- **[${r.priorite}/${r.effort}]** ${r.titre}`).join("\n")}

## Estimation effort global : ${estimation}

${args.next_steps ? `## Prochaines etapes\n${args.next_steps.map(s => `- ${s}`).join("\n")}` : ""}
`;
  return { ok: true, rapport_markdown: md, nb_recos_p1: p1, estimation_effort: estimation };
}

export function scoreMissionComplexite(args: {
  nb_processus_impactes: number;
  nb_systemes_techniques: number;
  multi_pays: boolean;
  contraintes_reglementaires: number;
  resistance_changement: 1 | 2 | 3 | 4 | 5;
}): { ok: boolean; score_complexite: number; niveau: "simple" | "medium" | "complex" | "tres_complex"; budget_recommande_jours: number } {
  let score = 0;
  score += Math.min(20, args.nb_processus_impactes * 3);
  score += Math.min(15, args.nb_systemes_techniques * 3);
  if (args.multi_pays) score += 15;
  score += Math.min(20, args.contraintes_reglementaires * 5);
  score += args.resistance_changement * 6;
  const niveau: "simple" | "medium" | "complex" | "tres_complex" =
    score < 20 ? "simple" : score < 40 ? "medium" : score < 65 ? "complex" : "tres_complex";
  const budget = niveau === "simple" ? 10 : niveau === "medium" ? 25 : niveau === "complex" ? 60 : 120;
  return { ok: true, score_complexite: score, niveau, budget_recommande_jours: budget };
}

export function optimizeMissionPlanning(args: {
  taches: { id: string; libelle: string; duree_jours: number; depend_de?: string[]; consultant_assign?: string }[];
  consultants: { nom: string; jours_dispo: number }[];
}): { ok: boolean; planning: { semaine: number; taches: string[] }[]; goulot: string | null; consultants_overload: string[] } {
  // Simplified topological sort
  const planning: { semaine: number; taches: string[] }[] = [];
  const fait = new Set<string>();
  let semaine = 1;
  let restant = [...args.taches];
  while (restant.length > 0 && semaine < 52) {
    const dispo = restant.filter(t => !t.depend_de || t.depend_de.every(d => fait.has(d)));
    if (dispo.length === 0) break;
    const semaineActives = dispo.slice(0, args.consultants.length);
    planning.push({ semaine, taches: semaineActives.map(t => t.id) });
    for (const t of semaineActives) { fait.add(t.id); restant = restant.filter(x => x.id !== t.id); }
    semaine++;
  }
  const charges: Record<string, number> = {};
  for (const t of args.taches) {
    if (t.consultant_assign) charges[t.consultant_assign] = (charges[t.consultant_assign] ?? 0) + t.duree_jours;
  }
  const overload = Object.entries(charges).filter(([n, j]) => j > (args.consultants.find(c => c.nom === n)?.jours_dispo ?? 999)).map(([n]) => n);
  return { ok: true, planning, goulot: restant.length > 0 ? restant[0].id : null, consultants_overload: overload };
}
