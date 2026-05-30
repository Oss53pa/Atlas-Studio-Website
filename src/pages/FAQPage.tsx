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
    <div className="min-h-screen bg-onyx">
      <SEOHead title="FAQ" description="Questions fréquentes sur Atlas Studio." canonical="/faq" />

      {/* HERO ÉDITORIAL */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10">
            <span className="meta-led" />
            <span>§ Questions</span>
            <span className="text-neutral-light/25">/</span>
            <span>{content.faqs?.length ?? 0} entrées</span>
          </div>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[22px] sm:text-[15px] md:text-[17px] lg:text-[38px] text-neutral-light max-w-4xl">
            Questions <span className="kinetic-word">fréquentes</span>.
          </h1>
          <p className="text-[16px] md:text-[18px] text-neutral-muted font-light max-w-[540px] leading-relaxed mt-8">
            Les réponses les plus demandées. Si la vôtre n'y figure pas, l'équipe répond en moins de 24h.
          </p>
        </div>
      </section>

      {/* LISTE NUMÉROTÉE */}
      <section className="relative py-20 md:py-28 px-5 md:px-10 lg:px-16">
        <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-4">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Index
            </div>
            <p className="text-[14px] text-neutral-muted font-light leading-relaxed">
              Cliquez sur une question pour dérouler la réponse. Les sujets les plus consultés sont en tête de liste.
            </p>
          </div>

          <div className="lg:col-span-8">
            <ScrollReveal>
              {(content.faqs || []).map((faq, i) => (
                <div key={i} className="flex gap-4 md:gap-6 items-start border-t border-white/[0.06] first:border-t-0 first:pt-0">
                  <span className="meta-mono text-[11px] tracking-[0.18em] text-[#A9B57E] pt-6 hidden md:block min-w-[28px] tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <FAQItem question={faq.q} answer={faq.a} isOpen={open === i} onToggle={() => setOpen(open === i ? null : i)} />
                  </div>
                </div>
              ))}
            </ScrollReveal>

            {/* CTA — pas trouvé ? */}
            <div className="mt-16 border-t border-white/[0.10] pt-10">
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4">
                § Pas trouvé ?
              </div>
              <h3 className="font-display font-medium text-[14px] md:text-[16px] text-neutral-light leading-tight tracking-tight mb-6">
                L'équipe vous répond en moins de 24h.
              </h3>
              <Link to="/contact" className="cta-arrow cta-arrow--primary">
                Nous contacter
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
