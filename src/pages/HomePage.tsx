import { Link } from "react-router-dom";
import { Globe, Cloud, Zap, Smartphone, ArrowRight } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { Logo } from "../components/ui/Logo";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { StatCounter } from "../components/ui/StatCounter";
import { AppCard } from "../components/ui/AppCard";
import { TestimonialCard } from "../components/ui/TestimonialCard";
import { SectorBadge } from "../components/ui/SectorBadge";

export default function HomePage() {
  const { content } = useContentContext();

  return (
    <>
      {/* ===== HERO (Dark) ===== */}
      <section className="bg-onyx text-neutral-light min-h-screen flex items-center justify-center text-center px-5 md:px-8 pt-24 pb-14 md:pt-28 md:pb-20">
        <div className="max-w-3xl">
          <div className="mb-8">
            <Logo size={56} color="text-neutral-light" />
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-neutral-light leading-tight mb-6 tracking-tight">
            {content.hero.title}
          </h1>
          <p className="text-neutral-400 text-base md:text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            {content.hero.subtitle}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/portal" className="btn-gold">
              {content.hero.cta1}
            </Link>
            <Link to="/applications" className="btn-outline-light">
              {content.hero.cta2}
            </Link>
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-12 md:gap-16 mt-20 flex-wrap">
            {content.stats.map((s, i) => (
              <StatCounter key={i} value={s.value} label={s.label} light />
            ))}
          </div>
        </div>
      </section>

      {/* ===== APPS PREVIEW (Light) ===== */}
      <section className="bg-warm-bg text-neutral-text py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <SectionHeading
              title="Nos Produits"
              subtitle="13 modules ERP et 9 apps standalone — choisissez ce dont vous avez besoin."
            />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {content.apps.slice(0, 6).map((app, i) => (
              <ScrollReveal key={app.id} delay={i * 80}>
                <AppCard app={app} index={i} />
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal>
            <div className="text-center mt-12">
              <Link
                to="/applications"
                className="inline-flex items-center gap-2 text-gold font-semibold text-sm hover:gap-3 transition-all duration-300"
              >
                Voir les 22 produits <ArrowRight size={16} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== ABOUT PREVIEW (Light) ===== */}
      <section className="bg-white py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-site mx-auto flex gap-10 md:gap-14 flex-wrap items-center">
          <ScrollReveal className="flex-1 min-w-[320px]">
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-text mb-1">
              À propos d'
            </h2>
            <div className="mb-5">
              <Logo size={36} color="text-gold" />
            </div>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-4">{content.about.p1}</p>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-6">{content.about.p2}</p>

            <div className="flex gap-5 flex-wrap">
              {[
                { icon: Globe, label: "Conçu pour l'Afrique" },
                { icon: Cloud, label: "100% Cloud" },
                { icon: Zap, label: "Simple & rapide" },
                { icon: Smartphone, label: "Multi-plateforme" },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <v.icon size={18} className="text-gold" strokeWidth={1.5} />
                  <span className="text-neutral-body text-sm font-semibold">{v.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          <ScrollReveal className="flex-1 min-w-[280px]" delay={200}>
            <div className="bg-warm-bg border border-warm-border rounded-2xl p-8">
              <h3 className="text-neutral-text text-lg font-bold mb-5">Pourquoi nous choisir</h3>
              {content.about.values.map((v, i) => (
                <div key={i} className="mb-5 last:mb-0">
                  <div className="text-gold text-sm font-bold mb-1">{v.title}</div>
                  <div className="text-neutral-muted text-[13px] leading-relaxed">{v.desc}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== SECTORS (Light) ===== */}
      <section className="bg-warm-bg text-neutral-text py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <SectionHeading
              title="Tous les secteurs d'activité"
              subtitle="Nos outils sont généralistes. Ils s'adaptent à votre métier, pas l'inverse."
            />
          </ScrollReveal>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {content.sectors.map((s, i) => (
              <ScrollReveal key={i} delay={i * 50}>
                <SectorBadge icon={s.icon} name={s.name} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS (Light) ===== */}
      <section className="bg-white py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <SectionHeading title="Ils nous font confiance" />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <TestimonialCard {...t} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING TEASER (Light) ===== */}
      <section className="bg-warm-bg text-neutral-text py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <SectionHeading
              title="Tarifs simples et transparents"
              subtitle="Modules ERP dès 19/mois, apps standalone dès 0/mois. Payez uniquement ce que vous utilisez."
            />
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex gap-5 justify-center flex-wrap mb-10">
              <div className="bg-white border border-warm-border rounded-2xl p-8 flex-1 min-w-[200px] max-w-[280px]">
                <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Modules ERP</div>
                <div className="text-gold text-4xl font-extrabold">19</div>
                <div className="text-neutral-placeholder text-sm">/mois par module</div>
                <p className="text-neutral-muted text-xs mt-3">13 modules disponibles</p>
              </div>
              <div className="bg-white border border-warm-border rounded-2xl p-8 flex-1 min-w-[200px] max-w-[280px]">
                <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Apps standalone</div>
                <div className="text-gold text-4xl font-extrabold">0</div>
                <div className="text-neutral-placeholder text-sm">/mois (freemium)</div>
                <p className="text-neutral-muted text-xs mt-3">9 apps disponibles</p>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/tarifs" className="btn-gold">
                Voir tous les tarifs &rarr;
              </Link>
              <Link to="/portal" className="px-6 py-3 rounded-lg font-semibold text-sm border border-warm-border text-neutral-body hover:border-gold/40 transition-colors">
                Essai gratuit 14 jours
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CTA FINAL (Dark) ===== */}
      <section className="bg-onyx text-neutral-light py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-light mb-4">
              Prêt à simplifier votre gestion ?
            </h2>
            <p className="text-neutral-400 text-[15px] mb-10 max-w-md mx-auto leading-relaxed">
              Rejoignez plus de 500 entreprises qui font confiance à Atlas Studio pour accélérer leur transformation digitale.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/portal" className="btn-gold">
                Démarrer gratuitement
              </Link>
              <Link to="/contact" className="btn-outline-light">
                Nous contacter
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
