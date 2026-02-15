"use client";

import { useEffect, useState, useRef } from "react";
import Container from "../layout/Container";

interface Metric {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
}

const metrics: Metric[] = [
  { value: 50000, suffix: "+", label: "Utilisateurs" },
  { value: 3, suffix: "", label: "Produits Live" },
  { value: 12, suffix: "", label: "Pays Cibles" },
  { value: 2.5, suffix: "B", prefix: "$", label: "Marche TAM" },
];

function Counter({ value, suffix, prefix = "", label, isVisible }: Metric & { isVisible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const stepDuration = duration / steps;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, stepDuration);

    return () => clearInterval(timer);
  }, [isVisible, value]);

  const formatValue = (val: number) => {
    if (value >= 1000 && value < 1000000) {
      return Math.floor(val / 1000) + "K";
    }
    if (Number.isInteger(value)) {
      return Math.floor(val).toString();
    }
    return val.toFixed(1);
  };

  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2">
        {prefix}
        {formatValue(count)}
        {suffix}
      </div>
      <div className="text-gray-400 text-sm md:text-base">{label}</div>
    </div>
  );
}

export default function Metrics() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-black py-20 md:py-28" ref={ref}>
      <Container>
        <div
          className={`grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {metrics.map((metric, index) => (
            <Counter key={index} {...metric} isVisible={isVisible} />
          ))}
        </div>
      </Container>
    </section>
  );
}
