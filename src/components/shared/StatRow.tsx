export interface Stat {
  value: string;
  label: string;
}

/**
 * StatRow — rangée de statistiques (JetBrains Mono gold) séparées par une ligne.
 * Design aligné sur la section stats de HomePage.
 */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pt-10 mt-12 border-t border-dark-border">
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-mono text-gold text-2xl md:text-3xl font-normal leading-none mb-2">
            {s.value}
          </div>
          <div className="text-neutral-muted text-xs md:text-[13px] font-light leading-snug">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
