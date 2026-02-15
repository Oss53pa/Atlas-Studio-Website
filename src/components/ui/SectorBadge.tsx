import type { LucideIcon } from "lucide-react";

interface SectorBadgeProps {
  icon: LucideIcon;
  name: string;
}

export function SectorBadge({ icon: Icon, name }: SectorBadgeProps) {
  return (
    <div className="bg-white border border-warm-border rounded-xl p-5 text-center card-hover">
      <div className="mb-2 flex justify-center">
        <Icon size={28} className="text-neutral-body" strokeWidth={1.5} />
      </div>
      <div className="text-neutral-body text-[13px] font-semibold">{name}</div>
    </div>
  );
}
