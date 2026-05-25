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
  primary: "bg-gold dark:bg-admin-accent text-black font-semibold rounded-full shadow-sm hover:bg-gold-dark dark:hover:bg-admin-accent-dark dark:shadow-gold dark:hover:shadow-gold-glow transition-all duration-300",
  secondary: "bg-white dark:bg-admin-surface-alt/40 border border-warm-border dark:border-white/10 rounded-full text-neutral-body dark:text-admin-text font-medium shadow-sm dark:shadow-none hover:border-gold/40 dark:hover:border-admin-accent/40 hover:shadow-md dark:hover:bg-admin-surface-alt/70 transition-all duration-300",
  danger: "bg-red-600 text-white font-semibold rounded-full shadow-sm hover:bg-red-700 hover:shadow-md transition-all duration-300",
};

export function AdminButton({ children, onClick, variant = "primary", icon: Icon, loading, disabled, className = "", type = "button" }: AdminButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={loading || disabled}
      className={`px-5 py-2.5 text-[13px] flex items-center gap-2 ${VARIANTS[variant]} ${loading || disabled ? "opacity-50 cursor-not-allowed shadow-none" : ""} ${className}`}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
