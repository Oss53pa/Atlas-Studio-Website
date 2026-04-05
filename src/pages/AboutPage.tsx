import { Link } from "react-router-dom";
import { Globe, Cloud, Zap, Smartphone } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { StatCounter } from "../components/ui/StatCounter";
import { SEOHead } from "../components/ui/SEOHead";

export default function AboutPage() {
  const { content } = useContentContext();

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="A propos" description="Atlas Studio développe des applications SaaS pour les entreprises africaines." canonical="/a-propos" />

      {/* Hero */}
      <section className="pt-24 pb-14 md:pt-28 md:pb-20 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-normal text-neutral-light mb-4">
              À propos d'<span className="font-logo text-gold">Atlas Studio</span>
            </h1>
            <p className="text-neutral-muted text-base font-light max-w-xl mx-auto">
              Des outils digitaux professionnels, conçus en Afrique, pour l'Afrique et le monde.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story */}
      <section className="py-16 md:py-24 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-normal text-gold uppercase tracking-[0.1em] mb-3">Notre histoire</div>
            <p className="text-neutral-muted text-[15px] leading-relaxed mb-4 font-light">{content.about.p1}</p>
            <p className="text-neutral-muted text-[15px] leading-relaxed mb-4 font-light">{content.about.p2}</p>
            <p className="text-neutral-muted text-[15px] leading-relaxed mb-8 font-light">{content.about.p3}</p>
          </ScrollReveal>

          {/* Timeline */}
          <ScrollReveal>
            <div className="relative pl-8 border-l-2 border-gold/30 space-y-8 mb-16">
              {[
                { year: "2003", text: "Plus de 20 ans d'expérience opérationnelle en Afrique" },
                { year: "2020", text: "Naissance d'Atlas Studio — la suite SaaS pour les pros africains" },
                { year: "Aujourd'hui", text: "10+ pays, 500+ entreprises, 3 produits et une vision panafricaine" },
              ].map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-gold border-4 border-onyx" />
                  <div className="text-gold text-sm font-normal mb-1">{item.year}</div>
                  <div className="text-neutral-muted text-[15px] font-light">{item.text}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Badges */}
          <ScrollReveal>
            <div className="flex gap-4 flex-wrap mb-16">
              {[
                { icon: Globe, label: "Conçu pour l'Afrique" },
                { icon: Cloud, label: "100% Cloud" },
                { icon: Zap, label: "Simple & rapide" },
                { icon: Smartphone, label: "Multi-plateforme" },
              ].map((v, i) => (
                <div key={i} className="flex items-center gap-2.5 bg-dark-bg2 border border-dark-border rounded-xl px-5 py-3">
                  <v.icon size={20} className="text-gold" strokeWidth={1.5} />
                  <span className="text-neutral-light text-sm font-normal">{v.label}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Values */}
          <ScrollReveal>
            <div className="text-[11px] font-normal text-gold uppercase tracking-[0.1em] mb-3">Nos valeurs</div>
            <h2 className="text-[34px] font-normal text-neutral-light leading-tight mb-8">Ce qui nous guide</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {content.about.values.map((v, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="bg-dark-bg2 border border-dark-border rounded-xl p-6 card-hover">
                  <div className="text-gold text-sm font-normal mb-2">{v.title}</div>
                  <div className="text-neutral-muted text-[13px] leading-relaxed font-light">{v.desc}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-dark-bg2 border-b border-dark-border py-14 md:py-20 px-5 md:px-8">
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
      <section className="py-14 md:py-20 px-5 md:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-2xl font-normal text-neutral-light mb-4">Envie d'en savoir plus ?</h2>
          <p className="text-neutral-muted text-sm font-light mb-8">Découvrez nos applications ou contactez notre équipe.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/applications" className="btn-gold">Voir les applications</Link>
            <Link to="/contact" className="btn-outline-light">Nous contacter</Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
