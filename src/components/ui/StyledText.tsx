import React from "react";

// Forme canonique imposée par la marque. La clé est en minuscules pour une
// détection insensible à la casse ; la valeur est l'orthographe officielle —
// jamais "PROPH3T", toujours "Proph3t".
const BRAND_WORDS: { canonical: string; className: string }[] = [
  { canonical: "Atlas Studio", className: "font-logo normal-case" },
  { canonical: "Proph3t", className: "font-logo normal-case" },
];

// Échappe les caractères regex spéciaux d'un libellé de marque.
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Renders text with branded words styled in their designated font.
 * "Proph3t" → Grand Hotel (font-logo), toujours en casse canonique.
 *
 * La détection est insensible à la casse et `normal-case` est appliqué : même
 * placé dans un conteneur `uppercase` (data-tape, eyebrows éditoriaux), le mot
 * de marque conserve son orthographe officielle — "Proph3t", jamais "PROPH3T".
 */
export function StyledText({ children }: { children: string }) {
  const pattern = new RegExp(`(${BRAND_WORDS.map((b) => escapeRe(b.canonical)).join("|")})`, "gi");
  const parts = children.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const brand = BRAND_WORDS.find((b) => b.canonical.toLowerCase() === part.toLowerCase());
        return brand ? (
          <span key={i} className={brand.className}>{brand.canonical}</span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </>
  );
}
