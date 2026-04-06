interface UsageBarProps {
  used: number;
  limit: number;
  unit: string;
  label: string;
}

export function UsageBar({ used, limit, unit, label }: UsageBarProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const barColor = pct >= 100 ? "#EF4444" : pct >= 80 ? "#EF9F27" : "#22C55E";

  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "#1A1A1A", fontSize: 14, fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ color: "#888", fontSize: 13, fontFamily: "monospace" }}>
          {used.toLocaleString("fr-FR")} / {limit.toLocaleString("fr-FR")}{" "}
          {unit}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 99,
          background: "#E8E8E0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: 99,
            background: barColor,
            transition: "width 0.4s ease",
          }}
        />
      </div>
      {pct >= 80 && (
        <p style={{ color: barColor, fontSize: 12, marginTop: 4 }}>
          {pct >= 100
            ? "Limite atteinte"
            : `${Math.round(pct)}% utilise`}
        </p>
      )}
    </div>
  );
}
