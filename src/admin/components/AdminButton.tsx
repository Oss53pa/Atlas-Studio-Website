import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";

interface AdminButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
}

const VARIANTS = {
  primary: "bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors",
  secondary: "border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-body dark:text-admin-text font-medium hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors",
  danger: "bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors",
};

export function AdminButton({ children, onClick, variant = "primary", icon: Icon, loading, disabled, className = "", type = "button" }: AdminButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-4 py-2.5 text-[13px] flex items-center gap-2 ${VARIANTS[variant]} ${loading || disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
