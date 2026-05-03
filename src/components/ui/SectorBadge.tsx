import type { LucideIcon } from "lucide-react";

interface SectorBadgeProps {
  icon: LucideIcon | string;
  name: string;
}

export function SectorBadge({ icon: Icon, name }: SectorBadgeProps) {
  return (
    <div className="group relative bg-ink-200 border border-white/[0.06] rounded-xl p-5 text-center card-hover overflow-hidden">
      {/* Subtle hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.10) 0%, transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="mb-2.5 flex justify-center text-neutral-placeholder group-hover:text-gold transition-colors duration-300">
          {typeof Icon === "string"
            ? <span className="text-2xl">{Icon}</span>
            : <Icon size={28} strokeWidth={1.5} />}
        </div>
        <div className="text-neutral-light text-[13px] font-medium tracking-wide group-hover:text-white transition-colors duration-300">{name}</div>
      </div>
    </div>
  );
}
