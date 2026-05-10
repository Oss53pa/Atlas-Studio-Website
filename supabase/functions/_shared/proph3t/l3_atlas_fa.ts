// L3 : ATLAS-FA (Atlas Finance — version avancee Cockpit-FA)
import { formatMoneyFcfa } from "./calculators.ts";

export function consolidateGroupAccounts(args: {
  filiales: { id: string; nom: string; pourcentage_detention: number; capitaux_propres_centimes: string | bigint; resultat_net_centimes: string | bigint; ca_centimes: string | bigint; methode: "integration_globale" | "mise_en_equivalence" }[];
}): { ok: boolean; ca_consolide_centimes: string; resultat_consolide_centimes: string; capitaux_propres_consolides_centimes: string; participations_minoritaires_centimes: string; nb_filiales: number } {
  let ca = 0n, resultat = 0n, cp = 0n, mino = 0n;
  for (const f of args.filiales) {
    const detention = BigInt(Math.round(f.pourcentage_detention * 100));
    if (f.methode === "integration_globale") {
      ca += BigInt(f.ca_centimes);
      const partGroup = (BigInt(f.resultat_net_centimes) * detention) / 10000n;
      const partMino = BigInt(f.resultat_net_centimes) - partGroup;
      resultat += partGroup;
      cp += (BigInt(f.capitaux_propres_centimes) * detention) / 10000n;
      mino += partMino;
    } else {
      // Mise en equivalence : on integre uniquement la quote-part dans resultat
      resultat += (BigInt(f.resultat_net_centimes) * detention) / 10000n;
      cp += (BigInt(f.capitaux_propres_centimes) * detention) / 10000n;
    }
  }
  return { ok: true, ca_consolide_centimes: ca.toString(), resultat_consolide_centimes: resultat.toString(), capitaux_propres_consolides_centimes: cp.toString(), participations_minoritaires_centimes: mino.toString(), nb_filiales: args.filiales.length };
}

export function computeIntercompanyEliminations(args: {
  transactions_intercompany: { id: string; emetteur: string; receveur: string; type: "vente" | "achat" | "pret" | "dividende"; montant_centimes: string | bigint }[];
}): { ok: boolean; total_a_eliminer_centimes: string; eliminations_par_type: Record<string, string>; transactions_count: number } {
  const total = args.transactions_intercompany.reduce((s, t) => s + BigInt(t.montant_centimes), 0n);
  const byType: Record<string, bigint> = {};
  for (const t of args.transactions_intercompany) {
    byType[t.type] = (byType[t.type] ?? 0n) + BigInt(t.montant_centimes);
  }
  const elims: Record<string, string> = {};
  for (const [k, v] of Object.entries(byType)) elims[k] = v.toString();
  return { ok: true, total_a_eliminer_centimes: total.toString(), eliminations_par_type: elims, transactions_count: args.transactions_intercompany.length };
}

export function generateReportingPnL(args: {
  societe: string;
  periode: string;
  granularite: "global" | "par_bu" | "par_produit";
  donnees: { dimension: string; ca_centimes: string | bigint; charges_centimes: string | bigint }[];
}): { ok: boolean; lignes: { dimension: string; ca_centimes: string; charges_centimes: string; resultat_centimes: string; marge_pct: number }[]; totaux: { ca_total_centimes: string; resultat_total_centimes: string }; top_performers: string[]; underperformers: string[] } {
  const lignes = args.donnees.map(d => {
    const ca = BigInt(d.ca_centimes);
    const ch = BigInt(d.charges_centimes);
    const res = ca - ch;
    const marge = ca > 0n ? Math.round((Number(res) / Number(ca)) * 10000) / 100 : 0;
    return { dimension: d.dimension, ca_centimes: ca.toString(), charges_centimes: ch.toString(), resultat_centimes: res.toString(), marge_pct: marge };
  });
  const caTotal = lignes.reduce((s, l) => s + BigInt(l.ca_centimes), 0n);
  const resTotal = lignes.reduce((s, l) => s + BigInt(l.resultat_centimes), 0n);
  const sortedByMarge = [...lignes].sort((a, b) => b.marge_pct - a.marge_pct);
  return { ok: true, lignes, totaux: { ca_total_centimes: caTotal.toString(), resultat_total_centimes: resTotal.toString() }, top_performers: sortedByMarge.slice(0, 3).map(l => l.dimension), underperformers: sortedByMarge.slice(-3).map(l => l.dimension) };
}

export function computeFreeCashFlow(args: {
  ebitda_centimes: string | bigint;
  variations_bfr_centimes: string | bigint;
  capex_centimes: string | bigint;
  impots_payes_centimes: string | bigint;
}): { ok: boolean; ebitda_centimes: string; fcf_operationnel_centimes: string; fcf_libre_centimes: string; fcf_libre_formatted: string; ratio_capex_ebitda: number } {
  const ebitda = BigInt(args.ebitda_centimes);
  const bfr = BigInt(args.variations_bfr_centimes);
  const capex = BigInt(args.capex_centimes);
  const impots = BigInt(args.impots_payes_centimes);
  const fcfOp = ebitda - bfr - impots;
  const fcfLibre = fcfOp - capex;
  const ratio = ebitda > 0n ? Math.round((Number(capex) / Number(ebitda)) * 10000) / 100 : 0;
  return { ok: true, ebitda_centimes: ebitda.toString(), fcf_operationnel_centimes: fcfOp.toString(), fcf_libre_centimes: fcfLibre.toString(), fcf_libre_formatted: formatMoneyFcfa(fcfLibre), ratio_capex_ebitda: ratio };
}

export function computeWaccCompany(args: {
  capitaux_propres_centimes: string | bigint;
  dette_centimes: string | bigint;
  cout_capitaux_propres_pct: number;
  cout_dette_avant_impot_pct: number;
  taux_is_pct: number;
}): { ok: boolean; valeur_entreprise_centimes: string; wacc_pct: number; cout_dette_apres_impot_pct: number; structure_capital: { capitaux_propres_pct: number; dette_pct: number } } {
  const cp = Number(BigInt(args.capitaux_propres_centimes));
  const d = Number(BigInt(args.dette_centimes));
  const v = cp + d;
  const e_pct = v > 0 ? cp / v : 0;
  const d_pct = v > 0 ? d / v : 0;
  const ke = args.cout_capitaux_propres_pct / 100;
  const kd = args.cout_dette_avant_impot_pct / 100;
  const t = args.taux_is_pct / 100;
  const kdAprIs = kd * (1 - t);
  const wacc = e_pct * ke + d_pct * kdAprIs;
  return { ok: true, valeur_entreprise_centimes: v.toString(), wacc_pct: Math.round(wacc * 10000) / 100, cout_dette_apres_impot_pct: Math.round(kdAprIs * 10000) / 100, structure_capital: { capitaux_propres_pct: Math.round(e_pct * 10000) / 100, dette_pct: Math.round(d_pct * 10000) / 100 } };
}
