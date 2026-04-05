/* Skeleton loading components for admin pages */

export function SkeletonLine({ width = "w-full", height = "h-4" }: { width?: string; height?: string }) {
  return <div className={`${width} ${height} bg-warm-bg rounded animate-pulse`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-warm-border rounded-xl p-5 space-y-3">
      <div className="flex justify-between">
        <SkeletonLine width="w-24" height="h-3" />
        <SkeletonLine width="w-5" height="h-5" />
      </div>
      <SkeletonLine width="w-32" height="h-8" />
      <SkeletonLine width="w-20" height="h-3" />
    </div>
  );
}

export function SkeletonTableRow({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-warm-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4">
          <SkeletonLine width={i === 0 ? "w-32" : i === cols - 1 ? "w-16" : "w-24"} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-warm-border rounded-xl overflow-hidden">
      <div className="p-4 border-b border-warm-border flex gap-3">
        <SkeletonLine width="w-48" height="h-10" />
        <SkeletonLine width="w-24" height="h-10" />
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-warm-border bg-warm-bg/50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="p-4 text-left"><SkeletonLine width="w-20" height="h-3" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonChart({ height = "h-44" }: { height?: string }) {
  return (
    <div className="bg-white border border-warm-border rounded-xl p-6">
      <SkeletonLine width="w-40" height="h-5" />
      <div className={`mt-4 ${height} bg-warm-bg rounded-lg animate-pulse`} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div><SkeletonLine width="w-48" height="h-7" /><div className="mt-1"><SkeletonLine width="w-64" height="h-4" /></div></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart /><SkeletonChart />
      </div>
    </div>
  );
}
