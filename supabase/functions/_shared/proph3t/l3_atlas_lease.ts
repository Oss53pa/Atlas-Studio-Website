// L3 : ATLAS-LEASE (Leasing / Credit-bail / Location)
import { formatMoneyFcfa } from "./calculators.ts";

export function computeRentLease(args: {
  valeur_bien_centimes: string | bigint;
  duree_mois: number;
  taux_annuel_pct: number;
  valeur_residuelle_pct: number;
  type: "operationnel" | "financier";
}): { ok: boolean; loyer_mensuel_centimes: string; loyer_formatted: string; total_loyers_centimes: string; valeur_residuelle_centimes: string; cout_total_centimes: string; type_lease: string } {
  const valeur = Number(BigInt(args.valeur_bien_centimes));
  const tauxMensuel = args.taux_annuel_pct / 12 / 100;
  const vrCentimes = (BigInt(args.valeur_bien_centimes) * BigInt(Math.round(args.valeur_residuelle_pct * 100))) / 10000n;
  const vr = Number(vrCentimes);
  // Formule loyer leasing : (V - VR / (1+r)^n) × r / (1 - (1+r)^-n)
  const facteur = (1 - Math.pow(1 + tauxMensuel, -args.duree_mois)) / tauxMensuel;
  const loyer = ((valeur - vr / Math.pow(1 + tauxMensuel, args.duree_mois)) / facteur);
  const loyerCent = BigInt(Math.round(loyer));
  const totalLoyers = loyerCent * BigInt(args.duree_mois);
  return {
    ok: true,
    loyer_mensuel_centimes: loyerCent.toString(),
    loyer_formatted: formatMoneyFcfa(loyerCent),
    total_loyers_centimes: totalLoyers.toString(),
    valeur_residuelle_centimes: vrCentimes.toString(),
    cout_total_centimes: (totalLoyers + vrCentimes).toString(),
    type_lease: args.type,
  };
}

export function classifyLeaseType(args: {
  duree_lease_mois: number;
  duree_vie_economique_mois: number;
  vp_loyers_centimes: string | bigint;
  juste_valeur_centimes: string | bigint;
  transfert_propriete: boolean;
  option_achat_avantageuse: boolean;
}): { ok: boolean; classification: "financier" | "operationnel"; criteres_remplis: string[]; comptabilisation: string } {
  const criteres: string[] = [];
  if (args.transfert_propriete) criteres.push("Transfert de propriete a la fin");
  if (args.option_achat_avantageuse) criteres.push("Option d'achat avantageuse");
  if (args.duree_lease_mois >= 0.75 * args.duree_vie_economique_mois) criteres.push(`Duree (${args.duree_lease_mois}m) >= 75% vie economique`);
  const vp = Number(BigInt(args.vp_loyers_centimes));
  const jv = Number(BigInt(args.juste_valeur_centimes));
  if (jv > 0 && vp / jv >= 0.9) criteres.push("VP loyers >= 90% juste valeur");
  const classif: "financier" | "operationnel" = criteres.length > 0 ? "financier" : "operationnel";
  const compta = classif === "financier"
    ? "Activer le bien (immobilisation) + dette de leasing au passif. IFRS 16 / SYSCOHADA traite tous les leases comme financiers."
    : "Charges de loyer en compte 6132 (locations).";
  return { ok: true, classification: classif, criteres_remplis: criteres, comptabilisation: compta };
}

export function generateContratLease(args: {
  bailleur: string;
  preneur: string;
  bien_designation: string;
  loyer_mensuel_centimes: string | bigint;
  duree_mois: number;
  date_debut: string;
  vr_pct?: number;
}): { ok: boolean; contrat_markdown: string; numero_contrat: string } {
  const num = `LEASE-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
  const md = `# Contrat de Credit-Bail Mobilier

**Numero :** ${num}

## Parties
- **Bailleur (credit-bailleur) :** ${args.bailleur}
- **Preneur (credit-preneur) :** ${args.preneur}

## Objet
Le bailleur donne en location au preneur le bien suivant : **${args.bien_designation}**

## Conditions financieres
- **Loyer mensuel :** ${formatMoneyFcfa(BigInt(args.loyer_mensuel_centimes))}
- **Duree :** ${args.duree_mois} mois
- **Date debut :** ${args.date_debut}
${args.vr_pct ? `- **Option d'achat (Valeur residuelle) :** ${args.vr_pct}% de la valeur d'origine en fin de contrat` : ""}

## Obligations preneur
- Payer le loyer mensuel a date d'echeance
- Maintenir le bien en bon etat
- Souscrire assurance tous risques

## Resiliation
- En cas d'impaye superieur a 3 mois, resiliation de plein droit
- Reprise du bien sans procedure additionnelle

---
*Conforme AUSCGIE OHADA + Code OHADA des transports le cas echeant.*
`;
  return { ok: true, contrat_markdown: md, numero_contrat: num };
}

export function detectImpaesLease(args: {
  contrats: { id: string; preneur: string; loyer_mensuel_centimes: string | bigint; mois_impayes: number; encours_total_centimes: string | bigint }[];
}): { ok: boolean; total_impayes_centimes: string; contrats_critiques: { id: string; preneur: string; mois_impayes: number; action: string }[]; provision_recommandee_centimes: string } {
  let total = 0n;
  let provision = 0n;
  const critiques: any[] = [];
  for (const c of args.contrats) {
    if (c.mois_impayes > 0) {
      const impaye = BigInt(c.loyer_mensuel_centimes) * BigInt(c.mois_impayes);
      total += impaye;
      let action = "Relance amiable";
      if (c.mois_impayes >= 3) { action = "Mise en demeure + reprise du bien"; provision += BigInt(c.encours_total_centimes); }
      else if (c.mois_impayes >= 2) { action = "Mise en demeure formelle"; provision += impaye; }
      critiques.push({ id: c.id, preneur: c.preneur, mois_impayes: c.mois_impayes, action });
    }
  }
  return { ok: true, total_impayes_centimes: total.toString(), contrats_critiques: critiques, provision_recommandee_centimes: provision.toString() };
}

export function computeTaxavantagesLease(args: {
  loyers_annuels_centimes: string | bigint;
  taux_is_pct: number;
  taux_amortissement_classique_pct: number;
  valeur_bien_centimes: string | bigint;
}): { ok: boolean; economie_fiscale_lease_centimes: string; economie_fiscale_amortissement_centimes: string; difference_centimes: string; recommendation: string } {
  const loyers = BigInt(args.loyers_annuels_centimes);
  const tauxIs = BigInt(Math.round(args.taux_is_pct * 100));
  const eF1 = (loyers * tauxIs) / 10000n;  // economie fiscale leasing
  const valeur = BigInt(args.valeur_bien_centimes);
  const tauxAm = BigInt(Math.round(args.taux_amortissement_classique_pct * 100));
  const dotation = (valeur * tauxAm) / 10000n;
  const eF2 = (dotation * tauxIs) / 10000n;  // economie via amortissement
  const diff = eF1 - eF2;
  const reco = diff > 0n ? "Leasing offre meilleure deduction fiscale annuelle" : "Achat + amortissement offre meilleure deduction";
  return { ok: true, economie_fiscale_lease_centimes: eF1.toString(), economie_fiscale_amortissement_centimes: eF2.toString(), difference_centimes: diff.toString(), recommendation: reco };
}
