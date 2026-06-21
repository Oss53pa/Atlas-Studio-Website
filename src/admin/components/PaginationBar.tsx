import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Pagination client pour les listes-cartes (là où AdminTable ne convient pas
 * car le rendu n'est pas tabulaire). Découpe `items` en pages et expose les
 * éléments de la page courante. Réinitialise la page quand la longueur change
 * (ex: changement de filtre).
 */
export function usePaged<T>(items: T[], pageSize = 20) {
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0);
  }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageItems = items.slice(safePage * pageSize, (safePage + 1) * pageSize);

  return { pageItems, page: safePage, setPage, totalPages, total: items.length, pageSize };
}

export function PaginationBar({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
  className = '',
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
  className?: string;
}) {
  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className={`flex items-center justify-between mt-4 flex-wrap gap-2 ${className}`}>
      <span className="text-admin-muted text-[12px]">
        {from}–{to} sur {total}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPage(0)}
            disabled={page === 0}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 transition-colors text-admin-muted"
          >
            <ChevronsLeft size={14} />
          </button>
          <button
            onClick={() => onPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 transition-colors text-admin-muted"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[12px] text-admin-muted px-2">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 transition-colors text-admin-muted"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => onPage(totalPages - 1)}
            disabled={page >= totalPages - 1}
            className="p-1.5 rounded hover:bg-white/5 disabled:opacity-30 transition-colors text-admin-muted"
          >
            <ChevronsRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
