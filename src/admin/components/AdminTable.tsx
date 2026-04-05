import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown, ChevronsLeft, ChevronsRight } from "lucide-react";
import { SkeletonTableRow } from "./AdminSkeleton";

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

  // Reset page when data changes
  useEffect(() => { setPage(0); }, [data.length]);

  const sorted = sortKey
    ? [...data].sort((a, b) => {
        const va = (a as any)[sortKey];
        const vb = (b as any)[sortKey];
        const cmp = typeof va === "string" ? va.localeCompare(vb) : (va > vb ? 1 : -1);
        return sortDir === "asc" ? cmp : -cmp;
      })
    : data;

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const pagedKeys = new Set(paged.map(keyExtractor));
  const allPageSelected = paged.length > 0 && paged.every(r => selected.has(keyExtractor(r)));
  const someSelected = selected.size > 0;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
    setPage(0);
  };

  const toggleAll = () => {
    if (allPageSelected) {
      setSelected(prev => { const next = new Set(prev); paged.forEach(r => next.delete(keyExtractor(r))); return next; });
    } else {
      setSelected(prev => { const next = new Set(prev); paged.forEach(r => next.add(keyExtractor(r))); return next; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  };

  const clearSelection = () => setSelected(new Set());

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(0);
  };

  return (
    <div className="bg-white border border-warm-border rounded-2xl overflow-hidden">
      {/* Bulk actions bar */}
      {selectable && someSelected && (
        <div className="px-4 py-3 bg-gold/5 border-b border-gold/20 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gold">{selected.size} sélectionné{selected.size > 1 ? "s" : ""}</span>
          <div className="flex items-center gap-2">
            {bulkActions.map((action, i) => (
              <button key={i} onClick={() => { action.onClick(Array.from(selected)); clearSelection(); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors ${
                  action.variant === "danger" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
                }`}>
                {action.icon}{action.label}
              </button>
            ))}
          </div>
          <button onClick={clearSelection} className="ml-auto text-[12px] text-neutral-muted hover:text-neutral-text transition-colors">
            Désélectionner
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className={`border-b border-warm-border bg-warm-bg/30 ${stickyHeader ? "sticky top-0 z-10" : ""}`}>
              {selectable && (
                <th className="w-10 p-4">
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-warm-border accent-gold cursor-pointer" />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  className={`text-neutral-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left ${col.sortable ? "cursor-pointer select-none hover:text-neutral-text" : ""} ${col.className || ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <ArrowUpDown size={12} className={sortKey === col.key ? "text-gold" : "opacity-40"} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonTableRow key={i} cols={columns.length + (selectable ? 1 : 0)} />
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="p-12 text-center">
                  {emptyIcon && <div className="flex justify-center mb-3 text-neutral-300">{emptyIcon}</div>}
                  <p className="text-neutral-muted text-sm">{emptyMessage}</p>
                </td>
              </tr>
            ) : paged.map(row => {
              const id = keyExtractor(row);
              const isSelected = selected.has(id);
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-warm-bg last:border-b-0 transition-colors ${
                    isSelected ? "bg-gold/5" : "hover:bg-warm-bg/50"
                  } ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {selectable && (
                    <td className="w-10 p-4" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(id)}
                        className="w-4 h-4 rounded border-warm-border accent-gold cursor-pointer" />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={`text-neutral-body text-[13px] p-4 ${col.className || ""}`}>
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-warm-border flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-neutral-muted text-[12px]">
            {sorted.length === 0 ? "0 résultats" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, sorted.length)} sur ${sorted.length}`}
          </span>
          <select value={pageSize} onChange={e => handlePageSizeChange(Number(e.target.value))}
            className="text-[12px] text-neutral-muted bg-warm-bg border border-warm-border rounded px-2 py-1 outline-none cursor-pointer">
            {pageSizeOptions.map(n => <option key={n} value={n}>{n} / page</option>)}
          </select>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(0)} disabled={page === 0}
              className="p-1.5 rounded hover:bg-warm-bg disabled:opacity-30 transition-colors"><ChevronsLeft size={14} /></button>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded hover:bg-warm-bg disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-[12px] text-neutral-muted px-2">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-warm-bg disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
            <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-warm-bg disabled:opacity-30 transition-colors"><ChevronsRight size={14} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
