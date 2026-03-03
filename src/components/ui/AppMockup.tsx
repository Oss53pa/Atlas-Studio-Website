interface AppMockupProps {
  appName: string;
  color: string;
  variant: "dashboard" | "list" | "form";
  className?: string;
}

function MockupDashboard({ color }: { color: string }) {
  const heights = [65, 45, 80, 55];
  return (
    <div>
      <div className="flex gap-3 mb-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-1 rounded-lg bg-neutral-50 border border-warm-border p-3">
            <div className="h-2 w-10 rounded bg-neutral-200 mb-2" />
            <div className="h-4 w-8 rounded" style={{ backgroundColor: color, opacity: 0.7 }} />
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2 h-24">
        {heights.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%`, backgroundColor: color, opacity: 0.15 + i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}

function MockupList({ color }: { color: string }) {
  return (
    <div>
      <div className="h-8 rounded-lg bg-neutral-50 border border-warm-border mb-3 flex items-center px-3">
        <div className="h-2 w-16 rounded bg-neutral-200" />
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-warm-border last:border-0">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: color, opacity: 0.2 }} />
          <div className="flex-1">
            <div className="h-2 rounded bg-neutral-200 mb-1" style={{ width: `${50 + i * 10}%` }} />
            <div className="h-1.5 rounded bg-neutral-100" style={{ width: `${30 + i * 5}%` }} />
          </div>
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: color, opacity: 0.15 }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

function MockupForm({ color }: { color: string }) {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <div className="h-1.5 w-12 rounded bg-neutral-300 mb-1.5" />
          <div className="h-8 rounded-lg border border-warm-border bg-neutral-50 flex items-center px-3">
            <div className="h-2 rounded bg-neutral-200" style={{ width: `${40 + i * 15}%` }} />
          </div>
        </div>
      ))}
      <div
        className="h-9 rounded-lg flex items-center justify-center mt-4"
        style={{ backgroundColor: color }}
      >
        <div className="h-2 w-14 rounded bg-white/60" />
      </div>
    </div>
  );
}

export function AppMockup({ appName, color, variant, className = "" }: AppMockupProps) {
  return (
    <div className={`bg-white rounded-xl shadow-2xl overflow-hidden border border-warm-border ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-neutral-50 border-b border-warm-border">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
        </div>
        <span className="text-[11px] font-semibold text-neutral-muted ml-2">{appName}</span>
      </div>

      {/* Content */}
      <div className="p-4">
        {variant === "dashboard" && <MockupDashboard color={color} />}
        {variant === "list" && <MockupList color={color} />}
        {variant === "form" && <MockupForm color={color} />}
      </div>
    </div>
  );
}
