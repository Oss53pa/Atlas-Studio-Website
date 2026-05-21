// Référentiel fiscal OHADA — 17 États membres.
//
// Rend « 17 pays OHADA » concret et consommable (console + apps). Miroir TS de
// la table `ohada_country_tax` (repli offline). Zone et devise sont des faits
// stables. Les taux TVA/IS sont recoupés sur PwC Worldwide Tax Summaries :
//   rates_verified: true  → recoupé, fiable
//   rates_verified: false → sources divergentes / récent, à confirmer localement
// Tous les taux restent éditables par l'admin depuis la console.

export type OhadaZone = "UEMOA" | "CEMAC" | "other";
export type OhadaCurrency = "XOF" | "XAF" | "KMF" | "CDF" | "GNF";

export interface OhadaCountry {
  country_code: string; // ISO 3166-1 alpha-2
  country_name: string;
  zone: OhadaZone;
  currency: OhadaCurrency;
  vat_standard_rate: number | null;
  corporate_tax_rate: number | null;
  tax_authority: string | null;
  rates_verified: boolean;
  notes?: string | null;
}

export const OHADA_COUNTRIES: OhadaCountry[] = [
  // UEMOA (XOF)
  { country_code: "BJ", country_name: "Bénin",              zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: true },
  { country_code: "BF", country_name: "Burkina Faso",       zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 27.5, tax_authority: "DGI",  rates_verified: true },
  { country_code: "CI", country_name: "Côte d'Ivoire",      zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 25,   tax_authority: "DGI",  rates_verified: true,  notes: "IS 30% pour télécoms/TIC ; IMF 0,5% du CA" },
  { country_code: "GW", country_name: "Guinée-Bissau",      zone: "UEMOA", currency: "XOF", vat_standard_rate: 19,    corporate_tax_rate: 25,   tax_authority: "DGCI", rates_verified: false, notes: "TVA introduite 2023 (Loi 4/2022) — taux à confirmer" },
  { country_code: "ML", country_name: "Mali",               zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: true },
  { country_code: "NE", country_name: "Niger",              zone: "UEMOA", currency: "XOF", vat_standard_rate: 19,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: true },
  { country_code: "SN", country_name: "Sénégal",            zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGID", rates_verified: true },
  { country_code: "TG", country_name: "Togo",               zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 27,   tax_authority: "OTR",  rates_verified: true },
  // CEMAC (XAF)
  { country_code: "CM", country_name: "Cameroun",           zone: "CEMAC", currency: "XAF", vat_standard_rate: 19.25, corporate_tax_rate: 33,   tax_authority: "DGI",  rates_verified: true,  notes: "TVA 19,25% (CAC inclus) ; IS 33% (CAC inclus)" },
  { country_code: "CF", country_name: "Centrafrique",       zone: "CEMAC", currency: "XAF", vat_standard_rate: 19,    corporate_tax_rate: 30,   tax_authority: "DGID", rates_verified: false, notes: "À confirmer" },
  { country_code: "TD", country_name: "Tchad",              zone: "CEMAC", currency: "XAF", vat_standard_rate: 18,    corporate_tax_rate: 35,   tax_authority: "DGI",  rates_verified: false, notes: "IS 35% (certaines sources indiquent 40% / secteur pétrolier)" },
  { country_code: "CG", country_name: "Congo (Brazzaville)", zone: "CEMAC", currency: "XAF", vat_standard_rate: 18.9,  corporate_tax_rate: 28,   tax_authority: "DGID", rates_verified: false, notes: "TVA 18,9% (surtaxe incluse) ; IS 28% — sources divergentes (30%)" },
  { country_code: "GQ", country_name: "Guinée équatoriale", zone: "CEMAC", currency: "XAF", vat_standard_rate: 15,    corporate_tax_rate: 35,   tax_authority: "DGI",  rates_verified: false, notes: "IS 35% (PwC) — une source indique 25%" },
  { country_code: "GA", country_name: "Gabon",              zone: "CEMAC", currency: "XAF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: true,  notes: "IS 35% pour pétrole/mines" },
  // Hors UEMOA/CEMAC
  { country_code: "KM", country_name: "Comores",            zone: "other", currency: "KMF", vat_standard_rate: null,  corporate_tax_rate: 35,   tax_authority: "AGID", rates_verified: true,  notes: "Pas de TVA standard ; IS 50% pour entreprises publiques > 500M KMF" },
  { country_code: "GN", country_name: "Guinée (Conakry)",   zone: "other", currency: "GNF", vat_standard_rate: 18,    corporate_tax_rate: 25,   tax_authority: "DGI",  rates_verified: true,  notes: "IS 30/35% pour mines & hydrocarbures" },
  { country_code: "CD", country_name: "RD Congo",           zone: "other", currency: "CDF", vat_standard_rate: 16,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: true },
];

export function getOhadaCountry(code: string): OhadaCountry | undefined {
  return OHADA_COUNTRIES.find((c) => c.country_code === code.toUpperCase());
}
