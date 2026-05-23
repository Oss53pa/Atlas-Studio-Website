export interface Stat {
  value: string;
  label: string;
}

/**
 * StatRow — premium row of metrics, gradient gold typography on a subtle gradient divider.
 */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 pt-10 mt-12">
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.3) 50%, transparent 100%)" }}
      />
      {stats.map((s) => (
        <div key={s.label}>
          <div className="font-mono text-2xl md:text-3xl font-semibold leading-none mb-2 tracking-tight text-gradient-gold">
            {s.value}
          </div>
          <div className="text-neutral-muted text-xs md:text-[13px] font-light leading-snug tracking-wide">
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
