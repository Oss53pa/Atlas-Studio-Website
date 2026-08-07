// Atlas Studio — Séparateur tissé.
//
// Une ligne horizontale fine dont la partie centrale (sur ~140px) est remplacée
// par un motif tissé : alternance de petits traits verticaux et de zigzags fins,
// rappelant les bordures de bandes de kente. Utilisé entre sections au lieu d'un
// simple border-t neutre.

interface Props {
  width?: number | string;
  color?: string;
  className?: string;
  /** Nombre de mailles dans la partie tissée (par défaut 9). */
  weaveCells?: number;
}

export function WovenDivider({
  width = "100%",
  color = "rgba(169,181,126,0.55)",
  className = "",
  weaveCells = 9,
}: Props) {
  const cellWidth = 14;
  const woveWidth = cellWidth * weaveCells;

  return (
    <div className={`flex items-center w-full ${className}`} style={{ width }} aria-hidden>
      {/* Trait gauche */}
      <div className="flex-1 h-px" style={{ background: color, opacity: 0.45 }} />

      {/* Bande tissée — SVG */}
      <svg
        width={woveWidth}
        height={14}
        viewBox={`0 0 ${woveWidth} 14`}
        fill="none"
        stroke={color}
        strokeWidth={0.9}
        className="atlas-ornament shrink-0 mx-3"
      >
        {/* lignes horizontales fines */}
        <line x1="0" y1="7" x2={woveWidth} y2="7" opacity="0.55" />
        {/* mailles : alternance trait vertical / zigzag */}
        {Array.from({ length: weaveCells }).map((_, i) => {
          const x = i * cellWidth + cellWidth / 2;
          if (i % 2 === 0) {
            // trait vertical
            return <line key={i} x1={x} y1="2" x2={x} y2="12" />;
          }
          // zigzag : deux pentes en V
          const off = cellWidth / 2 - 1;
          return (
            <path
              key={i}
              d={`M ${x - off} 4 L ${x} 10 L ${x + off} 4`}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {/* Trait droit */}
      <div className="flex-1 h-px" style={{ background: color, opacity: 0.45 }} />
    </div>
  );
}
