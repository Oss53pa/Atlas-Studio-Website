// Signature visuelle Atlas Studio — constellation des 17 États membres OHADA
// projetés depuis leurs coordonnées géographiques réelles, en lien direct
// avec le référentiel fiscal (OHADA_COUNTRIES). Pas une carte décorative :
// chaque point est un pays vivant du référentiel, survolable, étiqueté
// avec sa devise et son statut de vérification fiscale.
//
// Aucune lib externe : SVG + CSS pur. Performant, autonome.

import { useMemo, useState } from "react";
import { OHADA_COUNTRIES } from "../../config/ohada";

// Bbox approximative couvrant l'aire OHADA :
//   lon ∈ [-16, 44], lat ∈ [-13, 18]
const LON_MIN = -16, LON_MAX = 44;
const LAT_MIN = -13, LAT_MAX = 18;

const COORDS: Record<string, [number, number]> = {
  // [longitude, latitude] approximatifs (capitales / centroïdes)
  SN: [-14.5, 14.7], ML: [-3.5, 17.0], BF: [-1.5, 12.5], NE: [8.0, 17.0],
  CI: [-5.0, 7.5],   TG: [1.2, 8.0],   BJ: [2.3, 9.3],   GW: [-15.5, 11.8],
  GN: [-10.5, 10.0], CM: [12.4, 5.5],  CF: [21.0, 6.6],  TD: [18.7, 15.4],
  CG: [15.3, -1.0],  GA: [11.6, -0.7], GQ: [10.5, 1.7],  CD: [23.6, -4.3],
  KM: [43.7, -11.7],
};

const ZONE_COLOR: Record<string, string> = {
  UEMOA: "var(--c-accent)", // kaki (couleur de marque Atlas Studio)
  CEMAC: "var(--c-accent)", // kaki clair
  other: "#C8A672", // champagne
};

interface Props {
  className?: string;
  /** Repli si le composant est rendu hors page (ex : preview Storybook) */
  countries?: typeof OHADA_COUNTRIES;
}

export function AtlasConstellation({ className = "", countries = OHADA_COUNTRIES }: Props) {
  const [hover, setHover] = useState<string | null>(null);

  const points = useMemo(() => {
    return countries
      .map((c) => {
        const ll = COORDS[c.country_code];
        if (!ll) return null;
        const [lon, lat] = ll;
        // Projection linéaire vers viewBox 100×100, marge interne 8.
        const x = 8 + ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * 84;
        const y = 8 + (1 - (lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * 84;
        return { ...c, x, y };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);
  }, [countries]);

  // Liens visuels intra-zone (UEMOA / CEMAC) — minimum spanning tree visuel
  // simplifié : on relie chaque pays à son voisin le plus proche dans sa zone.
  const links = useMemo(() => {
    const out: { x1: number; y1: number; x2: number; y2: number; zone: string }[] = [];
    for (const zone of ["UEMOA", "CEMAC"] as const) {
      const zonePts = points.filter((p) => p.zone === zone);
      for (const p of zonePts) {
        let best: typeof p | null = null;
        let bestD = Infinity;
        for (const q of zonePts) {
          if (q.country_code === p.country_code) continue;
          const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
          if (d < bestD) { bestD = d; best = q; }
        }
        if (best) out.push({ x1: p.x, y1: p.y, x2: best.x, y2: best.y, zone });
      }
    }
    return out;
  }, [points]);

  const hovered = hover ? points.find((p) => p.country_code === hover) : null;

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label="Constellation OHADA — 17 États membres">
        <defs>
          <radialGradient id="ohada-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%"  stopColor="rgba(169,181,126,0.18)" />
            <stop offset="60%" stopColor="rgba(169,181,126,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="ohada-soft" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
        </defs>

        {/* halo de fond */}
        <circle cx="50" cy="50" r="48" fill="url(#ohada-glow)" />

        {/* grille fine */}
        <g stroke="rgba(255,255,255,0.04)" strokeWidth="0.15">
          {[20, 40, 60, 80].map((v) => <line key={`h${v}`} x1="6" y1={v} x2="94" y2={v} />)}
          {[20, 40, 60, 80].map((v) => <line key={`v${v}`} x1={v} y1="6" x2={v} y2="94" />)}
        </g>

        {/* liens intra-zone */}
        <g>
          {links.map((l, i) => (
            <line key={i}
              x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
              stroke={ZONE_COLOR[l.zone]} strokeOpacity="0.18" strokeWidth="0.25"
            />
          ))}
        </g>

        {/* points pays */}
        <g>
          {points.map((p, idx) => {
            const isHover = hover === p.country_code;
            const color = ZONE_COLOR[p.zone];
            return (
              <g key={p.country_code}
                 onMouseEnter={() => setHover(p.country_code)}
                 onMouseLeave={() => setHover(null)}
                 style={{ cursor: "pointer" }}>
                {/* zone d'interaction généreuse */}
                <circle cx={p.x} cy={p.y} r="3.5" fill="transparent" />
                {/* halo */}
                <circle cx={p.x} cy={p.y} r={isHover ? 3 : 2}
                  fill={color} fillOpacity={isHover ? 0.25 : 0.15}
                  filter="url(#ohada-soft)"
                  className="ohada-pulse" style={{ animationDelay: `${idx * 0.18}s` }}
                />
                {/* point dur */}
                <circle cx={p.x} cy={p.y} r={isHover ? 1.1 : 0.9}
                  fill={color} fillOpacity={p.rates_verified ? 1 : 0.55}
                  stroke={isHover ? color : "transparent"} strokeWidth="0.4"
                />
                {/* étiquette code pays — toujours visible, discrète */}
                <text x={p.x} y={p.y - 2.3}
                  textAnchor="middle"
                  fontSize="2"
                  fontFamily="JetBrains Mono, monospace"
                  fill="rgba(245,245,245,0.55)">
                  {p.country_code}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Panneau info — révèle le pays survolé sans décaler la mise en page */}
      <div className="absolute left-0 bottom-0 right-0 px-4 pb-3 pt-6 pointer-events-none
                      bg-gradient-to-t from-black/40 via-black/10 to-transparent">
        {hovered ? (
          <div className="font-mono text-[11px] tracking-wide text-neutral-light flex items-baseline gap-2 flex-wrap">
            <span className="text-p-accent">{hovered.country_code}</span>
            <span className="text-neutral-light/90">{hovered.country_name}</span>
            <span className="text-neutral-light/40">·</span>
            <span className="text-neutral-light/60">{hovered.zone}</span>
            <span className="text-neutral-light/40">·</span>
            <span className="text-neutral-light/60">{hovered.currency}</span>
            {hovered.vat_standard_rate !== null && (
              <>
                <span className="text-neutral-light/40">·</span>
                <span className="text-neutral-light/80">TVA {hovered.vat_standard_rate}%</span>
              </>
            )}
            {hovered.corporate_tax_rate !== null && (
              <>
                <span className="text-neutral-light/40">·</span>
                <span className="text-neutral-light/80">IS {hovered.corporate_tax_rate}%</span>
              </>
            )}
            <span className="ml-auto text-[9px] uppercase tracking-[0.2em] text-neutral-light/40">
              {hovered.rates_verified ? "vérifié" : "à confirmer"}
            </span>
          </div>
        ) : (
          <div className="font-mono text-[10px] tracking-[0.2em] uppercase text-neutral-light/35">
            17 états · UEMOA · CEMAC · survolez un point
          </div>
        )}
      </div>
    </div>
  );
}
