// Atlas Studio — Cadre ornemental signature.
//
// Quatre coins SVG inspirés des poinçons / motifs carvés. Remplace les
// classiques "border-t border-l" des coins de containers (constellation,
// blocs hero) par une marque de fabrique reconnaissable.

import type { CSSProperties, ReactNode } from "react";

interface Props {
  children?: ReactNode;
  size?: number;
  color?: string;
  className?: string;
  inset?: number;
  style?: CSSProperties;
}

function Corner({ size, color, rotate }: { size: number; color: string; rotate: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke={color}
      strokeWidth={1.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="atlas-ornament"
      style={{ transform: `rotate(${rotate}deg)`, transformOrigin: "center" }}
      aria-hidden
    >
      {/* deux lignes principales formant l'angle */}
      <line x1="2" y1="2" x2="2"  y2="14" />
      <line x1="2" y1="2" x2="14" y2="2"  />
      {/* trait diagonal court (échancrure intérieure) */}
      <line x1="6"  y1="6" x2="11" y2="6"  opacity="0.7" />
      <line x1="6"  y1="6" x2="6"  y2="11" opacity="0.7" />
      {/* point central — accroche visuelle */}
      <circle cx="2" cy="2" r="0.9" fill={color} />
    </svg>
  );
}

/**
 * Wrapper qui pose 4 coins ornementaux sur ses bords. Utilise position
 * absolute, donc son parent doit être `position: relative`.
 */
export function OrnamentalFrame({
  children,
  size = 22,
  color = "rgba(169,181,126,0.55)",
  className = "",
  inset = -10,
  style,
}: Props) {
  const offsets = { top: inset, right: inset, bottom: inset, left: inset } as const;
  return (
    <>
      <div className={`pointer-events-none absolute ${className}`} style={{ top: offsets.top, left: offsets.left, ...style }}>
        <Corner size={size} color={color} rotate={0} />
      </div>
      <div className="pointer-events-none absolute" style={{ top: offsets.top, right: offsets.right }}>
        <Corner size={size} color={color} rotate={90} />
      </div>
      <div className="pointer-events-none absolute" style={{ bottom: offsets.bottom, right: offsets.right }}>
        <Corner size={size} color={color} rotate={180} />
      </div>
      <div className="pointer-events-none absolute" style={{ bottom: offsets.bottom, left: offsets.left }}>
        <Corner size={size} color={color} rotate={270} />
      </div>
      {children}
    </>
  );
}
