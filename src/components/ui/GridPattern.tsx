interface GridPatternProps {
  dark?: boolean;
}

export function GridPattern({ dark = false }: GridPatternProps) {
  const id = dark ? "grid-dark" : "grid-light";
  const fill = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={id} width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="16" cy="16" r="1" fill={fill} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </div>
  );
}
