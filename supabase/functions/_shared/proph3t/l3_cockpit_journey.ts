// L3 : COCKPIT-JOURNEY (Mission orders, expense reports, travel)
import { formatMoneyFcfa } from "./calculators.ts";

const PER_DIEM_FCFA: Record<string, { jour: number; logement_max: number }> = {
  CI: { jour: 50_000, logement_max: 80_000 },
  SN: { jour: 40_000, logement_max: 70_000 },
  BF: { jour: 35_000, logement_max: 50_000 },
  ML: { jour: 30_000, logement_max: 50_000 },
  EU: { jour: 100_000, logement_max: 150_000 },
  US: { jour: 120_000, logement_max: 200_000 },
};

export function computePerDiemMission(args: {
  pays_destination: string;
  duree_jours: number;
  niveau_voyageur?: "junior" | "senior" | "executive";
  inclut_logement?: boolean;
}): { ok: boolean; pays: string; per_diem_jour_centimes: string; total_per_diem_centimes: string; logement_max_centimes?: string; total_estime_centimes: string; total_formatted: string } {
  const cfg = PER_DIEM_FCFA[args.pays_destination] ?? { jour: 50_000, logement_max: 80_000 };
  const niveauMult: Record<string, number> = { junior: 1, senior: 1.3, executive: 1.8 };
  const mult = niveauMult[args.niveau_voyageur ?? "senior"];
  const perDiemJour = BigInt(Math.round(cfg.jour * mult * 100));
  const totalPd = perDiemJour * BigInt(args.duree_jours);
  const logement = args.inclut_logement ? BigInt(cfg.logement_max * 100) * BigInt(args.duree_jours) : 0n;
  const total = totalPd + logement;
  return {
    ok: true, pays: args.pays_destination,
    per_diem_jour_centimes: perDiemJour.toString(),
    total_per_diem_centimes: totalPd.toString(),
    logement_max_centimes: args.inclut_logement ? logement.toString() : undefined,
    total_estime_centimes: total.toString(),
    total_formatted: formatMoneyFcfa(total),
  };
}

export function validateNoteFrais(args: {
  lignes: { id: string; categorie: "transport" | "hebergement" | "restauration" | "autre"; date: string; montant_centimes: string | bigint; justificatif_present: boolean }[];
  plafond_par_categorie?: Record<string, string | bigint>;
  date_mission_debut: string;
  date_mission_fin: string;
}): { ok: boolean; lignes_valides: string[]; lignes_rejetees: { id: string; raison: string }[]; total_valide_centimes: string; total_rejete_centimes: string } {
  const valides: string[] = [];
  const rejetees: any[] = [];
  let totalV = 0n;
  let totalR = 0n;
  const debut = new Date(args.date_mission_debut).getTime();
  const fin = new Date(args.date_mission_fin).getTime();
  for (const l of args.lignes) {
    const m = BigInt(l.montant_centimes);
    if (!l.justificatif_present) { rejetees.push({ id: l.id, raison: "Pas de justificatif" }); totalR += m; continue; }
    const dateL = new Date(l.date).getTime();
    if (dateL < debut - 86400000 || dateL > fin + 86400000) { rejetees.push({ id: l.id, raison: "Date hors mission" }); totalR += m; continue; }
    const plafond = args.plafond_par_categorie?.[l.categorie];
    if (plafond && m > BigInt(plafond)) { rejetees.push({ id: l.id, raison: `Depasse plafond ${l.categorie}` }); totalR += m; continue; }
    valides.push(l.id); totalV += m;
  }
  return { ok: true, lignes_valides: valides, lignes_rejetees: rejetees, total_valide_centimes: totalV.toString(), total_rejete_centimes: totalR.toString() };
}

