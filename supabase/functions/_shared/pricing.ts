// Calcul de prix côté serveur (autoritaire). Ne jamais faire confiance au
// montant envoyé par le client : on recalcule à partir de apps.pricing +
// apps.seat_pricing pour le plan et le nombre de sièges demandés.

export interface SeatPlanConfig {
  mode: "forfait_seats" | "per_person" | "flat";
  included?: number;       // forfait_seats : sièges compris dans le forfait socle
  extra?: number;          // forfait_seats : prix par siège supplémentaire / mois
  rate?: number;           // per_person : prix par personne / mois
  min?: number;            // per_person : nb de sièges minimum du palier
  max?: number | null;     // per_person : nb de sièges max (null = illimité)
}

export interface PriceComputation {
  amount: number;
  seats: number;
}

export function computePlanAmount(
  pricing: Record<string, number> | null | undefined,
  seatPricing: Record<string, SeatPlanConfig> | null | undefined,
  plan: string,
  requestedSeats?: number,
): PriceComputation {
  const base = Number(pricing?.[plan] ?? 0);
  const cfg = seatPricing?.[plan];

  if (!cfg || cfg.mode === "flat") {
    return { amount: base, seats: 1 };
  }

  if (cfg.mode === "forfait_seats") {
    const included = cfg.included ?? 1;
    const seats = Math.max(included, Math.floor(Number(requestedSeats) || included));
    const extra = Math.max(0, seats - included) * (cfg.extra ?? 0);
    return { amount: base + extra, seats };
  }

  if (cfg.mode === "per_person") {
    const min = cfg.min ?? 1;
    const max = cfg.max ?? Number.MAX_SAFE_INTEGER;
    let seats = Math.floor(Number(requestedSeats) || min);
    if (seats < min) seats = min;
    if (seats > max) seats = max;
    const rate = cfg.rate ?? base;
    return { amount: rate * seats, seats };
  }

  return { amount: base, seats: 1 };
}
