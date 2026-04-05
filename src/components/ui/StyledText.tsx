import React from "react";

const BRAND_WORDS: Record<string, string> = {
  "Proph3t": "font-logo",
  "Atlas Studio": "font-logo",
};

/**
 * Renders text with branded words styled in their designated font.
 * "Proph3t" → Grand Hotel (font-logo)
 */
export function StyledText({ children }: { children: string }) {
  const pattern = new RegExp(`(${Object.keys(BRAND_WORDS).join("|")})`, "g");
  const parts = children.split(pattern);

  return (
    <>
      {parts.map((part, i) => {
        const cls = BRAND_WORDS[part];
        return cls ? (
          <span key={i} className={cls}>{part}</span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        );
      })}
    </>
  );
}
