// Atlas Studio — Texture de fond façon bogolan / mudcloth.
//
// Grille croisée irrégulière où certaines cellules sont remplies. Très subtile
// (opacité basse), utilisée comme calque de fond pour donner une texture
// matière sans devenir lourde. Pas un imprimé : une structure de fond.

interface Props {
  className?: string;
  opacity?: number;
  cellSize?: number;
  color?: string;
}

export function BogolanWeave({
  className = "absolute inset-0",
  opacity = 0.06,
  cellSize = 22,
  color = "#A9B57E",
}: Props) {
  const id = "bogolan-weave";
  // Petit pattern crosshatch + dots fillés en quinconce.
  return (
    <div className={`${className} atlas-ornament`} style={{ opacity }} aria-hidden>
      <svg width="100%" height="100%" viewBox={`0 0 ${cellSize * 4} ${cellSize * 4}`} preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id={id} x="0" y="0" width={cellSize * 2} height={cellSize * 2} patternUnits="userSpaceOnUse">
            {/* hachures diagonales fines */}
            <line x1="0" y1="0" x2={cellSize * 2} y2={cellSize * 2} stroke={color} strokeWidth="0.6" opacity="0.5" />
            <line x1={cellSize * 2} y1="0" x2="0" y2={cellSize * 2} stroke={color} strokeWidth="0.6" opacity="0.5" />
            {/* repères centraux : petits carrés pleins en quinconce */}
            <rect x={cellSize * 0.5 - 1} y={cellSize * 0.5 - 1} width="2" height="2" fill={color} opacity="0.9" />
            <rect x={cellSize * 1.5 - 1} y={cellSize * 1.5 - 1} width="2" height="2" fill={color} opacity="0.9" />
            {/* trame horizontale ponctuelle */}
            <line x1="0" y1={cellSize} x2={cellSize * 2} y2={cellSize} stroke={color} strokeWidth="0.4" opacity="0.3" />
            <line x1={cellSize} y1="0"  x2={cellSize} y2={cellSize * 2} stroke={color} strokeWidth="0.4" opacity="0.3" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