export function generateOrdreMission(args: {
  beneficiaire: { nom: string; matricule: string; fonction: string };
  destination: string;
  date_depart: string;
  date_retour: string;
  motif: string;
  budget_alloue_centimes: string | bigint;
  validateurs: string[];
}): { ok: boolean; ordre_mission_markdown: string; reference: string } {
  const ref = `OM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  const md = `# Ordre de mission — ${ref}

**Beneficiaire :** ${args.beneficiaire.nom} (${args.beneficiaire.matricule}, ${args.beneficiaire.fonction})

**Mission :** ${args.motif}

**Destination :** ${args.destination}
**Periode :** du ${args.date_depart} au ${args.date_retour}

**Budget alloue :** ${formatMoneyFcfa(BigInt(args.budget_alloue_centimes))}

## Validation
${args.validateurs.map(v => `- [ ] ${v}`).join("\n")}

---
*Ordre de mission a presenter avant tout deplacement.*
`;
  return { ok: true, ordre_mission_markdown: md, reference: ref };
}

export function analyzeMissionsCost(args: {
  missions: { id: string; destination: string; cout_centimes: string | bigint; duree_jours: number; categorie: string }[];
  periode: string;
}): { ok: boolean; total_centimes: string; cout_moyen_par_mission_centimes: string; top_destinations: { destination: string; nb_missions: number; cout_total_centimes: string }[]; alertes: string[] } {
  const total = args.missions.reduce((s, m) => s + BigInt(m.cout_centimes), 0n);
  const moyen = args.missions.length > 0 ? total / BigInt(args.missions.length) : 0n;
  const byDest = new Map<string, { nb: number; total: bigint }>();
  for (const m of args.missions) {
    const cur = byDest.get(m.destination) ?? { nb: 0, total: 0n };
    cur.nb++; cur.total += BigInt(m.cout_centimes);
    byDest.set(m.destination, cur);
  }
  const top = Array.from(byDest.entries()).map(([destination, v]) => ({ destination, nb_missions: v.nb, cout_total_centimes: v.total.toString() })).sort((a, b) => Number(BigInt(b.cout_total_centimes) - BigInt(a.cout_total_centimes))).slice(0, 5);
  const alertes: string[] = [];
  if (args.missions.some(m => Number(BigInt(m.cout_centimes)) > Number(moyen) * 3)) alertes.push("Missions au cout > 3x moyenne — auditer");
  return { ok: true, total_centimes: total.toString(), cout_moyen_par_mission_centimes: moyen.toString(), top_destinations: top, alertes };
}

export function optimizeItineraire(args: {
  villes: string[];
  matrice_distances_km: Record<string, Record<string, number>>;
  ville_depart: string;
  ville_retour?: string;
}): { ok: boolean; itineraire_optimal: string[]; distance_totale_km: number; economie_vs_aller_retour_pct: number } {
  const villes = [...args.villes];
  if (!villes.includes(args.ville_depart)) villes.unshift(args.ville_depart);
  // Algo nearest-neighbor (heuristique)
  const visite: string[] = [args.ville_depart];
  let courant = args.ville_depart;
  const restant = villes.filter(v => v !== args.ville_depart);
  let totalKm = 0;
  while (restant.length > 0) {
    const sorted = restant.slice().sort((a, b) => (args.matrice_distances_km[courant]?.[a] ?? Infinity) - (args.matrice_distances_km[courant]?.[b] ?? Infinity));
    const next = sorted[0];
    totalKm += args.matrice_distances_km[courant]?.[next] ?? 0;
    visite.push(next);
    restant.splice(restant.indexOf(next), 1);
    courant = next;
  }
  if (args.ville_retour) {
    totalKm += args.matrice_distances_km[courant]?.[args.ville_retour] ?? 0;
    visite.push(args.ville_retour);
  }
  // Comparaison avec aller-retour brut (depart -> chaque ville -> depart)
  const allerRetour = villes.filter(v => v !== args.ville_depart).reduce((s, v) => s + 2 * (args.matrice_distances_km[args.ville_depart]?.[v] ?? 0), 0);
  const economie = allerRetour > 0 ? Math.round((1 - totalKm / allerRetour) * 100) : 0;
  return { ok: true, itineraire_optimal: visite, distance_totale_km: totalKm, economie_vs_aller_retour_pct: economie };
}
