"use client";

import { useEffect, useState, useRef } from "react";
import { Download, Calendar } from "lucide-react";
import Container from "../layout/Container";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import Card from "../ui/Card";

const investorMetrics = [
  { value: "$500K", label: "Objectif" },
  { value: "$2.5B", label: "TAM Marche" },
  { value: "+180%", label: "Croissance" },
];

const fundAllocation = [
  { percentage: 40, label: "Developpement produit" },
  { percentage: 30, label: "Expansion commerciale" },
  { percentage: 20, label: "Marketing & Acquisition" },
  { percentage: 10, label: "Operations" },
];

export default function InvestorSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setTimeout(() => setBarsVisible(true), 500);
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

  const scrollToContact = () => {
    const element = document.querySelector("#contact");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="investir" className="py-20 md:py-32 bg-black text-white" ref={ref}>
      <Container>
        <div className="text-center">
          {/* Badge */}
          <div
            className={`mb-6 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Badge variant="success" pulse>
              Seed Round en cours
            </Badge>
          </div>

          {/* Title */}
          <h2
            className={`font-serif text-3xl md:text-5xl font-bold mb-12 transition-all duration-700 delay-100 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Rejoignez l&apos;aventure Atlas
          </h2>

          {/* Investor Metrics */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {investorMetrics.map((metric, index) => (
              <Card
                key={index}
                className="bg-white/5 border border-white/10 backdrop-blur-sm p-8"
              >
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {metric.value}
                </div>
                <div className="text-gray-400">{metric.label}</div>
              </Card>
            ))}
          </div>

          {/* Fund Allocation */}
          <div
            className={`mb-16 transition-all duration-700 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <h3 className="text-xl font-semibold mb-8 text-gray-300">
              Utilisation des fonds
            </h3>
            <div className="max-w-2xl mx-auto space-y-4">
              {fundAllocation.map((item, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-16 text-right font-bold text-white">
                    {item.percentage}%
                  </div>
                  <div className="flex-1">
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: barsVisible ? `${item.percentage}%` : "0%",
                          transitionDelay: `${index * 150}ms`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-48 text-left text-gray-400 text-sm">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-500 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-black border-white hover:bg-gray-100"
              onClick={() => window.open("/documents/pitch-deck.pdf", "_blank")}
            >
              <Download size={20} className="mr-2" />
              Telecharger le Pitch Deck
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="border-white text-white hover:bg-white/10"
              onClick={scrollToContact}
            >
              <Calendar size={20} className="mr-2" />
              Planifier un call
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
