import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { AppCard } from "../components/ui/AppCard";
import { TestimonialCard } from "../components/ui/TestimonialCard";
import { SectorBadge } from "../components/ui/SectorBadge";
import { SEOHead } from "../components/ui/SEOHead";
import { FAQItem } from "../components/ui/FAQItem";
import { useState } from "react";

export default function HomePage() {
  const { content } = useContentContext();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <>
      <SEOHead title="Accueil" description="Atlas Studio - Solutions digitales professionnelles pour les entreprises africaines." canonical="/" />

      {/* ===== HERO ===== */}
      <section className="relative bg-onyx text-neutral-light min-h-screen flex items-center justify-center text-center px-5 md:px-8 pt-24 pb-14 md:pt-28 md:pb-20 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] glow-gold pointer-events-none" />
        <div className="relative max-w-[760px]">
          <div className="mb-7">
            <span className="font-logo text-gold text-4xl">Atlas Studio</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-[52px] font-extrabold leading-[1.1] mb-6 tracking-tight">
            {content.hero.title}
          </h1>
          <p className="text-neutral-placeholder text-base leading-relaxed mb-10 max-w-[540px] mx-auto font-light">
            {content.hero.subtitle}
          </p>
          <div className="flex gap-3.5 justify-center flex-wrap mb-[72px]">
            <Link to="/portal" className="btn-gold">{content.hero.cta1}</Link>
            <Link to="/applications" className="btn-outline-light">{content.hero.cta2}</Link>
          </div>
          <div className="flex justify-center border-t border-dark-border pt-12 max-w-[700px] mx-auto">
            {content.stats.map((s, i) => (
              <div key={i} className={`flex-1 text-center px-6 ${i < content.stats.length - 1 ? "border-r border-dark-border" : ""}`}>
                <div className="font-mono text-[32px] font-semibold text-gold mb-1">{s.value}</div>
                <div className="text-xs text-neutral-muted font-light">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <div className="bg-dark-bg2 border-b border-dark-border py-4 px-5 md:px-8">
        <div className="flex items-center justify-center gap-0 flex-wrap">
          {content.trustBar.map((item, i) => (
            <div key={i} className={`text-xs text-neutral-muted px-5 py-1.5 ${i < content.trustBar.length - 1 ? "border-r border-dark-border" : ""}`}>
              <span className="trust-dot" />{item}
            </div>
          ))}
        </div>
      </div>

      {/* ===== PRODUITS ===== */}
      <section className="bg-onyx border-t border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">La plateforme</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-3">Nos Produits</h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[500px] leading-relaxed mb-12">
              Des solutions professionnelles adaptées à vos besoins.
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {content.apps.map((app, i) => (
              <ScrollReveal key={app.id} delay={i * 80}>
                <AppCard app={app} index={i} />
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className="text-center mt-12">
              <Link to="/applications" className="inline-flex items-center gap-2 text-gold font-semibold text-sm hover:gap-3 transition-all duration-300">
                Voir tous nos produits <ArrowRight size={16} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section className="bg-dark-bg2 border-t border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Comment ça marche</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-3">Opérationnel en moins de 30 minutes</h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[500px] leading-relaxed mb-12">
              Aucune installation. Aucun serveur à gérer.
            </p>
          </ScrollReveal>
          <ScrollReveal>
            <div className="steps-grid">
              {content.steps.map((step, i) => (
                <div key={i} className={`p-6 md:p-8 ${i < content.steps.length - 1 ? "border-r border-dark-border" : ""}`}>
                  <div className="h-0.5 bg-dark-border mb-6"><div className="h-0.5 bg-gold w-full" /></div>
                  <div className="font-mono text-[11px] font-semibold text-gold mb-4 tracking-wide">{step.num}</div>
                  <div className="text-[15px] font-semibold text-neutral-light mb-2">{step.title}</div>
                  <div className="text-xs text-neutral-muted font-light leading-relaxed">{step.desc}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== ABOUT PREVIEW ===== */}
      <section className="bg-onyx border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto flex gap-10 md:gap-14 flex-wrap items-center">
          <ScrollReveal className="flex-1 min-w-[320px]">
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">À propos</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-light mb-5">
              <span className="font-logo text-gold">Atlas Studio</span>
            </h2>
            <p className="text-neutral-muted text-[15px] leading-relaxed mb-4 font-light">{content.about.p1}</p>
            <p className="text-neutral-muted text-[15px] leading-relaxed font-light">{content.about.p2}</p>
          </ScrollReveal>
          <ScrollReveal className="flex-1 min-w-[280px]" delay={200}>
            <div className="bg-dark-bg2 border border-dark-border rounded-xl p-8">
              <h3 className="text-neutral-light text-lg font-bold mb-5">Pourquoi nous choisir</h3>
              {content.about.values.map((v, i) => (
                <div key={i} className="mb-5 last:mb-0">
                  <div className="text-gold text-sm font-bold mb-1">{v.title}</div>
                  <div className="text-neutral-muted text-[13px] leading-relaxed font-light">{v.desc}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== SECTORS ===== */}
      <section className="bg-dark-bg2 border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Secteurs</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-3">Tous les secteurs d'activité</h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[500px] leading-relaxed mb-12">
              Nos outils sont généralistes. Ils s'adaptent à votre métier, pas l'inverse.
            </p>
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

      {/* ===== COMPARATIF ===== */}
      <section className="bg-onyx border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Comparatif</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-12">Atlas Studio vs les alternatives</h2>
          </ScrollReveal>
          <ScrollReveal>
            <div className="overflow-x-auto">
              <table className="comp-table">
                <thead><tr>{content.comparatif.headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>
                  {content.comparatif.rows.map((row, ri) => (
                    <tr key={ri} className={row.highlight ? "comp-hl" : ""}>
                      <td>{row.name}</td>
                      {row.values.map((v, vi) => (
                        <td key={vi} className={vi === 0 ? "font-mono" : v.startsWith("✓") ? "text-gold font-bold" : v === "✗" ? "text-neutral-muted/40" : ""}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="bg-dark-bg2 border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Témoignages</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-12">Ils nous font confiance</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {content.testimonials.map((t, i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <div className="bg-dark-bg3 border border-dark-border rounded-xl p-6">
                  <div className="text-gold text-[13px] mb-3 tracking-wider">★★★★★</div>
                  <p className="text-[13px] text-neutral-muted font-light leading-relaxed italic mb-4">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-[38px] h-[38px] rounded-full bg-dark-bg2 border border-dark-border2 flex items-center justify-center text-xs font-semibold text-gold">{t.avatar}</div>
                    <div>
                      <div className="text-[13px] font-semibold text-neutral-light">{t.name}</div>
                      <div className="text-[11px] text-neutral-muted font-light">{t.role} · {t.company}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING TEASER ===== */}
      <section className="bg-onyx border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Tarifs</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-3">Tarifs simples et transparents</h2>
            <p className="text-[15px] text-neutral-muted font-light mb-10">Payez uniquement ce que vous utilisez. Changez ou annulez à tout moment.</p>
          </ScrollReveal>
          <ScrollReveal>
            <div className="flex gap-5 justify-center flex-wrap mb-10">
              <div className="bg-dark-bg2 border border-dark-border rounded-xl p-8 flex-1 min-w-[200px] max-w-[280px]">
                <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Atlas F&A</div>
                <div className="text-gold font-mono text-3xl font-semibold">49 000</div>
                <div className="text-neutral-muted text-sm font-light">FCFA/mois</div>
                <p className="text-neutral-muted text-xs mt-3 font-light">Comptabilité SYSCOHADA</p>
              </div>
              <div className="bg-dark-bg2 border border-dark-border rounded-xl p-8 flex-1 min-w-[200px] max-w-[280px]">
                <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">Apps standalone</div>
                <div className="text-gold font-mono text-3xl font-semibold">dès 25 000</div>
                <div className="text-neutral-muted text-sm font-light">FCFA/mois ou /an</div>
                <p className="text-neutral-muted text-xs mt-3 font-light">Liass'Pilot & Advist</p>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/tarifs" className="btn-gold">Voir tous les tarifs →</Link>
              <Link to="/portal" className="btn-outline-light">Essai gratuit 14 jours</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="bg-dark-bg2 border-b border-dark-border py-20 px-5 md:px-8">
        <div className="max-w-2xl mx-auto">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">FAQ</div>
            <h2 className="text-[34px] font-bold text-neutral-light leading-tight mb-12">Questions fréquentes</h2>
          </ScrollReveal>
          <ScrollReveal>
            {content.faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} isOpen={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="bg-onyx py-20 px-5 md:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-4xl font-bold text-neutral-light mb-3.5">Prêt à simplifier votre gestion ?</h2>
          <p className="text-[15px] text-neutral-muted font-light mb-9 max-w-md mx-auto">
            Rejoignez plus de 500 entreprises qui font confiance à Atlas Studio.
          </p>
          <div className="flex gap-3.5 justify-center flex-wrap">
            <Link to="/portal" className="btn-gold">Démarrer gratuitement</Link>
            <Link to="/contact" className="btn-outline-light">Nous contacter</Link>
          </div>
        </ScrollReveal>
      </section>
    </>
  );
}
