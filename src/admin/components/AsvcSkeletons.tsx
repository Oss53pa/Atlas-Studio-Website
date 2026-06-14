/* Skeletons de chargement pour les listes-cartes ASVC (style onyx du module). */

export function CardListSkeleton({ rows = 5, height = 'h-[72px]' }: { rows?: number; height?: string }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Chargement…">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`rounded-xl border border-white/10 bg-onyx-light/30 ${height} animate-pulse`}
        />
      ))}
    </div>
  );
}
