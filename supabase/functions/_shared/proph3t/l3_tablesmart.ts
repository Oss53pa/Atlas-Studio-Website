// L3 : TABLESMART (Restaurant POS / Tables)
import { formatMoneyFcfa } from "./calculators.ts";

export function computeAdditionTable(args: {
  table_id: string;
  items: { id: string; nom: string; prix_unitaire_centimes: string | bigint; quantite: number; categorie: "boisson" | "plat" | "dessert" | "autre" }[];
  service_pct?: number;
  pays?: string;
}): { ok: boolean; ht_centimes: string; tva_centimes: string; service_centimes: string; ttc_centimes: string; ttc_formatted: string; nb_couverts_estime: number } {
  let ht = 0n;
  for (const i of args.items) ht += BigInt(i.prix_unitaire_centimes) * BigInt(i.quantite);
  // TVA hotellerie/restauration variable selon pays. 18% standard CI/SN
  const tvaBp = 1800n;
  const tva = (ht * tvaBp) / 10000n;
  const serviceBp = BigInt(Math.round((args.service_pct ?? 0) * 100));
  const service = (ht * serviceBp) / 10000n;
  const ttc = ht + tva + service;
  const couverts = Math.max(1, args.items.filter(i => i.categorie === "plat").reduce((s, i) => s + i.quantite, 0));
  return { ok: true, ht_centimes: ht.toString(), tva_centimes: tva.toString(), service_centimes: service.toString(), ttc_centimes: ttc.toString(), ttc_formatted: formatMoneyFcfa(ttc), nb_couverts_estime: couverts };
}

export function computeTauxOccupationSalle(args: {
  capacite_totale: number;
  reservations_par_creneau: { creneau: string; nb_reservations: number }[];
  service: "midi" | "soir" | "all_day";
}): { ok: boolean; taux_occupation_moyen_pct: number; pic_occupation_pct: number; creneaux_satures: string[]; creneaux_disponibles: string[] } {
  const taux = args.reservations_par_creneau.map(c => ({ creneau: c.creneau, taux: (c.nb_reservations / args.capacite_totale) * 100 }));
  const moyen = taux.length > 0 ? taux.reduce((s, t) => s + t.taux, 0) / taux.length : 0;
  const pic = Math.max(...taux.map(t => t.taux), 0);
  return {
    ok: true,
    taux_occupation_moyen_pct: Math.round(moyen),
    pic_occupation_pct: Math.round(pic),
    creneaux_satures: taux.filter(t => t.taux >= 90).map(t => t.creneau),
    creneaux_disponibles: taux.filter(t => t.taux <= 50).map(t => t.creneau),
  };
}

export function analyzeMenuPerformance(args: {
  ventes_par_plat: { plat_id: string; nom: string; quantite_vendue: number; prix_centimes: string | bigint; cout_centimes: string | bigint }[];
}): { ok: boolean; classification_bcg: { plat: string; classification: "star" | "puzzle" | "plowhorse" | "dog" }[]; top_revenues: { plat: string; revenu_centimes: string }[]; plats_a_supprimer: string[] } {
  const totalVentes = args.ventes_par_plat.reduce((s, p) => s + p.quantite_vendue, 0);
  const margesByPlat = args.ventes_par_plat.map(p => {
    const marge = BigInt(p.prix_centimes) - BigInt(p.cout_centimes);
    const popularite = p.quantite_vendue / totalVentes;
    const margeUnit = Number(marge);
    return { plat_id: p.plat_id, nom: p.nom, marge_unit: margeUnit, popularite, revenu: marge * BigInt(p.quantite_vendue) };
  });
  const margeMedian = margesByPlat.map(m => m.marge_unit).sort((a, b) => a - b)[Math.floor(margesByPlat.length / 2)];
  const popMedian = 1 / margesByPlat.length;
  const classification = margesByPlat.map(m => ({
    plat: m.nom,
    classification: m.popularite > popMedian
      ? (m.marge_unit > margeMedian ? "star" as const : "plowhorse" as const)
      : (m.marge_unit > margeMedian ? "puzzle" as const : "dog" as const),
  }));
  const top = margesByPlat.sort((a, b) => Number(b.revenu - a.revenu)).slice(0, 5).map(m => ({ plat: m.nom, revenu_centimes: m.revenu.toString() }));
  const aSupprimer = classification.filter(c => c.classification === "dog").map(c => c.plat);
  return { ok: true, classification_bcg: classification, top_revenues: top, plats_a_supprimer: aSupprimer };
}

export function forecastApprovisionnement(args: {
  consommation_historique_jours: { date: string; quantite: number }[];
  stock_actuel: number;
  delai_reapprovisionnement_jours: number;
  jours_securite?: number;
}): { ok: boolean; consommation_moyenne_jour: number; jours_avant_rupture: number; quantite_a_commander: number; date_commande_recommandee: string; alerte: string } {
  const moyen = args.consommation_historique_jours.reduce((s, c) => s + c.quantite, 0) / Math.max(1, args.consommation_historique_jours.length);
  const securite = args.jours_securite ?? 3;
  const jours = moyen > 0 ? args.stock_actuel / moyen : 999;
  const qte = Math.ceil(moyen * (args.delai_reapprovisionnement_jours + securite));
  const dateCommande = new Date(Date.now() + Math.max(0, jours - args.delai_reapprovisionnement_jours - securite) * 86400000);
  const alerte = jours < args.delai_reapprovisionnement_jours ? "URGENT : commander immediatement" : jours < args.delai_reapprovisionnement_jours + securite ? "A commander cette semaine" : "OK";
  return { ok: true, consommation_moyenne_jour: Math.round(moyen * 100) / 100, jours_avant_rupture: Math.round(jours), quantite_a_commander: qte, date_commande_recommandee: dateCommande.toISOString().slice(0, 10), alerte };
}

export function computePourboireRepartition(args: {
  total_pourboires_centimes: string | bigint;
  equipe: { id: string; role: "serveur" | "barman" | "cuisine" | "manager"; heures_travaillees: number }[];
}): { ok: boolean; repartition: { id: string; role: string; montant_centimes: string }[]; total_heures: number } {
  const ponderation: Record<string, number> = { serveur: 1, barman: 0.8, cuisine: 0.5, manager: 0.6 };
  const totalP = args.equipe.reduce((s, e) => s + e.heures_travaillees * (ponderation[e.role] ?? 0.5), 0);
  const tot = BigInt(args.total_pourboires_centimes);
  const repartition = args.equipe.map(e => {
    const part = (e.heures_travaillees * (ponderation[e.role] ?? 0.5)) / Math.max(1, totalP);
    return { id: e.id, role: e.role, montant_centimes: ((tot * BigInt(Math.round(part * 1_000_000))) / 1_000_000n).toString() };
  });
  return { ok: true, repartition, total_heures: args.equipe.reduce((s, e) => s + e.heures_travaillees, 0) };
}
