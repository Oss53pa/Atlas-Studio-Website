import type { LucideIcon } from "lucide-react";

interface AdminCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
}

export function AdminCard({ label, value, sub, icon: Icon }: AdminCardProps) {
  return (
    <div className="bg-white border border-warm-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider">{label}</div>
        {Icon && <Icon size={18} className="text-neutral-placeholder" strokeWidth={1.5} />}
      </div>
      <div className="text-gold text-3xl font-extrabold">{value}</div>
      {sub && <div className="text-neutral-placeholder text-xs mt-0.5">{sub}</div>}
    </div>
  );
}
