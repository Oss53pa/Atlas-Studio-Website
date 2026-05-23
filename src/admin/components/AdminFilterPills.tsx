interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface AdminFilterPillsProps {
  filters: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function AdminFilterPills({ filters, value, onChange }: AdminFilterPillsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all duration-200 ${
            value === f.value
              ? "bg-gold dark:bg-admin-accent text-onyx shadow-sm dark:shadow-gold"
              : "bg-white dark:bg-admin-surface-alt/40 border border-warm-border dark:border-white/10 text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 hover:shadow-sm"
          }`}
        >
          {f.label}
          {f.count !== undefined && <span className="ml-1 opacity-60">{f.count}</span>}
        </button>
      ))}
    </div>
  );
}
