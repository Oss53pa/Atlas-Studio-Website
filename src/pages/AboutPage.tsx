import { Link } from "react-router-dom";
import { Globe, Cloud, Zap, Smartphone } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { Logo } from "../components/ui/Logo";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { StatCounter } from "../components/ui/StatCounter";

export default function AboutPage() {
  const { content } = useContentContext();

  return (
    <div className="min-h-screen">
      {/* Hero dark */}
      <section className="bg-onyx text-neutral-light pt-24 pb-14 md:pt-28 md:pb-20 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-light mb-4">
              À propos d'<span className="font-logo text-gold">Atlas Studio</span>
            </h1>
            <p className="text-neutral-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Des outils digitaux professionnels, conçus en Afrique, pour l'Afrique et le monde.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story */}
      <section className="bg-warm-bg text-neutral-text py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-3xl mx-auto">
          <ScrollReveal>
            <h2 className="text-2xl font-bold text-neutral-text mb-6">Notre histoire</h2>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-4">{content.about.p1}</p>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-4">{content.about.p2}</p>
            <p className="text-neutral-body text-[15px] leading-relaxed mb-8">{content.about.p3}</p>
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
      <section className="bg-warm-bg text-neutral-text py-20 px-6">
        <ScrollReveal>
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-neutral-text mb-4">Envie d'en savoir plus ?</h2>
            <p className="text-neutral-muted text-sm mb-8">Découvrez nos applications ou contactez notre équipe.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/applications" className="btn-gold">
                Voir les applications
              </Link>
              <Link to="/contact" className="px-6 py-3 rounded-lg font-semibold text-sm border border-warm-border text-neutral-body hover:border-gold/40 transition-colors">
                Nous contacter
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
