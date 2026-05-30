// Atlas Studio — Bande verticale "kente".
//
// Une colonne étroite composée de blocs géométriques empilés, chacun avec un
// motif différent (cross, diamond, double-bar, dots, zigzag). Inspirée des
// bandes tissées kente sans en copier les couleurs. Utilisée comme accent
// vertical sur le bord d'une section ou comme repère décoratif.

interface Props {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function KenteStripe({
  width = 30,
  height = 240,
  color = "rgba(169,181,126,0.7)",
  className = "",
}: Props) {
  const cells = 6;
  const cellH = height / cells;
  // 6 motifs cycliques : 1 cross, 2 diamond, 3 double-bar, 4 dots, 5 chevron, 6 single-bar
  const motifs: Array<(cx: number, cy: number) => React.ReactNode> = [
    // 1. Cross
    (cx, cy) => (
      <g key="cross">
        <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} />
        <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} />
      </g>
    ),
    // 2. Diamond
    (cx, cy) => (
      <path
        key="diamond"
        d={`M ${cx} ${cy - 6} L ${cx + 5} ${cy} L ${cx} ${cy + 6} L ${cx - 5} ${cy} Z`}
        fill="none"
      />
    ),
    // 3. Double bar
    (cx, cy) => (
      <g key="dbar">
        <line x1={cx - 6} y1={cy - 3} x2={cx + 6} y2={cy - 3} />
        <line x1={cx - 6} y1={cy + 3} x2={cx + 6} y2={cy + 3} />
      </g>
    ),
    // 4. Dots
    (cx, cy) => (
      <g key="dots" fill={color}>
        <circle cx={cx - 4} cy={cy} r="1" />
        <circle cx={cx}     cy={cy} r="1" />
        <circle cx={cx + 4} cy={cy} r="1" />
      </g>
    ),
    // 5. Chevron
    (cx, cy) => (
      <path key="chev" d={`M ${cx - 6} ${cy + 3} L ${cx} ${cy - 3} L ${cx + 6} ${cy + 3}`} fill="none" />
    ),
    // 6. Single bar
    (cx, cy) => (
      <line key="sbar" x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} />
    ),
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      stroke={color}
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`atlas-ornament ${className}`}
      aria-hidden
    >
      {Array.from({ length: cells }).map((_, i) => {
        const y0 = i * cellH;
        const cy = y0 + cellH / 2;
        const cx = width / 2;
        return (
          <g key={i}>
            {/* cadre extérieur */}
            <rect x="2" y={y0 + 2} width={width - 4} height={cellH - 4} fill="none" strokeOpacity="0.55" />
            {/* motif */}
            {motifs[i % motifs.length](cx, cy)}
          </g>
        );
      })}
    </svg>
  );
}
