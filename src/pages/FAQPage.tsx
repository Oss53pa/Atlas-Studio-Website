import { useState } from "react";
import { Link } from "react-router-dom";
import { useContentContext } from "../components/layout/Layout";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { FAQItem } from "../components/ui/FAQItem";
import { SEOHead } from "../components/ui/SEOHead";

export default function FAQPage() {
  const { content } = useContentContext();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="bg-warm-bg text-neutral-text pt-24 pb-16 md:pt-28 md:pb-24 px-5 md:px-8 min-h-screen">
      <SEOHead title="FAQ" description="Questions frequentes sur Atlas Studio. Abonnements, securite, fonctionnalites." canonical="/faq" />
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <SectionHeading
            title="Vos questions. Nos r\u00e9ponses."
            subtitle="Tout ce que vous devez savoir avant de d\u00e9marrer."
          />
        </ScrollReveal>

        <ScrollReveal>
          <div>
            {content.faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={open === i}
                onToggle={() => setOpen(open === i ? null : i)}
              />
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="text-center mt-12 bg-white border border-warm-border rounded-2xl p-8">
            <h3 className="text-neutral-text text-lg font-bold mb-2">Une question sp\u00e9cifique ?</h3>
            <p className="text-neutral-muted text-sm mb-6">Notre \u00e9quipe bas\u00e9e \u00e0 Abidjan vous r\u00e9pond sous 24h.</p>
            <Link to="/contact" className="btn-gold">
              Nous contacter
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
