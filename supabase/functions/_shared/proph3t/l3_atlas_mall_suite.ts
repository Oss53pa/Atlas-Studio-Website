// L3 : ATLAS-MALL-SUITE (Centre commercial / Mall management)
import { formatMoneyFcfa } from "./calculators.ts";

export function computeLoyerVariableRetail(args: {
  loyer_minimum_centimes: string | bigint;
  ca_locataire_centimes: string | bigint;
  taux_pourcentage_pct: number;
  seuil_declenchement_centimes?: string | bigint;
}): { ok: boolean; loyer_minimum_centimes: string; loyer_variable_centimes: string; loyer_du_centimes: string; loyer_du_formatted: string; depasse_seuil: boolean } {
  const min = BigInt(args.loyer_minimum_centimes);
  const ca = BigInt(args.ca_locataire_centimes);
  const seuil = args.seuil_declenchement_centimes ? BigInt(args.seuil_declenchement_centimes) : 0n;
  const baseVariable = ca > seuil ? ca - seuil : 0n;
  const tauxBp = BigInt(Math.round(args.taux_pourcentage_pct * 100));
  const variable = (baseVariable * tauxBp) / 10000n;
  const du = variable > min ? variable : min;
  return { ok: true, loyer_minimum_centimes: min.toString(), loyer_variable_centimes: variable.toString(), loyer_du_centimes: du.toString(), loyer_du_formatted: formatMoneyFcfa(du), depasse_seuil: ca > seuil };
}

export function analyzeFootfallMall(args: {
  donnees_journalieres: { date: string; nb_visiteurs: number; nb_passages_zone_a: number; nb_passages_zone_b: number; ca_global_centimes: string | bigint }[];
  surface_totale_m2: number;
}): { ok: boolean; visiteurs_moyen_jour: number; taux_conversion_pct: number; densite_max_m2_par_visiteur: number; zones_chaudes: string[]; recommendations: string[] } {
  const moy = args.donnees_journalieres.reduce((s, d) => s + d.nb_visiteurs, 0) / Math.max(1, args.donnees_journalieres.length);
  const transactionsTotal = args.donnees_journalieres.reduce((s, d) => s + Number(BigInt(d.ca_global_centimes)) > 0 ? 1 : 0, 0);
  const visiteursTot = args.donnees_journalieres.reduce((s, d) => s + d.nb_visiteurs, 0);
  const conversion = visiteursTot > 0 ? (transactionsTotal / visiteursTot) * 100 : 0;
  const densite = moy > 0 ? args.surface_totale_m2 / moy : 0;
  const passageA = args.donnees_journalieres.reduce((s, d) => s + d.nb_passages_zone_a, 0);
  const passageB = args.donnees_journalieres.reduce((s, d) => s + d.nb_passages_zone_b, 0);
  const zones: string[] = [];
  if (passageA > visiteursTot * 0.6) zones.push("zone_a");
  if (passageB > visiteursTot * 0.6) zones.push("zone_b");
  const recos: string[] = [];
  if (conversion < 25) recos.push(`Conversion ${conversion.toFixed(1)}% < benchmark 25-40% — animation commerciale necessaire`);
  if (densite < 5) recos.push("Forte densite — risque saturation aux pics");
  return { ok: true, visiteurs_moyen_jour: Math.round(moy), taux_conversion_pct: Math.round(conversion * 100) / 100, densite_max_m2_par_visiteur: Math.round(densite * 100) / 100, zones_chaudes: zones, recommendations: recos };
}

