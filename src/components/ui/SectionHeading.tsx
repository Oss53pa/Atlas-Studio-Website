interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  light?: boolean;
  className?: string;
}

export function SectionHeading({ title, subtitle, className = "" }: SectionHeadingProps) {
  return (
    <div className={`text-center mb-12 ${className}`}>
      <h2 className="text-3xl md:text-4xl font-extrabold mb-3 text-neutral-light">
        {title}
      </h2>
      {subtitle && (
        <p className="text-[15px] max-w-lg mx-auto leading-relaxed text-neutral-muted font-light">
          {subtitle}
        </p>
      )}
      <div className="w-12 h-[3px] bg-gold mx-auto mt-3 reveal-line" />
    </div>
  );
}
