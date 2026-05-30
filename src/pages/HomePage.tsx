import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { AppCard } from "../components/ui/AppCard";
import { SectorBadge } from "../components/ui/SectorBadge";
import { SEOHead } from "../components/ui/SEOHead";
import { FAQItem } from "../components/ui/FAQItem";
import { StyledText } from "../components/ui/StyledText";
import { AtlasConstellation } from "../components/sections/AtlasConstellation";
import { useState } from "react";

export default function HomePage() {
  const { content } = useContentContext();
  const { t } = useTranslation();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  return (
    <>
      <SEOHead title="Accueil" description="Atlas Studio - Solutions digitales professionnelles pour les entreprises africaines." canonical="/" />

      {/* ════════════════════════════════════════════════════════════════
           HERO — éditorial asymétrique, signature OHADA, data-tape
           Refonte volontairement non-générique : grille technique de fond,
           kinetic typography, constellation des 17 États OHADA à droite.
         ════════════════════════════════════════════════════════════════ */}
      {(() => {
        const rawTitle = content.hero?.title || "";
        const parts = rawTitle.split(/\.\s+/);
        const line1 = (parts[0] || "").trim();
        const line1Words = line1.split(" ");
        const line1Last = line1Words.pop() || "";
        const line1Rest = line1Words.join(" ");
        const line2 = parts.slice(1).join(". ").replace(/\.+$/, "");

        // Nombre de produits actifs — suit le catalogue réel (logique reprise de main).
        const productCount = content.apps?.length ?? 0;

        const tapeItems = [
          ...(content.stats || []).map(s => ({
            glyph: "▎",
            value: /produit/i.test(s.label) && productCount > 0 ? String(productCount) : s.value,
            label: s.label,
          })),
          ...(Array.isArray(content.trustBar) ? content.trustBar : []).map(it => ({ glyph: "◇", value: it, label: "" })),
        ];

        return (
          <section className="relative bg-onyx text-neutral-light min-h-screen flex flex-col px-5 md:px-10 lg:px-16 pt-28 md:pt-32 pb-0 overflow-hidden">
            {/* fond : grille technique + halo kaki latéral */}
            <div className="absolute inset-0 hero-techgrid pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(ellipse 60% 50% at 18% 35%, rgba(169,181,126,0.13) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 85% 80%, rgba(200,166,114,0.06) 0%, transparent 60%)" }} />

            {/* META STRIP — bandeau éditorial supérieur */}
            <div className="relative max-w-[1280px] mx-auto w-full flex items-baseline justify-between gap-4 flex-wrap mb-12 md:mb-16">
              <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4">
                <span className="meta-led" />
                <span>Édition MMXXVI</span>
                <span className="text-neutral-light/25">/</span>
                <span>OHADA · 17 États</span>
                {productCount > 0 && (
                  <>
                    <span className="text-neutral-light/25 hidden sm:inline">/</span>
                    <span className="hidden sm:inline">{productCount} produits actifs</span>
                  </>
                )}
              </div>
              <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/45 hidden md:block">
                Suite logicielle — Afrique francophone
              </div>
            </div>

            {/* CONTENU PRINCIPAL — grille 12 colonnes asymétrique */}
            <div className="relative max-w-[1280px] mx-auto w-full flex-1 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center pb-16 lg:pb-24">

              {/* COL GAUCHE — édito */}
              <div className="lg:col-span-7 hero-anim">
                <div className="font-logo text-gradient-champagne text-[28px] md:text-[34px] leading-none mb-6 md:mb-8">
                  Atlas Studio
                </div>

                <h1 className="font-display font-medium tracking-[-0.035em]
                               text-[44px] sm:text-[56px] md:text-[76px] lg:text-[88px]
                               leading-[0.96] mb-8 md:mb-10">
                  <span>
                    {line1Rest}{line1Rest ? " " : ""}
                    <span className="kinetic-word">{line1Last}</span>
                    {line1 ? "." : ""}
                  </span>
                  {line2 && (
                    <>
                      <br />
                      <span className="italic font-light text-neutral-light/75 text-[78%]">
                        {line2}.
                      </span>
                    </>
                  )}
                </h1>

                <p className="text-[16px] md:text-[18px] leading-relaxed text-neutral-muted font-light max-w-[540px] mb-10 md:mb-14">
                  {content.hero?.subtitle}
                </p>

                <div className="flex items-baseline gap-6 md:gap-8 flex-wrap">
                  <Link to="/portal" className="cta-arrow cta-arrow--primary">
                    {t("home.startFree")}
                  </Link>
                  <Link to="/applications" className="cta-arrow">
                    {t("home.seeApps")}
                  </Link>
                </div>
              </div>

              {/* COL DROITE — constellation OHADA, signature visuelle */}
              <div className="lg:col-span-5">
                <div className="relative aspect-square w-full max-w-[460px] lg:max-w-[520px] mx-auto lg:ml-auto lg:mr-0">
                  {/* repères mathématiques aux quatre coins */}
                  <div className="absolute -top-3 -left-3 w-6 h-6 border-t border-l border-[#A9B57E]/40" />
                  <div className="absolute -top-3 -right-3 w-6 h-6 border-t border-r border-[#A9B57E]/40" />
                  <div className="absolute -bottom-3 -left-3 w-6 h-6 border-b border-l border-[#A9B57E]/40" />
                  <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b border-r border-[#A9B57E]/40" />
                  <AtlasConstellation className="w-full h-full" />
                </div>
                {/* Légende discrète sous la constellation, en mono */}
                <div className="hidden lg:flex justify-between items-baseline mt-4 max-w-[520px] ml-auto meta-mono text-[10px] tracking-[0.2em] uppercase text-neutral-light/40">
                  <span>UEMOA · 8</span>
                  <span>CEMAC · 6</span>
                  <span>Hors zone · 3</span>
                </div>
              </div>
            </div>

            {/* DATA TAPE — bande défilante de données ; remplace la trust-bar */}
            <div className="relative -mx-5 md:-mx-10 lg:-mx-16 border-t border-white/[0.08] bg-black/20 backdrop-blur-[2px]">
              <div className="overflow-hidden">
                <div className="data-tape py-4">
                  {tapeItems.concat(tapeItems).map((it, i) => (
                    <span key={i} className="flex items-baseline gap-3 px-8 meta-mono text-[11px] tracking-[0.18em] uppercase whitespace-nowrap">
                      <span className="text-[#A9B57E]">{it.glyph}</span>
                      <span className="text-neutral-light/85"><StyledText>{it.value}</StyledText></span>
                      {it.label && <span className="text-neutral-light/45"><StyledText>{it.label}</StyledText></span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* ===== PRODUITS ===== */}
      <section className="relative bg-onyx border-t border-white/[0.04] py-24 px-5 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="section-eyebrow">{t("home.platform")}</div>
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-4 text-gradient-light">{t("home.ourProducts")}</h2>
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
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-4 text-gradient-light">{t("home.operationalIn")}</h2>
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
                style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.55) 50%, transparent 100%)" }}
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
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-4 text-gradient-light">{t("home.allSectors")}</h2>
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
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-12 text-gradient-light">{t("home.vsAlternatives")}</h2>
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
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-12 text-gradient-light">{t("home.trustedBy")}</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {(content.testimonials || []).map((tm, i) => (
              <ScrollReveal key={i} delay={i * 110}>
                <div className="relative bg-ink-200 border border-white/[0.05] rounded-2xl p-6 card-hover shadow-premium overflow-hidden">
                  <div className="absolute -top-px left-[10%] right-[10%] h-px"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.45) 50%, transparent 100%)" }}
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
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-4 text-gradient-light">{t("home.simplePricing")}</h2>
            <p className="text-[15px] text-neutral-muted font-light mb-12">{t("home.pricingSubtitle")}</p>
          </ScrollReveal>
          <ScrollReveal>
            <div className="flex gap-5 justify-center flex-wrap mb-12">
              <div className="relative bg-ink-100 border border-white/[0.05] rounded-2xl p-9 flex-1 min-w-[220px] max-w-[300px] card-hover shadow-premium overflow-hidden">
                <div className="absolute -top-px left-[10%] right-[10%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.5) 50%, transparent 100%)" }}
                />
                <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-[0.16em] mb-3">{t("home.atlasFNA")}</div>
                <div className="text-gradient-gold font-mono text-4xl font-semibold tracking-tight">99 000</div>
                <div className="text-neutral-muted text-sm font-light mt-1">FCFA/mois</div>
                <p className="text-neutral-muted text-xs mt-4 font-light leading-relaxed">{t("home.accountingSyscohada")}</p>
              </div>
              <div className="relative bg-ink-100 border border-white/[0.05] rounded-2xl p-9 flex-1 min-w-[220px] max-w-[300px] card-hover shadow-premium overflow-hidden">
                <div className="absolute -top-px left-[10%] right-[10%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.5) 50%, transparent 100%)" }}
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
            <h2 className="text-[36px] md:text-[44px] font-medium text-neutral-light leading-[1.12] tracking-tight mb-12 text-gradient-light">{t("home.faqTitle")}</h2>
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
            <h2 className="text-4xl md:text-5xl font-medium text-gradient-light mb-4 tracking-tight">{t("home.readyTitle")}</h2>
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
