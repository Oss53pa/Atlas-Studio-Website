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

// ── Tarification par sièges (estimation côté client) ──
// Le prix réellement facturé est recalculé côté serveur (edge function).
// Ces helpers servent uniquement à l'affichage de l'estimation au checkout.
export interface SeatPlanConfig {
  mode: "forfait_seats" | "per_person" | "flat";
  included?: number;
  extra?: number;
  rate?: number;
  min?: number;
  max?: number | null;
}

export function seatBounds(
  cfg: SeatPlanConfig | undefined,
): { min: number; max: number; def: number } | null {
  if (!cfg || cfg.mode === "flat") return null;
  if (cfg.mode === "forfait_seats") {
    const inc = cfg.included ?? 1;
    return { min: inc, max: 999, def: inc };
  }
  if (cfg.mode === "per_person") {
    const min = cfg.min ?? 1;
    const max = cfg.max ?? 999;
    return { min, max, def: min };
  }
  return null;
}

export function computeSeatPrice(
  base: number,
  cfg: SeatPlanConfig | undefined,
  seats: number,
): number {
  if (!cfg || cfg.mode === "flat") return base;
  if (cfg.mode === "forfait_seats") {
    const inc = cfg.included ?? 1;
    const s = Math.max(inc, seats);
    return base + Math.max(0, s - inc) * (cfg.extra ?? 0);
  }
  if (cfg.mode === "per_person") {
    const min = cfg.min ?? 1;
    const max = cfg.max ?? 999;
    const s = Math.min(Math.max(seats, min), max);
    return (cfg.rate ?? base) * s;
  }
  return base;
}
