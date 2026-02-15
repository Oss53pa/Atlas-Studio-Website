"use client";

import { useState, useEffect, useRef } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import Container from "../layout/Container";
import Button from "../ui/Button";
import { Input, Textarea, Select } from "../ui/Input";
import Card from "../ui/Card";

const investorTypes = [
  { value: "business_angel", label: "Business Angel" },
  { value: "vc", label: "VC / Fonds d'investissement" },
  { value: "family_office", label: "Family Office" },
  { value: "corporate", label: "Corporate / Strategique" },
];

interface FormData {
  name: string;
  email: string;
  investorType: string;
  message: string;
}

interface FormStatus {
  type: "idle" | "loading" | "success" | "error";
  message?: string;
}

export default function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    investorType: "",
    message: "",
  });

  const [status, setStatus] = useState<FormStatus>({ type: "idle" });
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "loading" });

    try {
      const response = await fetch("http://localhost:5000/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus({
          type: "success",
          message: "Merci ! Nous vous recontacterons tres bientot.",
        });
        setFormData({ name: "", email: "", investorType: "", message: "" });
      } else {
        throw new Error("Erreur lors de l'envoi");
      }
    } catch {
      setStatus({
        type: "error",
        message: "Une erreur est survenue. Veuillez reessayer.",
      });
    }
  };

  return (
    <section id="contact" className="py-20 md:py-32 bg-gray-50" ref={ref}>
      <Container size="narrow">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Discutons de l&apos;avenir
          </h2>
          <p className="text-gray-600 text-lg">
            Interesse par Atlas Studio ? Laissez-nous vos coordonnees.
          </p>
        </div>

        <div
          className={`transition-all duration-700 delay-200 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <Card variant="elevated" className="p-8 md:p-10">
            {status.type === "success" ? (
              <div className="text-center py-8">
                <CheckCircle size={64} className="mx-auto text-emerald-500 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Message envoye !
                </h3>
                <p className="text-gray-600">{status.message}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <Input
                  label="Nom complet *"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  required
                />

                <Input
                  label="Email professionnel *"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="john@company.com"
                  required
                />

                <Select
                  label="Type d'investisseur"
                  name="investorType"
                  value={formData.investorType}
                  onChange={handleChange}
                  options={investorTypes}
                />

                <Textarea
                  label="Message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Parlez-nous de votre interet pour Atlas Studio..."
                  rows={4}
                />

                {status.type === "error" && (
                  <div className="flex items-center gap-2 text-red-500 text-sm">
                    <AlertCircle size={16} />
                    {status.message}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={status.type === "loading"}
                >
                  {status.type === "loading" ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Envoi en cours...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Send size={20} />
                      Envoyer ma demande
                    </span>
                  )}
                </Button>
              </form>
            )}
          </Card>
        </div>
      </Container>
    </section>
  );
}
