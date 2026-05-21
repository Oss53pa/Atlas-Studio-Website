import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { OHADA_COUNTRIES, type OhadaCountry } from "../config/ohada";

/**
 * useOhadaCountries — référentiel fiscal OHADA depuis la table `ohada_country_tax`.
 * Repli sur le référentiel statique (config/ohada.ts) si la base est injoignable
 * (mode offline/démo), pour que « 17 pays » reste affichable partout.
 */
export function useOhadaCountries() {
  const [countries, setCountries] = useState<OhadaCountry[]>(OHADA_COUNTRIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("ohada_country_tax")
          .select(
            "country_code, country_name, zone, currency, vat_standard_rate, corporate_tax_rate, tax_authority, rates_verified",
          )
          .order("country_name");
        if (error) throw error;
        if (!cancelled && data && data.length > 0) {
          setCountries(data as unknown as OhadaCountry[]);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { countries, loading, error };
}
