export interface Stat {
  value: string;
  label: string;
}

/**
 * StatRow — rangée de statistiques avec valeurs en JetBrains Mono amber
 * et labels discrets.
 */
export function StatRow({ stats }: { stats: Stat[] }) {
  return (
    <div
      className="flex gap-10 md:gap-8 sm:grid sm:grid-cols-2 sm:gap-5 flex-wrap"
      style={{
        paddingTop: 28,
        marginTop: 32,
        borderTop: '0.5px solid #1E1E2E',
      }}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 26,
              fontWeight: 500,
              color: '#EF9F27',
              lineHeight: 1.1,
              marginBottom: 6,
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 11, color: '#666666', lineHeight: 1.4 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
