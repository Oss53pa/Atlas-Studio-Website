import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
   Système de palettes Atlas Studio — deux thèmes CLAIRS.
   A · « Or & Nuit »   |   B · « Or Cuivré & Noir Chaud » (défaut)
   La préférence est appliquée via l'attribut data-palette sur <html>
   (les variables CSS correspondantes sont définies dans index.css).
   Persistance locale pour l'instant ; la sync Supabase (profil) est
   branchée dans une phase ultérieure.
   ───────────────────────────────────────────────────────────── */

export type PaletteId = "a" | "b";

export const PALETTES: { id: PaletteId; name: string; accent: string; ink: string }[] = [
  { id: "a", name: "Or & Nuit", accent: "#C4A676", ink: "#0B1929" },
  { id: "b", name: "Vert Volt & Olive", accent: "#D2FF00", ink: "#282C20" },
];

export const DEFAULT_PALETTE: PaletteId = "b";
const STORAGE_KEY = "atlas_palette";

function applyPalette(id: PaletteId) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-palette", id);
  }
}

interface PaletteContextValue {
  palette: PaletteId;
  setPalette: (id: PaletteId) => void;
}

const PaletteContext = createContext<PaletteContextValue | null>(null);

function readStored(): PaletteId {
  if (typeof localStorage !== "undefined") {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "a" || v === "b") return v;
  }
  return DEFAULT_PALETTE;
}

export function PaletteProvider({ children }: { children: ReactNode }) {
  const [palette, setPaletteState] = useState<PaletteId>(readStored);

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);

  const setPalette = (id: PaletteId) => {
    setPaletteState(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
    applyPalette(id);
  };

  return (
    <PaletteContext.Provider value={{ palette, setPalette }}>
      {children}
    </PaletteContext.Provider>
  );
}

export function usePalette() {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error("usePalette must be used within PaletteProvider");
  return ctx;
}
