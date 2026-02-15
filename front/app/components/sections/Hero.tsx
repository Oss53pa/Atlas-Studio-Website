"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import Container from "../layout/Container";
import Button from "../ui/Button";
import Badge from "../ui/Badge";

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 pt-20">
      <Container>
        <div className="text-center max-w-4xl mx-auto py-20 md:py-32">
          {/* Badge */}
          <div
            className={`mb-8 transition-all duration-700 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Badge variant="dark" pulse>
              Seed Round Ouvert
            </Badge>
          </div>

          {/* Title */}
          <h1
            className={`font-serif text-4xl md:text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight transition-all duration-700 delay-100 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Nous construisons l&apos;infrastructure digitale de l&apos;Afrique
          </h1>

          {/* Subtitle */}
          <p
            className={`text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            Atlas Studio developpe des applications innovantes pour les 400 millions
            d&apos;utilisateurs potentiels du marche africain. Rejoignez-nous dans cette
            aventure.
          </p>

          {/* CTAs */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-center gap-4 transition-all duration-700 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <Button size="lg" onClick={() => scrollToSection("#produits")}>
              Decouvrir nos produits
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => window.open("/documents/pitch-deck.pdf", "_blank")}
            >
              <Download size={20} className="mr-2" />
              Telecharger le Pitch Deck
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
