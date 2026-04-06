import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, ChevronsLeft, ChevronsRight } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (selectedIds: string[]) => void;
  variant?: "danger" | "default";
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
  selectable?: boolean;
  bulkActions?: BulkAction[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  pageSizeOptions?: number[];
  stickyHeader?: boolean;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="border-b border-warm-border/50 dark:border-admin-surface-alt/50">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="p-4"><div className={`h-4 bg-warm-bg dark:bg-admin-surface-alt rounded animate-pulse ${i === 0 ? "w-32" : "w-24"}`} /></td>
      ))}
    </tr>
  );
}

export function AdminTable<T>({
  columns, data, pageSize: defaultPageSize = 10, onRowClick, keyExtractor,
  selectable = false, bulkActions = [], loading = false,
  emptyMessage = "Aucun résultat", emptyIcon,
  pageSizeOptions = [10, 25, 50, 100],
  stickyHeader = false,
}: AdminTableProps<T>) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => { setPage(0); }, [data.length]);

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = (a as any)[sortKey]; const vb = (b as any)[sortKey];
        const cmp = typeof va === "string" ? va.localeCompare(vb) : (va > vb ? 1 : -1);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const allPageSelected = paged.length > 0 && paged.every(r => selected.has(keyExtractor(r)));
  const someSelected = selected.size > 0;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const toggleAll = () => {
    if (allPageSelected) setSelected(prev => { const next = new Set(prev); paged.forEach(r => next.delete(keyExtractor(r))); return next; });
    else setSelected(prev => { const next = new Set(prev); paged.forEach(r => next.add(keyExtractor(r))); return next; });
  };

  const toggleOne = (id: string) => setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const clearSelection = () => setSelected(new Set());

  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-2xl overflow-hidden">
      {/* Bulk actions */}
      {selectable && someSelected && (
        <div className="px-4 py-3 bg-gold/5 dark:bg-admin-accent/10 border-b border-gold/20 dark:border-admin-accent/20 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gold dark:text-admin-accent">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, i) => (
              <button key={i} onClick={() => { action.onClick(Array.from(selected)); clearSelection(); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  action.variant === "danger"
                    ? "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/30"
                    : "bg-white dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40"
                }`}>{action.icon}{action.label}</button>
            ))}
          </div>
          <button onClick={clearSelection} className="ml-auto text-[12px] text-neutral-muted dark:text-admin-muted hover:text-neutral-text dark:hover:text-admin-text transition-colors">Désélectionner</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`border-b border-warm-border dark:border-admin-surface-alt bg-warm-bg/50 dark:bg-admin-accent/10 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
              {selectable && (
                <th className="w-10 p-4">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAll} className="w-4 h-4 rounded accent-gold dark:accent-admin-accent cursor-pointer" />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  className={`text-neutral-muted dark:text-admin-accent text-[11px] font-bold uppercase tracking-wider p-4 text-left ${col.sortable ? "cursor-pointer select-none hover:text-gold dark:hover:text-admin-accent" : ""} ${col.className || ""}`}>
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <ArrowUpDown size={12} className={sortKey === col.key ? "text-gold dark:text-admin-accent" : "opacity-40"} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={columns.length + (selectable ? 1 : 0)} />)
            ) : paged.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="p-12 text-center">
                {emptyIcon && <div className="flex justify-center mb-3 text-neutral-300 dark:text-admin-muted">{emptyIcon}</div>}
                <p className="text-neutral-muted dark:text-admin-muted text-sm">{emptyMessage}</p>
              </td></tr>
            ) : paged.map((row, ri) => {
              const id = keyExtractor(row);
              const isSelected = selected.has(id);
              return (
                <tr key={id} onClick={() => onRowClick?.(row)}
                  className={`border-b border-warm-bg dark:border-admin-surface-alt/50 last:border-b-0 transition-colors ${
                    isSelected ? "bg-gold/5 dark:bg-admin-accent/5" : ri % 2 === 1 ? "bg-warm-bg/30 dark:bg-admin-surface-alt/30" : ""
                  } ${onRowClick ? "cursor-pointer hover:bg-warm-bg/50 dark:hover:bg-admin-accent/10" : "hover:bg-warm-bg/50 dark:hover:bg-admin-surface-alt/50"}`}>
                  {selectable && (
                    <td className="w-10 p-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(id)} className="w-4 h-4 rounded accent-gold dark:accent-admin-accent cursor-pointer" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={`text-neutral-body dark:text-admin-text text-[13px] p-4 ${col.className || ""}`}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-warm-border dark:border-admin-surface-alt flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-neutral-muted dark:text-admin-muted text-[12px]">
            {sorted.length === 0 ? "0 résultats" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} sur ${sorted.length}`}
          </span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(0); }}
            className="text-[12px] text-neutral-muted dark:text-admin-muted bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded px-2 py-1 outline-none cursor-pointer">
            {pageSizeOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt disabled:opacity-30 transition-colors text-neutral-muted dark:text-admin-muted"><ChevronsLeft size={14} /></button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt disabled:opacity-30 transition-colors text-neutral-muted dark:text-admin-muted"><ChevronLeft size={16} /></button>
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt disabled:opacity-30 transition-colors text-neutral-muted dark:text-admin-muted"><ChevronRight size={16} /></button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt disabled:opacity-30 transition-colors text-neutral-muted dark:text-admin-muted"><ChevronsRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
