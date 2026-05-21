// Référentiel fiscal OHADA — 17 États membres.
//
// Rend « 17 pays OHADA » concret et consommable (console + apps). Miroir TS de
// la table `ohada_country_tax`. Zone et devise sont des faits stables ; les taux
// (TVA/IS) sont INDICATIFS — `rates_verified: false` tant qu'un expert local ne
// les a pas confirmés.

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
}

export const OHADA_COUNTRIES: OhadaCountry[] = [
  // UEMOA (XOF)
  { country_code: "BJ", country_name: "Bénin",              zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "BF", country_name: "Burkina Faso",       zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 27.5, tax_authority: "DGI",  rates_verified: false },
  { country_code: "CI", country_name: "Côte d'Ivoire",      zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 25,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "GW", country_name: "Guinée-Bissau",      zone: "UEMOA", currency: "XOF", vat_standard_rate: 19,    corporate_tax_rate: 25,   tax_authority: "DGCI", rates_verified: false },
  { country_code: "ML", country_name: "Mali",               zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "NE", country_name: "Niger",              zone: "UEMOA", currency: "XOF", vat_standard_rate: 19,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "SN", country_name: "Sénégal",            zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGID", rates_verified: false },
  { country_code: "TG", country_name: "Togo",               zone: "UEMOA", currency: "XOF", vat_standard_rate: 18,    corporate_tax_rate: 27,   tax_authority: "OTR",  rates_verified: false },
  // CEMAC (XAF)
  { country_code: "CM", country_name: "Cameroun",           zone: "CEMAC", currency: "XAF", vat_standard_rate: 19.25, corporate_tax_rate: 33,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "CF", country_name: "Centrafrique",       zone: "CEMAC", currency: "XAF", vat_standard_rate: 19,    corporate_tax_rate: 30,   tax_authority: "DGID", rates_verified: false },
  { country_code: "TD", country_name: "Tchad",              zone: "CEMAC", currency: "XAF", vat_standard_rate: 18,    corporate_tax_rate: 35,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "CG", country_name: "Congo (Brazzaville)", zone: "CEMAC", currency: "XAF", vat_standard_rate: 18.9,  corporate_tax_rate: 28,   tax_authority: "DGID", rates_verified: false },
  { country_code: "GQ", country_name: "Guinée équatoriale", zone: "CEMAC", currency: "XAF", vat_standard_rate: 15,    corporate_tax_rate: 35,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "GA", country_name: "Gabon",              zone: "CEMAC", currency: "XAF", vat_standard_rate: 18,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: false },
  // Hors UEMOA/CEMAC
  { country_code: "KM", country_name: "Comores",            zone: "other", currency: "KMF", vat_standard_rate: null,  corporate_tax_rate: 35,   tax_authority: "AGID", rates_verified: false },
  { country_code: "GN", country_name: "Guinée (Conakry)",   zone: "other", currency: "GNF", vat_standard_rate: 18,    corporate_tax_rate: 25,   tax_authority: "DGI",  rates_verified: false },
  { country_code: "CD", country_name: "RD Congo",           zone: "other", currency: "CDF", vat_standard_rate: 16,    corporate_tax_rate: 30,   tax_authority: "DGI",  rates_verified: false },
];

export function getOhadaCountry(code: string): OhadaCountry | undefined {
  return OHADA_COUNTRIES.find((c) => c.country_code === code.toUpperCase());
}
