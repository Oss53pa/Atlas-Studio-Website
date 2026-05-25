import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Garde uniquement les vrais plans tarifaires d'un objet `pricing`, en
 * écartant les clés de configuration de facturation (overage, seuils, etc.)
 * qui ne doivent jamais s'afficher comme des prix (ex. CockpitJourney :
 * `entreprise_overage_starts_at: 5`).
 */
const PRICING_CONFIG_KEY = /_overage|_per_seat|_starts_at|overage|threshold/i;

export function planEntries(
  pricing: Record<string, number> | undefined | null,
): [string, number][] {
  return Object.entries(pricing ?? {}).filter(([key]) => !PRICING_CONFIG_KEY.test(key));
}
