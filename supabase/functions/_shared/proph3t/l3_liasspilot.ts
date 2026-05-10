// L3 : LIASSPILOT (Liasse fiscale, declarations OHADA)
import { formatMoneyFcfa } from "./calculators.ts";

export function generateLiasseFiscale(args: {
  raison_sociale: string;
  exercice: string;
  pays: string;
  bilan: { actif_total_centimes: string; passif_total_centimes: string };
  compte_resultat: { ca_centimes: string; resultat_net_centimes: string };
  is_calcule_centimes: string | bigint;
}): { ok: boolean; liasse_id: string; sections: { code: string; titre: string; statut: "rempli" | "vide" | "incomplet" }[]; pret_a_deposer: boolean } {
  const id = `LF-${args.raison_sociale.slice(0, 6).toUpperCase()}-${args.exercice}`;
  const sections = [
    { code: "BL", titre: "Bilan", statut: BigInt(args.bilan.actif_total_centimes) > 0n ? "rempli" as const : "vide" as const },
    { code: "CR", titre: "Compte de resultat", statut: BigInt(args.compte_resultat.ca_centimes) > 0n ? "rempli" as const : "vide" as const },
    { code: "TF", titre: "Tableau financier ressources/emplois", statut: "vide" as const },
    { code: "ANX", titre: "Annexes obligatoires", statut: "incomplet" as const },
    { code: "FIS", titre: "Determination IS", statut: BigInt(args.is_calcule_centimes) >= 0n ? "rempli" as const : "vide" as const },
  ];
  const pret = sections.every(s => s.statut === "rempli");
  return { ok: true, liasse_id: id, sections, pret_a_deposer: pret };
}

export function checkConformiteFiscale(args: {
  declarations_periode: { type: "TVA" | "IS" | "ITS" | "IRPP" | "Acompte_IS" | "FDFP"; date_limite: string; date_depot?: string; montant_paye_centimes: string | bigint; statut: "deposee" | "en_retard" | "non_deposee" | "rectifiee" }[];
  current_date?: string;
}): { ok: boolean; total_declarations: number; en_retard: number; non_deposees: number; risque_redressement_pct: number; alertes_critiques: string[] } {
  const now = args.current_date ? new Date(args.current_date) : new Date();
  let retard = 0; let nonDeposees = 0;
  const critiques: string[] = [];
  for (const d of args.declarations_periode) {
    if (d.statut === "non_deposee") {
      nonDeposees++;
      const limite = new Date(d.date_limite);
      if (now > limite) {
        const jours = Math.ceil((now.getTime() - limite.getTime()) / 86400000);
        critiques.push(`${d.type} en retard de ${jours} jours — penalite 25% + 5%/mois`);
      }
    }
    if (d.statut === "en_retard") retard++;
  }
  const risque = Math.min(100, (retard + nonDeposees * 2) * 15);
  return { ok: true, total_declarations: args.declarations_periode.length, en_retard: retard, non_deposees: nonDeposees, risque_redressement_pct: risque, alertes_critiques: critiques };
}

export function computeAcomptesProvisionnels(args: {
  is_n_minus_1_centimes: string | bigint;
  pays: string;
  exercice_n: string;
}): { ok: boolean; acomptes: { numero: number; date_limite: string; montant_centimes: string; pourcentage: number }[]; total_centimes: string } {
  const isRef = BigInt(args.is_n_minus_1_centimes);
  const acomptes = [
    { numero: 1, date_limite: `${args.exercice_n}-03-15`, pourcentage: 25 },
    { numero: 2, date_limite: `${args.exercice_n}-06-15`, pourcentage: 25 },
    { numero: 3, date_limite: `${args.exercice_n}-09-15`, pourcentage: 25 },
    { numero: 4, date_limite: `${args.exercice_n}-12-15`, pourcentage: 25 },
  ].map(a => ({ ...a, montant_centimes: ((isRef * BigInt(a.pourcentage)) / 100n).toString() }));
  return { ok: true, acomptes, total_centimes: isRef.toString() };
}

export function generateDeclarationTva(args: {
  periode: string;
  ca_ttc_centimes: string | bigint;
  achats_ttc_centimes: string | bigint;
  taux_tva_pct: number;
  pays: string;
}): { ok: boolean; tva_collectee_centimes: string; tva_deductible_centimes: string; tva_a_payer_centimes: string; tva_credit_centimes: string; declaration_md: string } {
  const caTtc = BigInt(args.ca_ttc_centimes);
  const achatsTtc = BigInt(args.achats_ttc_centimes);
  const tauxBp = BigInt(Math.round(args.taux_tva_pct * 100));
  const collectee = (caTtc * tauxBp) / (10000n + tauxBp);
  const deductible = (achatsTtc * tauxBp) / (10000n + tauxBp);
  const solde = collectee - deductible;
  const aPayer = solde > 0n ? solde : 0n;
  const credit = solde < 0n ? -solde : 0n;
  const md = `# Declaration TVA ${args.periode} (${args.pays})\n\nCA TTC : ${formatMoneyFcfa(caTtc)}\nAchats TTC : ${formatMoneyFcfa(achatsTtc)}\nTVA collectee : ${formatMoneyFcfa(collectee)}\nTVA deductible : ${formatMoneyFcfa(deductible)}\n**TVA a payer : ${formatMoneyFcfa(aPayer)}**${credit > 0n ? `\n*Credit : ${formatMoneyFcfa(credit)}*` : ""}`;
  return { ok: true, tva_collectee_centimes: collectee.toString(), tva_deductible_centimes: deductible.toString(), tva_a_payer_centimes: aPayer.toString(), tva_credit_centimes: credit.toString(), declaration_md: md };
}

export function detectErreursLiasse(args: {
  bilan_total_actif_centimes: string | bigint;
  bilan_total_passif_centimes: string | bigint;
  capitaux_propres_centimes: string | bigint;
  resultat_net_centimes: string | bigint;
  reserves_legales_centimes: string | bigint;
  capital_centimes: string | bigint;
}): { ok: boolean; erreurs: { code: string; severity: "warning" | "critical"; message: string }[]; conformite: boolean } {
  const erreurs: any[] = [];
  const ta = BigInt(args.bilan_total_actif_centimes);
  const tp = BigInt(args.bilan_total_passif_centimes);
  if (ta !== tp) erreurs.push({ code: "BILAN_NON_EQUILIBRE", severity: "critical", message: `Total actif (${ta}) != total passif (${tp})` });
  const cp = BigInt(args.capitaux_propres_centimes);
  const rn = BigInt(args.resultat_net_centimes);
  const rl = BigInt(args.reserves_legales_centimes);
  const cap = BigInt(args.capital_centimes);
  // Reserve legale doit etre >= 10% du capital (norme OHADA), max 20%
  if (rl < cap / 10n) erreurs.push({ code: "RESERVE_LEGALE_INSUFFISANTE", severity: "warning", message: "Reserve legale < 10% du capital — affecter 5% du resultat net" });
  if (cp < cap / 2n) erreurs.push({ code: "CAPITAUX_PROPRES_DEMI", severity: "critical", message: "Capitaux propres < 50% du capital — risque dissolution societe" });
  return { ok: true, erreurs, conformite: erreurs.filter(e => e.severity === "critical").length === 0 };
}
