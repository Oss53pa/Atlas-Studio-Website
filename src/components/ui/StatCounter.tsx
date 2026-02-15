interface StatCounterProps {
  value: string;
  label: string;
  light?: boolean;
}

export function StatCounter({ value, label, light = false }: StatCounterProps) {
  return (
    <div className="text-center">
      <div className={`text-3xl md:text-4xl font-extrabold ${light ? "text-gold" : "text-gold"}`}>
        {value}
      </div>
      <div className={`text-[13px] font-medium mt-1 ${light ? "text-neutral-400" : "text-neutral-placeholder"}`}>
        {label}
      </div>
    </div>
  );
}
