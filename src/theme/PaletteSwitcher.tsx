import { PALETTES, usePalette } from "./palette";

/**
 * Sélecteur de palette A / B. Réutilisable (login, paramètres…).
 * `variant="pills"` : deux pastilles compactes. `variant="cards"` : cartes détaillées.
 */
export function PaletteSwitcher({ variant = "pills" }: { variant?: "pills" | "cards" }) {
  const { palette, setPalette } = usePalette();

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PALETTES.map((p) => {
          const active = palette === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setPalette(p.id)}
              className={`text-left rounded-xl border p-4 transition-all ${
                active ? "border-p-accent ring-2 ring-p-accent/30" : "border-p-border hover:border-p-accent/50"
              }`}
              style={{ background: "var(--c-surface)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-md" style={{ background: p.ink }} />
                <span className="w-6 h-6 rounded-md" style={{ background: p.accent }} />
                <span className="ml-auto text-[10px] font-bold uppercase tracking-widest" style={{ color: active ? "var(--c-accent)" : "var(--c-muted)" }}>
                  {p.id === "a" ? "A" : "B"}{active ? " · Actif" : ""}
                </span>
              </div>
              <div className="text-p-text text-sm font-semibold">{p.name}</div>
              <div className="text-p-muted text-[11px] mt-0.5">{p.id === "b" ? "Par défaut" : "Alternative"}</div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full border border-p-border" style={{ background: "var(--c-surface)" }}>
      {PALETTES.map((p) => {
        const active = palette === p.id;
        return (
          <button
            key={p.id}
            onClick={() => setPalette(p.id)}
            title={p.name}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
              active ? "text-p-on-accent" : "text-p-muted hover:text-p-text"
            }`}
            style={active ? { background: "var(--c-accent)" } : undefined}
          >
            <span className="w-3 h-3 rounded-full" style={{ background: p.accent, boxShadow: `inset 0 0 0 2px ${p.ink}` }} />
            {p.id === "a" ? "A · Or & Nuit" : "B · Cuivré"}
          </button>
        );
      })}
    </div>
  );
}
