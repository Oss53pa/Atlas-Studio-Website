import { LEGAL_CONTENT } from "../config/legal";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";

export default function PrivacyPage() {
  const { title, sections } = LEGAL_CONTENT.privacy;

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="Confidentialite" description="Politique de confidentialite et protection des donnees Atlas Studio." canonical="/confidentialite" />

      <section className="relative pt-28 pb-12 md:pt-36 md:pb-16 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10">
            <span className="meta-led" />
            <span>§ Document légal</span>
            <span className="text-neutral-light/25">/</span>
            <span>Confidentialité · RGPD</span>
            <span className="text-neutral-light/25 hidden sm:inline">/</span>
            <span className="hidden sm:inline text-neutral-light/45">Données chiffrées AES-256</span>
          </div>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[30px] sm:text-[38px] md:text-[46px] lg:text-[52px] text-neutral-light max-w-4xl">
            {title}
          </h1>
        </div>
      </section>

      <section className="relative py-20 md:py-28 px-5 md:px-10 lg:px-16">
        <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Sommaire
            </div>
            <ol className="space-y-2">
              {sections.map((s, i) => (
                <li key={i}>
                  <a href={`#section-${i}`} className="meta-mono text-[11px] tracking-[0.14em] text-neutral-light/65 hover:text-[#A9B57E] transition-colors flex items-baseline gap-3">
                    <span className="tabular-nums text-[#A9B57E]/70">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1">{s.heading}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-8">
            {sections.map((s, i) => (
              <ScrollReveal key={i}>
                <article id={`section-${i}`} className="scroll-mt-28 border-t border-white/[0.06] pt-10 pb-12 first:border-t-0 first:pt-0">
                  <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4 tabular-nums">
                    {String(i + 1).padStart(2, "0")} · Article
                  </div>
                  <h3 className="font-display font-medium text-[22px] md:text-[28px] text-neutral-light tracking-tight leading-snug mb-5">
                    {s.heading}
                  </h3>
                  <p className="text-[14px] md:text-[15px] text-neutral-muted/95 font-light leading-relaxed whitespace-pre-line">
                    {s.content}
                  </p>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
