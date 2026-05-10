// L3 : CASHPILOT (Cash management avance)
import { formatMoneyFcfa } from "./calculators.ts";

export function computePoolingTresorerie(args: {
  comptes: { id: string; nom: string; solde_centimes: string | bigint; type: "operation" | "epargne" | "decouvert" }[];
  seuil_minimum_centimes?: string | bigint;
  seuil_maximum_centimes?: string | bigint;
}): { ok: boolean; total_pool_centimes: string; total_formatted: string; mouvements_recommandes: { de: string; vers: string; montant_centimes: string }[]; comptes_critiques: string[] } {
  const seuilMin = args.seuil_minimum_centimes ? BigInt(args.seuil_minimum_centimes) : 100_000_000n;
  const seuilMax = args.seuil_maximum_centimes ? BigInt(args.seuil_maximum_centimes) : 5_000_000_000n;
  const total = args.comptes.reduce((s, c) => s + BigInt(c.solde_centimes), 0n);
  const mouv: any[] = [];
  const critiques: string[] = [];

  // Comptes en surplus (solde > max) -> transferer vers comptes en deficit
  const surplus = args.comptes.filter(c => BigInt(c.solde_centimes) > seuilMax);
  const deficit = args.comptes.filter(c => BigInt(c.solde_centimes) < seuilMin);
  for (const d of deficit) {
    const besoin = seuilMin - BigInt(d.solde_centimes);
    critiques.push(d.id);
    if (surplus.length > 0) {
      const s = surplus[0];
      const surplusDispo = BigInt(s.solde_centimes) - seuilMax;
      const transfert = besoin < surplusDispo ? besoin : surplusDispo;
      if (transfert > 0n) mouv.push({ de: s.id, vers: d.id, montant_centimes: transfert.toString() });
    }
  }
  return { ok: true, total_pool_centimes: total.toString(), total_formatted: formatMoneyFcfa(total), mouvements_recommandes: mouv, comptes_critiques: critiques };
}

export function optimizeCashAllocation(args: {
  excess_treso_centimes: string | bigint;
  options_placement: { id: string; libelle: string; taux_annuel_pct: number; duree_min_jours: number; risque: "faible" | "moyen" | "eleve"; liquidite: "immediate" | "j+1" | "j+30" }[];
  besoin_liquidite_jours: number;
  appetit_risque: "conservateur" | "modere" | "dynamique";
}): { ok: boolean; allocation_recommandee: { option_id: string; pourcentage: number; rendement_attendu_centimes: string }[]; rendement_total_attendu_centimes: string } {
  const excess = BigInt(args.excess_treso_centimes);
  const eligibles = args.options_placement.filter(o => o.duree_min_jours <= args.besoin_liquidite_jours);
  let strat: typeof eligibles;
  if (args.appetit_risque === "conservateur") strat = eligibles.filter(o => o.risque === "faible");
  else if (args.appetit_risque === "modere") strat = eligibles.filter(o => o.risque !== "eleve");
  else strat = eligibles;
  if (strat.length === 0) strat = eligibles;
  const sortedByYield = [...strat].sort((a, b) => b.taux_annuel_pct - a.taux_annuel_pct);
  const allocation: any[] = [];
  let rendementTotal = 0n;
  // Repartition top-3 : 50% / 30% / 20%
  const repart = [50, 30, 20];
  for (let i = 0; i < Math.min(3, sortedByYield.length); i++) {
    const part = (excess * BigInt(repart[i])) / 100n;
    const rendement = (part * BigInt(Math.round(sortedByYield[i].taux_annuel_pct * 100)) * BigInt(args.besoin_liquidite_jours)) / (10000n * 360n);
    allocation.push({ option_id: sortedByYield[i].id, pourcentage: repart[i], rendement_attendu_centimes: rendement.toString() });
    rendementTotal += rendement;
  }
  return { ok: true, allocation_recommandee: allocation, rendement_total_attendu_centimes: rendementTotal.toString() };
}

