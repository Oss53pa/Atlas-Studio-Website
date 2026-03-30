import { Link } from "react-router-dom";
import { Globe, Cloud, Zap, Smartphone } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { Logo } from "../components/ui/Logo";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { StatCounter } from "../components/ui/StatCounter";
import { GridPattern } from "../components/ui/GridPattern";
import { SEOHead } from "../components/ui/SEOHead";

export default function AboutPage() {
  const { content } = useContentContext();

  return (
    <div className="min-h-screen">
      <SEOHead title="A propos" description="Atlas Studio developpe des applications SaaS pour les entreprises africaines. 20 ans d experience en Afrique." canonical="/a-propos" />
      {/* Hero dark */}
      <section className="relative bg-onyx text-neutral-light pt-24 pb-14 md:pt-28 md:pb-20 px-5 md:px-8 overflow-hidden">
        <GridPattern dark />
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-light mb-4">
              À propos d'<span className="font-logo text-gold">Atlas Studio</span>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              20 ans d'exp&eacute;rience terrain. 10 pays. Une obsession : des outils qui marchent vraiment.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story */}
      <section className="bg-warm-bg text-neutral-text py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-neutral-text mb-6">On conna\u00eet vos probl\u00e8mes. On les a v\u00e9cus.</h2>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-4">{content.about.p1}</p>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-4">{content.about.p2}</p>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-8">{content.about.p3}</p>
          </ScrollReveal>

          {/* Timeline */}
          <ScrollReveal>
            <div className="relative pl-8 border-l-2 border-gold/30 space-y-8 mb-16">
              {[
                { year: "2003", text: "D\u00e9but de 20 ans d'accompagnement d'entreprises \u00e0 travers l'Afrique" },
                { year: "2020", text: "Lancement d'Atlas Studio \u2014 transformer l'exp\u00e9rience terrain en logiciel" },
                { year: "Aujourd'hui", text: "500+ entreprises dans 10+ pays font confiance \u00e0 nos apps au quotidien" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-gold border-4 border-warm-bg" />
                  <div className="text-gold text-sm font-bold mb-1">{item.year}</div>
                  <div className="text-neutral-body text-[15px]">{item.text}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Icons row */}
          <ScrollReveal>
            <div className="flex gap-6 flex-wrap mb-16">
              {[
                { icon: Globe, label: "Conçu pour l'Afrique" },
                { icon: Cloud, label: "100% Cloud" },
                { icon: Zap, label: "Simple & rapide" },
                { icon: Smartphone, label: "Multi-plateforme" },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-white border border-warm-border rounded-xl px-5 py-3">
                  <v.icon size={20} className="text-gold" strokeWidth={1.5} />
                  <span className="text-neutral-body text-sm font-semibold">{v.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Values */}
          <ScrollReveal>
            <SectionHeading title="Nos valeurs" />
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.about.values.map((v, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="bg-white border border-warm-border rounded-2xl p-6 card-hover">
                  <div className="text-gold text-sm font-bold mb-2">{v.title}</div>
                  <div className="text-neutral-muted text-[13px] leading-relaxed">{v.desc}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-onyx text-neutral-light py-14 md:py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="flex justify-center gap-12 md:gap-20 flex-wrap">
              {content.stats.map((s, i) => (
                <StatCounter key={i} value={s.value} label={s.label} light />
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-warm-bg text-neutral-text py-14 md:py-20 px-5 md:px-8">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-neutral-text mb-4">Pr\u00eat \u00e0 essayer ?</h2>
            <p className="text-neutral-muted text-sm mb-8">14 jours d'essai gratuit. Op\u00e9rationnel en 5 minutes. Sans carte bancaire.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/portal" className="btn-gold">
                D\u00e9marrer l'essai gratuit
              </Link>
              <Link to="/contact" className="px-6 py-3 rounded-lg font-semibold text-sm border border-warm-border text-neutral-body hover:border-gold/40 transition-colors">
                Demander une d\u00e9mo
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
