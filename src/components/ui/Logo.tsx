interface LogoProps {
  size?: number;
  color?: string;
  className?: string;
}

export function Logo({ size = 28, color = "text-neutral-light", className = "" }: LogoProps) {
  return (
    <span
      className={`font-logo select-none ${color} ${className}`}
      style={{ fontSize: size }}
    >
      Atlas Studio
    </span>
  );
}

export function AppLogo({ name, size = 18, color = "text-gold" }: { name: string; size?: number; color?: string }) {
  return (
    <span
      className={`font-logo whitespace-nowrap ${color}`}
      style={{ fontSize: size, letterSpacing: 0.5 }}
    >
      {name}
    </span>
  );
}
