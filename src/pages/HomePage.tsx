import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { StatCounter } from "../components/ui/StatCounter";
import { AppCard } from "../components/ui/AppCard";
import { SectorBadge } from "../components/ui/SectorBadge";
import { SEOHead } from "../components/ui/SEOHead";
import { FAQItem } from "../components/ui/FAQItem";
import { StyledText } from "../components/ui/StyledText";
import { useState } from "react";

export default function HomePage() {
  const { content } = useContentContext();
  const { t } = useTranslation();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <>
      <SEOHead title="Accueil" description="Atlas Studio - Solutions digitales professionnelles pour les entreprises africaines." canonical="/" />

      {/* ===== HERO — cinematic ===== */}
      <section className="relative bg-onyx text-neutral-light min-h-screen flex items-center justify-center text-center px-5 md:px-8 pt-24 pb-14 md:pt-28 md:pb-20 overflow-hidden">
        {/* Layered backgrounds */}
        <div className="absolute inset-0 bg-dotgrid opacity-40 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(16,185,129,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(8,8,11,1) 60%, transparent 100%)",
          }}
        />
        <div className="aurora-blob-gold" style={{ top: "10%", left: "50%", transform: "translateX(-50%)" }} />
        <div className="aurora-blob-teal" style={{ bottom: "5%", right: "5%" }} />

        {/* Vignette */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 0%, rgba(8,8,11,0.6) 100%)",
          }}
        />

        <div className="relative max-w-5xl mx-auto hero-anim">
          <div className="mb-8">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium tracking-[0.16em] uppercase mb-6 glass"
              style={{ color: "#34D399" }}
            >
              <Sparkles size={12} className="text-gold" />
              Suite logicielle premium · OHADA
            </span>
            <div>
              <span className="font-logo text-gradient-champagne text-5xl md:text-6xl">Atlas Studio</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-7xl font-semibold leading-[1.05] mb-6 tracking-[-0.025em] text-gradient-light">
            {content.hero.title}
          </h1>
          <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto text-neutral-muted font-light">
            {content.hero.subtitle}
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap mb-14">
            <Link to="/portal" className="btn-gold">
              {t("home.startFree")}
              <ArrowRight size={16} strokeWidth={2.2} />
            </Link>
            <Link to="/applications" className="btn-outline-light">{t("home.seeApps")}</Link>
          </div>
          <div className="relative flex justify-center pt-12 max-w-[760px] mx-auto">
            {/* Refined gradient divider */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.3) 50%, transparent 100%)" }}
            />
            {(content.stats || []).map((s, i) => (
              <div
                key={i}
                className={`flex-1 px-6 ${i < (content.stats || []).length - 1 ? "border-r border-white/[0.06]" : ""}`}
              >
                <StatCounter value={s.value} label={s.label} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== TRUST BAR ===== */}
      <div className="relative bg-ink-100 border-y border-white/[0.05] py-4 px-5 md:px-8">
        <div className="absolute inset-0 bg-dotgrid opacity-30 pointer-events-none" />
        <div className="relative flex items-center justify-center gap-0 flex-wrap trust-anim">
          {(Array.isArray(content.trustBar) ? content.trustBar : []).map((item, i) => (
            <div key={i} className={`text-[12px] text-neutral-muted px-5 py-1.5 ${i < (content.trustBar || []).length - 1 ? "border-r border-white/[0.06]" : ""}`}>
              <span className="trust-dot" /><StyledText>{item}</StyledText>
            </div>
          ))}
        </div>
      </div>

      {/* ===== PRODUITS ===== */}
      <section className="relative bg-onyx border-t border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.platform")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-4 text-gradient-light">{t("home.ourProducts")}</h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[520px] leading-relaxed mb-14">
              {t("home.productsSubtitle")}
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(content.apps || []).map((app, i) => (
              <ScrollReveal key={app.id} delay={i * 90}>
                <AppCard app={app} index={i} />
              </ScrollReveal>
            ))}
          </div>
          <ScrollReveal>
            <div className="text-center mt-14">
              <Link to="/applications" className="inline-flex items-center gap-2 text-gold font-medium text-sm hover:gap-3 transition-all duration-300 group">
                {t("home.seeAllProducts")}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== COMMENT ÇA MARCHE ===== */}
      <section className="relative bg-ink-100 border-t border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] glow-gold pointer-events-none" />
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.howItWorks")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-4 text-gradient-light">{t("home.operationalIn")}</h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[520px] leading-relaxed mb-14">
              {t("home.noInstall")}
            </p>
          </ScrollReveal>
          <div className="steps-grid">
            {(content.steps || []).map((step, i) => (
              <ScrollReveal key={i} delay={i * 130}>
                <div className={`p-7 md:p-9 ${i < (content.steps || []).length - 1 ? "border-r border-white/[0.06]" : ""}`}>
                  <div className="h-px bg-white/[0.06] mb-6 overflow-hidden"><div className="h-px w-full reveal-line" /></div>
                  <div className="font-mono text-[11px] font-semibold text-gold mb-4 tracking-[0.16em]">{step.num}</div>
                  <div className="text-[16px] font-medium text-neutral-light mb-2 leading-snug"><StyledText>{step.title}</StyledText></div>
                  <div className="text-[13px] text-neutral-muted font-light leading-relaxed"><StyledText>{step.desc}</StyledText></div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT PREVIEW ===== */}
      <section className="relative bg-onyx border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
        <div className="relative max-w-site mx-auto flex gap-10 md:gap-14 flex-wrap items-center">
          <ScrollReveal className="flex-1 min-w-[320px] reveal-left">
            <div className="section-eyebrow">{t("home.aboutLabel")}</div>
            <h2 className="text-3xl md:text-4xl font-semibold text-neutral-light mb-6 tracking-tight">
              <span className="font-logo text-gradient-champagne text-4xl md:text-5xl">Atlas Studio</span>
            </h2>
            <p className="text-neutral-muted text-[15px] leading-relaxed mb-4 font-light">{content.about?.p1}</p>
            <p className="text-neutral-muted text-[15px] leading-relaxed font-light">{content.about?.p2}</p>
          </ScrollReveal>
          <ScrollReveal className="flex-1 min-w-[280px] reveal-right" delay={200}>
            <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-9 shadow-premium">
              <div className="absolute -top-px left-[10%] right-[10%] h-px"
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.55) 50%, transparent 100%)" }}
              />
              <h3 className="text-neutral-light text-lg font-semibold mb-6 tracking-tight">{t("home.whyChooseUs")}</h3>
              {(content.about?.values || []).map((v, i) => (
                <div key={i} className="mb-5 last:mb-0">
                  <div className="text-gold text-sm font-semibold mb-1 tracking-wide">{v.title}</div>
                  <div className="text-neutral-muted text-[13px] leading-relaxed font-light">{v.desc}</div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== SECTORS ===== */}
      <section className="relative bg-ink-100 border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.sectors")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-4 text-gradient-light">{t("home.allSectors")}</h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[520px] leading-relaxed mb-14">
              {t("home.sectorsSubtitle")}
            </p>
          </ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(content.sectors || []).map((s, i) => (
              <ScrollReveal key={i} delay={i * 50}>
                <SectorBadge icon={s.icon} name={s.name} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARATIF ===== */}
      <section className="relative bg-onyx border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.comparison")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-12 text-gradient-light">{t("home.vsAlternatives")}</h2>
          </ScrollReveal>
          <ScrollReveal>
            <div className="overflow-x-auto rounded-2xl shadow-premium">
              <table className="comp-table">
                <thead><tr>{(content.comparatif?.headers || []).map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                <tbody>
                  {(content.comparatif?.rows || []).map((row, ri) => (
                    <tr key={ri} className={row.highlight ? "comp-hl" : ""}>
                      <td>{row.name}</td>
                      {row.values.map((v, vi) => (
                        <td key={vi} className={vi === 0 ? "font-mono" : v.startsWith("✓") ? "text-gold font-medium" : v === "✗" ? "text-neutral-muted/40" : ""}>
                          <StyledText>{v}</StyledText>
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
      <section className="relative bg-ink-100 border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.testimonials")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-12 text-gradient-light">{t("home.trustedBy")}</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(content.testimonials || []).map((tm, i) => (
              <ScrollReveal key={i} delay={i * 110}>
                <div className="relative bg-ink-200 border border-white/[0.06] rounded-2xl p-6 card-hover overflow-hidden">
                  <div className="absolute -top-px left-[10%] right-[10%] h-px"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.45) 50%, transparent 100%)" }}
                  />
                  <div className="text-gold text-[14px] mb-3 tracking-[0.2em]">★★★★★</div>
                  <p className="text-[13px] text-neutral-muted font-light leading-relaxed italic mb-5">"{tm.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 flex items-center justify-center text-xs font-semibold text-gold">{tm.avatar}</div>
                    <div>
                      <div className="text-[13px] font-semibold text-neutral-light">{tm.name}</div>
                      <div className="text-[11px] text-neutral-muted font-light">{tm.role} · {tm.company}</div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING TEASER ===== */}
      <section className="relative bg-onyx border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] glow-gold opacity-50 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>{t("home.pricingLabel")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-4 text-gradient-light">{t("home.simplePricing")}</h2>
            <p className="text-[15px] text-neutral-muted font-light mb-12">{t("home.pricingSubtitle")}</p>
          </ScrollReveal>
          <ScrollReveal>
            <div className="flex gap-5 justify-center flex-wrap mb-12">
              <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-9 flex-1 min-w-[220px] max-w-[300px] card-hover overflow-hidden">
                <div className="absolute -top-px left-[10%] right-[10%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.5) 50%, transparent 100%)" }}
                />
                <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-[0.16em] mb-3">{t("home.atlasFNA")}</div>
                <div className="text-gradient-gold font-mono text-4xl font-semibold tracking-tight">99 000</div>
                <div className="text-neutral-muted text-sm font-light mt-1">FCFA/mois</div>
                <p className="text-neutral-muted text-xs mt-4 font-light leading-relaxed">{t("home.accountingSyscohada")}</p>
              </div>
              <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-9 flex-1 min-w-[220px] max-w-[300px] card-hover overflow-hidden">
                <div className="absolute -top-px left-[10%] right-[10%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.5) 50%, transparent 100%)" }}
                />
                <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-[0.16em] mb-3">{t("home.standaloneAppsLabel")}</div>
                <div className="text-gradient-gold font-mono text-4xl font-semibold tracking-tight">dès 25 000</div>
                <div className="text-neutral-muted text-sm font-light mt-1">{t("home.perMonthOrYear")}</div>
                <p className="text-neutral-muted text-xs mt-4 font-light leading-relaxed">{t("home.liasspilotAdvist")}</p>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/tarifs" className="btn-gold">
                {t("home.seeAllPricingCta")}
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link to="/tarifs" className="btn-outline-light">Voir les tarifs</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative bg-ink-100 border-b border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="relative max-w-2xl mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.faqLabel")}</div>
            <h2 className="text-[36px] md:text-[44px] font-semibold text-neutral-light leading-[1.1] tracking-tight mb-12 text-gradient-light">{t("home.faqTitle")}</h2>
          </ScrollReveal>
          <ScrollReveal>
            {(content.faqs || []).map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} isOpen={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative bg-onyx py-24 px-5 md:px-8 text-center overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] glow-gold pointer-events-none" />
        <div className="relative">
          <ScrollReveal>
            <h2 className="text-4xl md:text-5xl font-semibold text-gradient-light mb-4 tracking-tight">{t("home.readyTitle")}</h2>
            <p className="text-[15px] text-neutral-muted font-light mb-10 max-w-md mx-auto leading-relaxed">
              {t("home.readySubtitle")}
            </p>
            <div className="flex gap-3.5 justify-center flex-wrap">
              <Link to="/portal" className="btn-gold">
                {t("home.startFree")}
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link to="/contact" className="btn-outline-light">{t("home.contactUs")}</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
