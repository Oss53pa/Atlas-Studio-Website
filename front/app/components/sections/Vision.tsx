"use client";

import { useEffect, useState, useRef } from "react";
import Container from "../layout/Container";
import Card from "../ui/Card";

const stats = [
  { value: "400M+", label: "Mobile Money" },
  { value: "+20%", label: "Croissance/an" },
  { value: "70%", label: "Non-bancarises" },
  { value: "60%", label: "Moins 25 ans" },
];

export default function Vision() {
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
      { threshold: 0.2 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="vision" className="py-20 md:py-32 bg-gray-50" ref={ref}>
      <Container>
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Left Column - Text */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Pourquoi l&apos;Afrique.
              <br />
              Pourquoi maintenant.
            </h2>

            <div className="space-y-4 text-gray-600 leading-relaxed">
              <p>
                L&apos;Afrique compte 1,4 milliard d&apos;habitants dont 60% ont moins de
                25 ans. Avec un taux de penetration mobile de 80% et une adoption
                fulgurante des services financiers digitaux, le continent represente
                la plus grande opportunite de croissance technologique de la
                decennie.
              </p>
              <p>
                Atlas Studio se positionne au coeur de cette transformation en
                creant des solutions adaptees aux realites locales.
              </p>
            </div>
          </div>

          {/* Right Column - Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`transition-all duration-700 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${(index + 1) * 100}ms` }}
              >
                <Card
                  variant="elevated"
                  className="text-center p-6 md:p-8"
                >
                  <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-gray-500 text-sm">{stat.label}</div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
