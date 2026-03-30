import { useState, useEffect, useRef } from "react";

interface StatCounterProps {
  value: string;
  label: string;
  light?: boolean;
}

function useCountUp(target: number, duration = 2000, isDecimal = false) {
  const [count, setCount] = useState(0);
  const startedRef = useRef(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;

          const start = performance.now();
          const internalTarget = isDecimal ? Math.round(target * 10) : target;

          function update(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * internalTarget));
            if (progress < 1) requestAnimationFrame(update);
          }

          requestAnimationFrame(update);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration, isDecimal]);

  return { count, ref };
}

export function StatCounter({ value, label, light = false }: StatCounterProps) {
  const match = value.match(/^([\d.]+)(.*)$/);
  const numericPart = match ? parseFloat(match[1]) : 0;
  const suffix = match ? match[2] : value;
  const isDecimal = match ? match[1].includes(".") : false;

  const { count, ref } = useCountUp(numericPart, 2000, isDecimal);
  const displayValue = isDecimal ? (count / 10).toFixed(1) : count;

  return (
    <div className="text-center" ref={ref}>
      <div className="text-3xl md:text-4xl font-extrabold text-gold font-mono">
        {match ? `${displayValue}${suffix}` : value}
      </div>
      <div className="text-[13px] font-light mt-1 text-neutral-muted">
        {label}
      </div>
    </div>
  );
}
