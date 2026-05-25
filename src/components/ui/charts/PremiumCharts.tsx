import { useId, useState, type ReactNode } from "react";

/* ============================================================
   Premium chart toolkit — Olive Noir
   Soft, well-labelled, breathing-room charts with tooltips.
   Theme-aware (works on light cream + dark charcoal).
   ============================================================ */

const OLIVE = "#A9B57E";
const OLIVE_LIGHT = "#C2CC92";
const OLIVE_DEEP = "#74804F";

const fmtFr = (n: number) => n.toLocaleString("fr-FR");

interface Point {
  label: string;
  value: number;
}

/* ---- Smooth Catmull-Rom → cubic Bézier path ---- */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]},${pts[0][1]}` : "";
  const d = [`M ${pts[0][0]},${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d.push(`C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`);
  }
  return d.join(" ");
}

function Tooltip({ children, x }: { children: ReactNode; x: string }) {
  return (
    <div
      className="absolute -top-2 -translate-y-full -translate-x-1/2 z-20 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap pointer-events-none"
      style={{
        left: x,
        background: "#0f0f11",
        color: "#ECEAE3",
        border: "1px solid rgba(169,181,126,0.35)",
        boxShadow: "0 10px 28px -10px rgba(0,0,0,0.75)",
      }}
    >
      {children}
    </div>
  );
}

/* ============================================================
   BAR CHART — gradient fill, rounded ends, gridlines, tooltip
   ============================================================ */
export function PremiumBarChart({
  data,
  height = 180,
  accent = OLIVE,
  valueFormatter = fmtFr,
  unit,
}: {
  data: Point[];
  height?: number;
  accent?: string;
  valueFormatter?: (n: number) => string;
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const chartH = height - 26;
  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="relative w-full select-none" style={{ height }}>
      {/* gridlines */}
      <div className="absolute left-0 right-0" style={{ top: 0, height: chartH }}>
        {grid.map((g, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-black/[0.06] dark:border-white/[0.05]"
            style={{ top: `${g * 100}%` }}
          />
        ))}
      </div>

      {/* bars */}
      <div className="absolute left-0 right-0 flex items-end gap-2.5" style={{ top: 0, height: chartH }}>
        {data.map((d, i) => {
          const pct = Math.max((d.value / max) * 100, 1.5);
          const active = hover === i;
          return (
            <div
              key={d.label + i}
              className="relative flex-1 h-full flex items-end"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              <div
                className="w-full rounded-t-[7px] transition-all duration-300 ease-out"
                style={{
                  height: `${pct}%`,
                  background: `linear-gradient(180deg, ${accent} 0%, ${accent} 45%, ${accent}c0 100%)`,
                  opacity: hover === null || active ? 1 : 0.4,
                  boxShadow: active
                    ? `inset 0 1px 0 rgba(255,255,255,0.4), 0 0 0 1px ${accent}66, 0 8px 20px -8px ${accent}`
                    : "inset 0 1px 0 rgba(255,255,255,0.25)",
                }}
              />
              {active && (
                <Tooltip x="50%">
                  {valueFormatter(d.value)}
                  {unit ? ` ${unit}` : ""}
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>

      {/* x labels */}
      <div className="absolute left-0 right-0 bottom-0 flex gap-2.5" style={{ height: 22 }}>
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] capitalize truncate transition-colors ${
              hover === i ? "text-gold dark:text-admin-accent font-semibold" : "text-neutral-muted dark:text-admin-muted"
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   AREA CHART — smooth line + gradient fill + hover crosshair
   ============================================================ */
export function PremiumAreaChart({
  data,
  height = 170,
  accent = OLIVE,
  valueFormatter = fmtFr,
  unit,
}: {
  data: Point[];
  height?: number;
  accent?: string;
  valueFormatter?: (n: number) => string;
  unit?: string;
}) {
  const rawId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;

  const padTop = 10;
  const padBottom = 8;
  const usable = 100 - padTop - padBottom;

  const xs = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const ys = (v: number) => padTop + (1 - (v - min) / span) * usable;

  const pts: [number, number][] = data.map((d, i) => [xs(i), ys(d.value)]);
  const linePath = smoothPath(pts);
  const areaPath = pts.length
    ? `${linePath} L ${xs(n - 1)},${100} L ${xs(0)},${100} Z`
    : "";

  return (
    <div className="relative w-full select-none" style={{ height }}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full"
        style={{ height: height - 22 }}
      >
        <defs>
          <linearGradient id={`area-${rawId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.34" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1="0"
            x2="100"
            y1={g * 100}
            y2={g * 100}
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-black/[0.06] dark:text-white/[0.05]"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {areaPath && <path d={areaPath} fill={`url(#area-${rawId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={accent}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {/* hover columns + dot */}
      <div className="absolute left-0 right-0 flex" style={{ top: 0, height: height - 22 }}>
        {data.map((_d, i) => (
          <div
            key={i}
            className="flex-1 h-full"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        ))}
      </div>
      {hover !== null && (
        <>
          <div
            className="absolute top-0 w-px bg-gold/30 dark:bg-admin-accent/30 pointer-events-none"
            style={{ left: `${xs(hover)}%`, height: height - 22 }}
          />
          <div
            className="absolute w-2.5 h-2.5 rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${xs(hover)}%`,
              top: `${(ys(data[hover].value) / 100) * (height - 22)}px`,
              background: accent,
              boxShadow: `0 0 0 3px ${accent}40`,
            }}
          />
          <Tooltip x={`${xs(hover)}%`}>
            {valueFormatter(data[hover].value)}
            {unit ? ` ${unit}` : ""}
          </Tooltip>
        </>
      )}

      {/* x labels */}
      <div className="absolute left-0 right-0 bottom-0 flex" style={{ height: 18 }}>
        {data.map((d, i) => (
          <div
            key={i}
            className={`flex-1 text-center text-[10px] capitalize truncate ${
              hover === i ? "text-gold dark:text-admin-accent font-semibold" : "text-neutral-muted dark:text-admin-muted"
            }`}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   RADIAL GAUGE — donut with rounded cap, track, center label
   ============================================================ */
export function RadialGauge({
  value,
  max = 100,
  size = 132,
  thickness = 12,
  accent = OLIVE,
  label,
  display,
}: {
  value: number;
  max?: number;
  size?: number;
  thickness?: number;
  accent?: string;
  label?: string;
  display?: string;
}) {
  const rawId = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, value / (max || 1)));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const center = size / 2;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={`gauge-${rawId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={OLIVE_LIGHT} />
            <stop offset="60%" stopColor={accent} />
            <stop offset="100%" stopColor={OLIVE_DEEP} />
          </linearGradient>
        </defs>
        {/* track */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-black/[0.07] dark:text-white/[0.06]"
        />
        {/* value arc */}
        <circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={`url(#gauge-${rawId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-mono font-semibold text-gold dark:text-admin-accent leading-none">
          {display ?? `${Math.round(pct * 100)}%`}
        </span>
        {label && <span className="text-[10px] text-neutral-muted dark:text-admin-muted mt-1">{label}</span>}
      </div>
    </div>
  );
}
