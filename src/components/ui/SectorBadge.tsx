import type { LucideIcon } from "lucide-react";

interface SectorBadgeProps {
  icon: LucideIcon | string;
  name: string;
}

export function SectorBadge({ icon: Icon, name }: SectorBadgeProps) {
  return (
    <div className="bg-dark-bg3 border border-dark-border rounded-xl p-5 text-center card-hover">
      <div className="mb-2 flex justify-center">
        {typeof Icon === "string"
          ? <span className="text-2xl text-neutral-placeholder">{Icon}</span>
          : <Icon size={28} className="text-neutral-placeholder" strokeWidth={1.5} />}
      </div>
      <div className="text-neutral-light text-[13px] font-normal">{name}</div>
    </div>
  );
}
