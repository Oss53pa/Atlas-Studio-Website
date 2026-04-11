import { Link } from "react-router-dom";
import { ScrollReveal } from "../components/ui/ScrollReveal";
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

      {/* ===== CTA final ===== */}
      <section className="bg-onyx py-20 md:py-28 px-5 md:px-8 text-center">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-normal text-neutral-light leading-tight tracking-tight mb-4">
              Prêt à voir la différence ?
            </h2>
            <p className="text-neutral-muted text-[15px] md:text-base font-light leading-relaxed mb-10">
              14 jours d'essai gratuit. Aucune carte requise. Accès immédiat.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link to="/portal" className="btn-gold">
                Essai gratuit — 14 jours
              </Link>
              <Link to="/contact" className="btn-outline-light">
                Demander une démo
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
