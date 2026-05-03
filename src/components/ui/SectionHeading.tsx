interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  light?: boolean;
  className?: string;
}

export function SectionHeading({ title, subtitle, className = "" }: SectionHeadingProps) {
  return (
    <div className={`text-center mb-14 ${className}`}>
      <h2 className="text-3xl md:text-4xl font-medium mb-4 text-gradient-light tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[15px] max-w-lg mx-auto leading-relaxed text-neutral-muted font-light">
          {subtitle}
        </p>
      )}
      <div className="relative w-16 h-px mx-auto mt-5 overflow-hidden">
        <div className="h-px reveal-line"
          style={{ background: "linear-gradient(90deg, transparent 0%, #10B981 50%, transparent 100%)" }}
        />
      </div>
    </div>
  );
}
