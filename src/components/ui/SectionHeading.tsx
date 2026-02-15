interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  light?: boolean;
  className?: string;
}

export function SectionHeading({ title, subtitle, light = false, className = "" }: SectionHeadingProps) {
  return (
    <div className={`text-center mb-12 ${className}`}>
      <h2 className={`text-3xl md:text-4xl font-extrabold mb-3 ${light ? "text-neutral-light" : "text-neutral-text"}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-[15px] max-w-lg mx-auto leading-relaxed ${light ? "text-neutral-400" : "text-neutral-muted"}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
