"use client";

import { useState, useEffect, useRef } from "react";
import { Handshake, FileSignature, Wallet, Check } from "lucide-react";
import Container from "../layout/Container";
import Badge from "../ui/Badge";
import Card from "../ui/Card";

interface Product {
  id: string;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  color: string;
  badgeVariant: "success" | "info" | "warning";
  features: string[];
  useCases?: string[];
  services?: string[];
}

const products: Product[] = [
  {
    id: "wedo",
    name: "WEDO",
    icon: <Handshake size={32} />,
    tagline: "Ensemble, on epargne mieux.",
    description:
      "Application mobile de tontine digitale qui modernise l'epargne collective traditionnelle africaine. Creez, gerez et securisez vos tontines en toute transparence.",
    color: "emerald",
    badgeVariant: "success",
    features: [
      "Creation de tontines en quelques clics",
      "Gestion automatisee des tours et paiements",
      "Integration Mobile Money (Orange, MTN, Moov)",
      "Notifications et rappels intelligents",
      "Tableau de bord temps reel",
      "Historique et tracabilite complete",
    ],
  },
  {
    id: "advist",
    name: "ADVIST",
    icon: <FileSignature size={32} />,
    tagline: "Validez. Signez. Tracez.",
    description:
      "Application permettant de soumettre des documents a des circuits de validation configurables, gerer les approbations multi-niveaux et apposer des signatures electroniques avec tracabilite complete des actions.",
    color: "indigo",
    badgeVariant: "info",
    features: [
      "Circuits de validation personnalisables",
      "Approbations multi-niveaux",
      "Signature electronique securisee",
      "Tracabilite complete des actions",
      "Notifications en temps reel",
      "Tableau de bord administrateur",
    ],
    useCases: [
      "Validation factures et bons de commande",
      "Approbation de contrats",
      "Circuits RH (conges, notes de frais)",
    ],
  },
  {
    id: "uwallet",
    name: "U'WALLET",
    icon: <Wallet size={32} />,
    tagline: "Tous vos comptes. Une seule app.",
    description:
      "Fini le casse-tete de jongler entre plusieurs applications ! Notre plateforme agrege l'integralite de vos services financiers - comptes bancaires, Mobile Money (Orange, MTN, Moov), epargnes (tontines digitales, microfinance) et credits - dans une interface unique, intuitive et securisee.",
    color: "amber",
    badgeVariant: "warning",
    services: [
      "Comptes bancaires",
      "Mobile Money (Orange, MTN, Moov)",
      "Epargnes (tontines digitales, microfinance)",
      "Credits et prets",
    ],
    features: [
      "Vue consolidee de tous vos soldes",
      "Transferts inter-comptes simplifies",
      "Categorisation automatique des depenses",
      "Alertes et notifications personnalisees",
    ],
  },
];

export default function Products() {
  const [activeProduct, setActiveProduct] = useState(products[0]);
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
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      emerald: {
        bg: "bg-emerald-500",
        text: "text-emerald-600",
        border: "border-emerald-500",
      },
      indigo: {
        bg: "bg-indigo-500",
        text: "text-indigo-600",
        border: "border-indigo-500",
      },
      amber: {
        bg: "bg-amber-500",
        text: "text-amber-600",
        border: "border-amber-500",
      },
    };
    return colors[color] || colors.emerald;
  };

  return (
    <section id="produits" className="py-20 md:py-32 bg-white" ref={ref}>
      <Container>
        {/* Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-gray-900 mb-4">
            Nos Produits
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Des solutions innovantes adaptees aux realites du marche africain
          </p>
        </div>

        {/* Product Tabs */}
        <div
          className={`flex flex-wrap justify-center gap-4 mb-12 transition-all duration-700 delay-100 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => setActiveProduct(product)}
              className={`px-6 py-3 rounded-full font-medium transition-all duration-300 ${
                activeProduct.id === product.id
                  ? `${getColorClasses(product.color).bg} text-white shadow-lg`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {product.name}
            </button>
          ))}
        </div>

        {/* Product Detail */}
        <div
          className={`transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Card variant="bordered" className="p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12">
              {/* Left Column - Info */}
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                      getColorClasses(activeProduct.color).bg
                    } text-white`}
                  >
                    {activeProduct.icon}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {activeProduct.name}
                    </h3>
                    <Badge variant={activeProduct.badgeVariant}>LIVE</Badge>
                  </div>
                </div>

                <p
                  className={`text-xl font-medium mb-4 ${
                    getColorClasses(activeProduct.color).text
                  }`}
                >
                  {activeProduct.tagline}
                </p>

                <p className="text-gray-600 leading-relaxed mb-6">
                  {activeProduct.description}
                </p>

                {activeProduct.services && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-3">
                      Services agreges:
                    </h4>
                    <div className="space-y-2">
                      {activeProduct.services.map((service, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check
                            size={18}
                            className={getColorClasses(activeProduct.color).text}
                          />
                          <span className="text-gray-700">{service}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Features */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">
                  Fonctionnalites:
                </h4>
                <div className="space-y-3">
                  {activeProduct.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          getColorClasses(activeProduct.color).bg
                        }`}
                      >
                        <Check size={12} className="text-white" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>

                {activeProduct.useCases && (
                  <div className="mt-8">
                    <h4 className="font-semibold text-gray-900 mb-4">
                      Cas d&apos;usage:
                    </h4>
                    <div className="space-y-2">
                      {activeProduct.useCases.map((useCase, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 text-gray-600"
                        >
                          <span className="text-gray-400">-</span>
                          {useCase}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </Container>
    </section>
  );
}
