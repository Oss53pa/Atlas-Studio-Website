// Signature visuelle Atlas Studio — constellation des LOGICIELS Atlas Studio.
// Chaque nœud = une app du catalogue (Supabase `apps`) : badge avec SON icône,
// SA couleur, SON nom, relié à ses voisines par des liens animés.
// Survol = mise en avant + tagline réelle. SVG (halo/liens) + overlay HTML.

import { useMemo, useState } from "react";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { appIcon } from "../../lib/appIcons";

// Positions (0–100), bien espacées pour les badges + noms.
const STARS: [number, number][] = [
  [26, 18], [56, 14], [82, 30],
  [16, 46], [46, 44], [74, 50],
  [30, 74], [58, 70], [84, 74],
  [44, 92], [68, 92], [14, 74],
];

// Repli d'affichage (vrais noms uniquement, aucune description inventée).
const FALLBACK = [
  { id: "atlas-fa", name: "Atlas F&A" },
  { id: "cockpit-fa", name: "Cockpit F&A" },
  { id: "cockpit-journey", name: "CockpitJourney" },
  { id: "tablesmart", name: "TableSmart" },
  { id: "advist", name: "Advist" },
  { id: "liasspilot", name: "Liass'Pilot" },
  { id: "wedo", name: "WeDo" },
];

export function AppsConstellation({ className = "" }: { className?: string }) {
  const { appList } = useAppCatalog();
  const [hover, setHover] = useState<string | null>(null);

  const points = useMemo(() => {
    const src = (appList && appList.length ? appList : FALLBACK).slice(0, STARS.length);
    return src.map((a: any, i) => ({
      id: a.id ?? String(i),
      name: a.name ?? "App",
      tagline: a.tagline ?? a.description ?? "",
      color: a.color || "var(--c-accent)",
      Icon: appIcon(a.icon),
      x: STARS[i][0],
      y: STARS[i][1],
    }));
  }, [appList]);

  const links = useMemo(() => {
    const out: { a: string; b: string; x1: number; y1: number; x2: number; y2: number }[] = [];
    const seen = new Set<string>();
    for (const p of points) {
      let best: typeof p | null = null, bestD = Infinity;
      for (const q of points) {
        if (q.id === p.id) continue;
        const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
        if (d < bestD) { bestD = d; best = q; }
      }
      if (best) {
        const key = [p.id, best.id].sort().join("|");
        if (!seen.has(key)) { seen.add(key); out.push({ a: p.id, b: best.id, x1: p.x, y1: p.y, x2: best.x, y2: best.y }); }
      }
    }
    return out;
  }, [points]);

  const hovered = points.find((p) => p.id === hover);

  return (
    <div className={`relative aspect-square ${className}`} onMouseLeave={() => setHover(null)}>
      {/* SVG — halo + liens */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
        <defs>
          <radialGradient id="apps-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="rgba(152,104,20,0.12)" />
            <stop offset="60%" stopColor="rgba(152,104,20,0.03)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <circle cx="50" cy="50" r="48" fill="url(#apps-glow)" />
        <g stroke="rgba(26,20,16,0.05)" strokeWidth="0.15">
          {[25, 50, 75].map((v) => <line key={`h${v}`} x1="6" y1={v} x2="94" y2={v} />)}
          {[25, 50, 75].map((v) => <line key={`v${v}`} x1={v} y1="6" x2={v} y2="94" />)}
        </g>
        <g>
          {links.map((l, i) => {
            const on = hover === l.a || hover === l.b;
            return (
              <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke="var(--c-accent)"
                strokeOpacity={on ? 0.6 : 0.22}
                strokeWidth={on ? 0.45 : 0.3}
                strokeDasharray="1.4 1.6"
                className="apps-link" />
            );
          })}
        </g>
      </svg>

      {/* Overlay HTML — badges (icône + couleur) + noms */}
      <div className="absolute inset-0">
        {points.map((p, idx) => {
          const on = hover === p.id;
          const dim = hover && !on;
          const { Icon } = p;
          return (
            <button
              key={p.id}
              onMouseEnter={() => setHover(p.id)}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center focus:outline-none transition-opacity"
              style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: dim ? 0.45 : 1, zIndex: on ? 20 : 10 }}
            >
              <span
                className="relative flex items-center justify-center rounded-full border transition-all duration-300 apps-node"
                style={{
                  width: on ? "44px" : "38px",
                  height: on ? "44px" : "38px",
                  borderColor: on ? p.color : "var(--c-border)",
                  background: "var(--c-surface)",
                  boxShadow: on
                    ? `0 0 0 4px color-mix(in srgb, ${p.color} 22%, transparent), 0 8px 22px -8px rgba(0,0,0,0.35)`
                    : "0 4px 12px -8px rgba(0,0,0,0.3)",
                  animationDelay: `${idx * 0.25}s`,
                }}
              >
                <Icon size={on ? 20 : 17} strokeWidth={1.7} style={{ color: p.color }} />
              </span>
              <span
                className={`mt-1.5 whitespace-nowrap rounded-full px-2 py-[2px] text-[10px] md:text-[11px] font-semibold leading-none transition-all
                  ${on ? "text-p-text" : "text-p-text-2"}`}
              >
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pied — tagline réelle de l'app survolée */}
      <div className="absolute left-0 -bottom-1 right-0 px-4 pointer-events-none text-center">
        <div className="font-mono text-[10px] md:text-[11px] tracking-wide min-h-[16px]">
          {hovered ? (
            <span>
              <span className="text-p-accent font-semibold">{hovered.name}</span>
              {hovered.tagline && <span className="text-neutral-body"> — {hovered.tagline}</span>}
            </span>
          ) : (
            <span className="uppercase tracking-[0.2em] text-neutral-muted">{points.length} logiciels · survolez</span>
          )}
        </div>
      </div>
    </div>
  );
}
