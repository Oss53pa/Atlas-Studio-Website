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
        className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface-alt/50 border border-warm-border dark:border-white/10 rounded-full text-sm text-neutral-text dark:text-admin-text outline-none shadow-sm dark:shadow-inner focus:border-gold/50 dark:focus:border-admin-accent/50 focus:ring-2 focus:ring-gold/20 dark:focus:ring-admin-accent/25 transition-all duration-200"
      />
    </div>
  );
}
