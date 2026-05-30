import { Link } from "react-router-dom";
import { SEOHead } from "../components/ui/SEOHead";
import { AboutHero } from "../components/about/AboutHero";
import { ProblemsGrid } from "../components/about/ProblemsGrid";
import { DifferentiatorsList } from "../components/about/DifferentiatorsList";
import { CredibilitySection } from "../components/about/CredibilitySection";
import { CommitmentsGrid } from "../components/about/CommitmentsGrid";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead
        title="À propos"
        description="Atlas Studio est née d'une frustration vécue pendant 20 ans dans les secteurs pétrolier, minier et retail en Afrique : des outils qui obligent à exporter et retraiter pour obtenir une information utile."
        canonical="/a-propos"
      />

      <AboutHero />
      <ProblemsGrid />
      <DifferentiatorsList />
      <CredibilitySection />
      <CommitmentsGrid />

      {/* § FIN — closing manifesto */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-28 md:py-40 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8 flex items-center gap-3">
            <span className="meta-led" />
            <span>§ FIN — Manifeste</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.98] text-[28px] sm:text-[36px] md:text-[48px] lg:text-[56px] text-neutral-light max-w-5xl mb-12">
            Vos outils peuvent enfin <span className="italic font-light text-neutral-light/70">travailler pour vous</span>.
          </h2>
          <p className="text-[15px] md:text-[17px] text-neutral-muted font-light leading-relaxed max-w-[540px] mb-10">
            14 jours d'essai gratuit. Aucune carte requise. Accès immédiat.
          </p>
          <div className="flex items-baseline gap-8 flex-wrap">
            <Link to="/portal" className="cta-arrow cta-arrow--primary">
              Essai gratuit — 14 jours
            </Link>
            <Link to="/contact" className="cta-arrow">
              Demander une démo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
