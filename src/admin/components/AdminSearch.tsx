import { Search } from "lucide-react";

interface AdminSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function AdminSearch({ value, onChange, placeholder = "Rechercher...", className = "max-w-xs" }: AdminSearchProps) {
  return (
    <div className={`relative flex-1 ${className}`}>
      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors"
      />
    </div>
  );
}