export function computeTenantMixOptimal(args: {
  locataires_actuels: { id: string; categorie: "alimentaire" | "mode" | "restauration" | "services" | "loisirs" | "tech"; surface_m2: number; ca_m2_centimes: string | bigint }[];
  surface_totale_m2: number;
}): { ok: boolean; mix_actuel_pct: Record<string, number>; mix_optimal_pct: Record<string, number>; ecarts: { categorie: string; ecart_pct: number; recommendation: string }[] } {
  // Benchmark mall mix optimal (international)
  const optimal: Record<string, number> = {
    alimentaire: 25, mode: 30, restauration: 15, services: 10, loisirs: 12, tech: 8,
  };
  const surfaceParCat: Record<string, number> = {};
  for (const l of args.locataires_actuels) {
    surfaceParCat[l.categorie] = (surfaceParCat[l.categorie] ?? 0) + l.surface_m2;
  }
  const actuel: Record<string, number> = {};
  for (const k of Object.keys(optimal)) {
    actuel[k] = args.surface_totale_m2 > 0 ? Math.round((surfaceParCat[k] ?? 0) / args.surface_totale_m2 * 10000) / 100 : 0;
  }
  const ecarts = Object.keys(optimal).map(cat => {
    const ecart = actuel[cat] - optimal[cat];
    const reco = Math.abs(ecart) < 3 ? "OK" : ecart > 0 ? `Sur-representation : reduire ${cat}` : `Sous-representation : recruter ${cat}`;
    return { categorie: cat, ecart_pct: ecart, recommendation: reco };
  });
  return { ok: true, mix_actuel_pct: actuel, mix_optimal_pct: optimal, ecarts };
}

export function detectChargesCommunesRepartition(args: {
  charges_totales_centimes: string | bigint;
  locataires: { id: string; surface_m2: number; coefficient?: number }[];
  cles_repartition: "surface" | "ca" | "tantieme";
  ca_par_locataire_centimes?: { id: string; ca_centimes: string | bigint }[];
}): { ok: boolean; repartition: { id: string; cle_value: number; quote_part_pct: number; charge_centimes: string }[]; total_charges_reparties_centimes: string } {
  const total = BigInt(args.charges_totales_centimes);
  let totalCle = 0;
  const cles = args.locataires.map(l => {
    let v = 0;
    if (args.cles_repartition === "surface") v = l.surface_m2;
    else if (args.cles_repartition === "ca") {
      const ca = args.ca_par_locataire_centimes?.find(x => x.id === l.id)?.ca_centimes ?? 0n;
      v = Number(BigInt(ca));
    } else if (args.cles_repartition === "tantieme") v = l.coefficient ?? 0;
    return { id: l.id, value: v };
  });
  totalCle = cles.reduce((s, c) => s + c.value, 0);
  const rep = cles.map(c => {
    const part = totalCle > 0 ? c.value / totalCle : 0;
    return { id: c.id, cle_value: c.value, quote_part_pct: Math.round(part * 10000) / 100, charge_centimes: ((total * BigInt(Math.round(part * 1_000_000))) / 1_000_000n).toString() };
  });
  return { ok: true, repartition: rep, total_charges_reparties_centimes: total.toString() };
}

export function forecastRevenuMallAnnuel(args: {
  locataires: { id: string; type_loyer: "fixe" | "variable" | "mixte"; loyer_mensuel_min_centimes: string | bigint; ca_estime_annuel_centimes: string | bigint; taux_var_pct?: number }[];
  taux_occupation_pct?: number;
}): { ok: boolean; revenu_annuel_estime_centimes: string; revenu_formatted: string; loyers_fixes_centimes: string; loyers_variables_centimes: string } {
  const occMul = (args.taux_occupation_pct ?? 95) / 100;
  let fixe = 0n;
  let variable = 0n;
  for (const l of args.locataires) {
    if (l.type_loyer === "fixe" || l.type_loyer === "mixte") {
      fixe += BigInt(l.loyer_mensuel_min_centimes) * 12n;
    }
    if ((l.type_loyer === "variable" || l.type_loyer === "mixte") && l.taux_var_pct) {
      variable += (BigInt(l.ca_estime_annuel_centimes) * BigInt(Math.round(l.taux_var_pct * 100))) / 10000n;
    }
  }
  const total = ((fixe + variable) * BigInt(Math.round(occMul * 1000))) / 1000n;
  return { ok: true, revenu_annuel_estime_centimes: total.toString(), revenu_formatted: formatMoneyFcfa(total), loyers_fixes_centimes: fixe.toString(), loyers_variables_centimes: variable.toString() };
}
