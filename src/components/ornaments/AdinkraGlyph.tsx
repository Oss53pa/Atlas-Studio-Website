// Atlas Studio — Glyphes signature (abstractions inspirées des principes adinkra).
//
// Chaque glyphe est un trait simple, géométrique, qui évoque un symbole adinkra
// par sa structure (concentrique, en croix, en spirale, en lattice…) sans
// reproduire littéralement le symbole rituel — c'est un signe formel, pas un
// emprunt folklorique. Conçus pour remplacer les icônes lucide aux endroits
// signature : marqueurs de section, ledgers, micro-interactions.
//
// Usage : <AdinkraGlyph name="compass" size={20} />

import type { CSSProperties } from "react";

export type AdinkraGlyphName =
  | "compass"      // Akoma ntoaso — deux demi-arcs liés (unité, alliance)
  | "spiral"      // Sankofa — spirale (revenir chercher ce qui est utile)
  | "lattice"     // Bese saka — losanges (abondance, multiplicité)
  | "crossroads"  // Nyame nti — croix + cercle (par la grâce, jonction)
  | "arches"      // Mpatapo — chevrons stackés (réconciliation, paliers)
  | "radial";     // Adinkrahene — cercles concentriques (autorité, principe)

interface Props {
  name: AdinkraGlyphName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: CSSProperties;
}

export function AdinkraGlyph({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.4,
  className = "",
  style,
}: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `atlas-ornament ${className}`,
    "aria-hidden": true as const,
    style,
  };

  switch (name) {
    case "compass":
      // Deux demi-arcs interconnectés, comme deux mains qui se rejoignent.
      return (
        <svg {...common}>
          <path d="M4 12 a 8 8 0 0 1 8 -8" />
          <path d="M20 12 a 8 8 0 0 1 -8 8" />
          <circle cx="12" cy="12" r="1.2" fill={color} />
        </svg>
      );

    case "spiral":
      // Spirale carrée — trace géométrique du "retour"
      return (
        <svg {...common}>
          <path d="M12 4 L4 4 L4 20 L20 20 L20 8 L8 8 L8 16 L16 16 L16 12 L11.5 12" />
        </svg>
      );

    case "lattice":
      // Grille de 4 losanges — abondance multiplicative
      return (
        <svg {...common}>
          <path d="M12 3 L7 8 L12 13 L17 8 Z" />
          <path d="M12 11 L7 16 L12 21 L17 16 Z" />
          <path d="M3 12 L8 7" opacity="0.5" />
          <path d="M21 12 L16 7" opacity="0.5" />
        </svg>
      );

    case "crossroads":
      // Croix carrée avec cercle central — point de jonction
      return (
        <svg {...common}>
          <line x1="12" y1="3" x2="12" y2="21" />
          <line x1="3"  y1="12" x2="21" y2="12" />
          <circle cx="12" cy="12" r="3.5" />
        </svg>
      );

    case "arches":
      // Trois chevrons emboîtés — paliers, progression
      return (
        <svg {...common}>
          <path d="M4 17 L12 9 L20 17" />
          <path d="M6 13 L12 7  L18 13" opacity="0.7" />
          <path d="M8 9  L12 5  L16 9"  opacity="0.4" />
        </svg>
      );

    case "radial":
      // Trois cercles concentriques — autorité, principe central
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5.5" opacity="0.75" />
          <circle cx="12" cy="12" r="2"   fill={color} />
        </svg>
      );

    default:
      return null;
  }
}

/** Mapping signature : association d'un glyphe à chaque section de la suite. */
export const SECTION_GLYPHS: Record<string, AdinkraGlyphName> = {
  catalogue:    "lattice",
  methode:      "arches",
  manifeste:    "spiral",
  origine:      "spiral",
  secteurs:     "radial",
  preuve:       "crossroads",
  temoignages:  "compass",
  tarifs:       "lattice",
  questions:    "crossroads",
  engagements:  "compass",
  fin:          "radial",
};
