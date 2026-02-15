import { useState } from "react";
import { ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";

interface Column<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function AdminTable<T>({ columns, data, pageSize = 10, onRowClick, keyExtractor }: AdminTableProps<T>) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
  };

  return (
    <div className="bg-white border border-warm-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-warm-border">
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  className={`text-neutral-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left ${col.sortable ? "cursor-pointer select-none hover:text-neutral-text" : ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && <ArrowUpDown size={12} className="opacity-40" />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length} className="p-8 text-center text-neutral-muted text-sm">Aucun résultat</td></tr>
            ) : paged.map(row => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-warm-bg last:border-b-0 hover:bg-warm-bg/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map(col => (
                  <td key={col.key} className="text-neutral-body text-[13px] p-4">
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-warm-border">
          <div className="text-neutral-muted text-[12px]">
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} sur {sorted.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1.5 rounded hover:bg-warm-bg disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-warm-bg disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
