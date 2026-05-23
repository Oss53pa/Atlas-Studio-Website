import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { FAQItem } from "../components/ui/FAQItem";
import { SEOHead } from "../components/ui/SEOHead";

export default function FAQPage() {
  const { content } = useContentContext();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="bg-onyx min-h-screen pt-28 pb-20 md:pt-32 md:pb-28 px-5 md:px-8 relative overflow-hidden">
      <SEOHead title="FAQ" description="Questions fréquentes sur Atlas Studio." canonical="/faq" />
      <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />

      <div className="relative max-w-2xl mx-auto">
        <ScrollReveal>
          <div className="section-eyebrow">FAQ</div>
          <h1 className="text-4xl md:text-5xl font-medium text-gradient-light leading-[1.12] tracking-tight mb-4">Questions fréquentes</h1>
          <p className="text-[15px] text-neutral-muted font-light mb-14">Trouvez rapidement les réponses à vos questions.</p>
        </ScrollReveal>

        <ScrollReveal>
          <div>
            {content.faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="relative text-center mt-14 bg-ink-100 border border-white/[0.06] rounded-2xl p-9 overflow-hidden shadow-premium">
            <div className="absolute -top-px left-[10%] right-[10%] h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.55) 50%, transparent 100%)" }}
            />
            <h3 className="text-neutral-light text-lg font-semibold mb-2 tracking-tight">Vous n'avez pas trouvé votre réponse ?</h3>
            <p className="text-neutral-muted text-sm font-light mb-7">Notre équipe est là pour vous aider.</p>
            <Link to="/contact" className="btn-gold">
              Nous contacter
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
