import { useState } from "react";
import { Link } from "react-router-dom";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { FAQItem } from "../components/ui/FAQItem";
import { SEOHead } from "../components/ui/SEOHead";

export default function FAQPage() {
  const { content } = useContentContext();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="bg-onyx min-h-screen pt-24 pb-16 md:pt-28 md:pb-24 px-5 md:px-8">
      <SEOHead title="FAQ" description="Questions fréquentes sur Atlas Studio." canonical="/faq" />
      <div className="max-w-2xl mx-auto">
        <ScrollReveal>
          <div className="text-[11px] font-normal text-gold uppercase tracking-[0.1em] mb-3">FAQ</div>
          <h1 className="text-[34px] font-normal text-neutral-light leading-tight mb-3">Questions fréquentes</h1>
          <p className="text-[15px] text-neutral-muted font-light mb-12">Trouvez rapidement les réponses à vos questions.</p>
        </ScrollReveal>

        <ScrollReveal>
          <div>
            {content.faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="text-center mt-12 bg-dark-bg2 border border-dark-border rounded-xl p-8">
            <h3 className="text-neutral-light text-lg font-normal mb-2">Vous n'avez pas trouvé votre réponse ?</h3>
            <p className="text-neutral-muted text-sm font-light mb-6">Notre équipe est là pour vous aider.</p>
            <Link to="/contact" className="btn-gold">Nous contacter</Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
