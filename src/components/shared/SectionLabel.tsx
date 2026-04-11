/**
 * SectionLabel — petit label uppercase gold au-dessus de chaque titre de section.
 * Cohérent avec le reste du site vitrine (HomePage, etc.).
 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium text-gold uppercase tracking-[0.1em] mb-3">
      {children}
    </div>
  );
}
