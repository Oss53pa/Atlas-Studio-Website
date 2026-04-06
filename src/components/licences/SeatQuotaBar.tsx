interface Props {
  used: number;
  max: number;
}

export function SeatQuotaBar({ used, max }: Props) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ background: "#2A2A3A" }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: "#EF9F27" }}
        />
      </div>
      <span
        className="text-xs font-medium shrink-0"
        style={{ color: "#1A1A1A" }}
      >
        {used} / {max}
      </span>
    </div>
  );
}