export function detectFluxAnormaux(args: {
  flux_recents: { date: string; montant_centimes: string | bigint; type: "in" | "out"; libelle: string }[];
  baseline_quotidienne_centimes?: string | bigint;
  seuil_z_score?: number;
}): { ok: boolean; flux_suspects: { date: string; montant_centimes: string; type: string; ecart_baseline_pct: number; severity: "warning" | "critical" }[]; total_suspect_centimes: string } {
  const baseline = args.baseline_quotidienne_centimes ? Number(BigInt(args.baseline_quotidienne_centimes)) : args.flux_recents.reduce((s, f) => s + Number(BigInt(f.montant_centimes)), 0) / Math.max(1, args.flux_recents.length);
  const seuil = args.seuil_z_score ?? 3;
  const moyenne = baseline;
  const variance = args.flux_recents.reduce((s, f) => s + Math.pow(Number(BigInt(f.montant_centimes)) - moyenne, 2), 0) / args.flux_recents.length;
  const stddev = Math.sqrt(variance);
  const suspects: any[] = [];
  let total = 0n;
  for (const f of args.flux_recents) {
    const m = Number(BigInt(f.montant_centimes));
    const z = stddev > 0 ? Math.abs(m - moyenne) / stddev : 0;
    if (z > seuil) {
      suspects.push({ date: f.date, montant_centimes: f.montant_centimes.toString(), type: f.type, ecart_baseline_pct: Math.round(((m / moyenne) - 1) * 10000) / 100, severity: z > 5 ? "critical" : "warning" });
      total += BigInt(f.montant_centimes);
    }
  }
  return { ok: true, flux_suspects: suspects, total_suspect_centimes: total.toString() };
}

export function forecastBesoinFinancement(args: {
  cashflow_prevu_mensuel: { mois: string; net_centimes: string | bigint }[];
  solde_initial_centimes: string | bigint;
  seuil_minimum_centimes: string | bigint;
}): { ok: boolean; mois_avec_besoin: { mois: string; besoin_centimes: string; solde_avant_centimes: string }[]; total_besoin_max_centimes: string; recommendation: string } {
  let solde = BigInt(args.solde_initial_centimes);
  const seuil = BigInt(args.seuil_minimum_centimes);
  const besoins: any[] = [];
  let maxBesoin = 0n;
  for (const m of args.cashflow_prevu_mensuel) {
    solde += BigInt(m.net_centimes);
    if (solde < seuil) {
      const besoin = seuil - solde;
      besoins.push({ mois: m.mois, besoin_centimes: besoin.toString(), solde_avant_centimes: (solde - BigInt(m.net_centimes)).toString() });
      if (besoin > maxBesoin) maxBesoin = besoin;
    }
  }
  const reco = besoins.length === 0 ? "Tresorerie suffisante sur la periode" : besoins.length > 3 ? "Negocier ligne de credit longue duree" : "Decouvert ponctuel ou avance bancaire";
  return { ok: true, mois_avec_besoin: besoins, total_besoin_max_centimes: maxBesoin.toString(), recommendation: reco };
}

export function computeNetWorkingCapital(args: {
  actif_circulant_centimes: string | bigint;
  passif_circulant_centimes: string | bigint;
  ca_annuel_centimes: string | bigint;
}): { ok: boolean; nwc_centimes: string; nwc_formatted: string; nwc_jours_ca: number; ratio_liquidite: number; tendance_recommandee: string } {
  const ac = BigInt(args.actif_circulant_centimes);
  const pc = BigInt(args.passif_circulant_centimes);
  const ca = BigInt(args.ca_annuel_centimes);
  const nwc = ac - pc;
  const nwcJours = ca > 0n ? Math.round((Number(nwc) / Number(ca)) * 360) : 0;
  const ratio = pc > 0n ? Math.round((Number(ac) / Number(pc)) * 100) / 100 : 0;
  const tendance = nwc < 0n ? "Renforcer NWC : reduire stocks ou negocier delais fournisseurs" : nwcJours > 90 ? "NWC excessif : optimiser BFR" : "NWC sain";
  return { ok: true, nwc_centimes: nwc.toString(), nwc_formatted: formatMoneyFcfa(nwc), nwc_jours_ca: nwcJours, ratio_liquidite: ratio, tendance_recommandee: tendance };
}
