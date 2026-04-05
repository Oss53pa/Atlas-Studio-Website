import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";

interface AdminCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string }; // e.g. { value: 12, label: "vs mois dernier" }
  loading?: boolean;
  onClick?: () => void;
}

export function AdminCard({ label, value, sub, icon: Icon, trend, loading, onClick }: AdminCardProps) {
  if (loading) {
    return (
      <div className="bg-white border border-warm-border rounded-xl p-5 space-y-3">
        <div className="flex justify-between">
          <div className="h-3 w-24 bg-warm-bg rounded animate-pulse" />
          <div className="h-5 w-5 bg-warm-bg rounded animate-pulse" />
        </div>
        <div className="h-8 w-32 bg-warm-bg rounded animate-pulse" />
        <div className="h-3 w-20 bg-warm-bg rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className={`bg-white border border-warm-border rounded-xl p-5 ${onClick ? "cursor-pointer hover:border-gold/30 transition-colors" : ""}`}
      onClick={onClick}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-wider">{label}</div>
        {Icon && <Icon size={18} className="text-neutral-placeholder" strokeWidth={1.5} />}
      </div>
      <div className="text-gold text-2xl font-semibold">{value}</div>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${trend.value >= 0 ? "text-emerald-600" : "text-red-500"}`}>
            {trend.value >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.value >= 0 ? "+" : ""}{trend.value}%
            {trend.label && <span className="text-neutral-muted font-normal ml-0.5">{trend.label}</span>}
          </span>
        )}
        {sub && <div className="text-neutral-placeholder text-[11px]">{sub}</div>}
      </div>
    </div>
  );
}
