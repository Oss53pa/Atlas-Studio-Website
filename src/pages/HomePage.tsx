import { Link } from "react-router-dom";
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
                               text-[32px] sm:text-[40px] md:text-[52px] lg:text-[60px]
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

      {/* ════════════════════════════════════════════════════════════════
           § 02 — CATALOGUE
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-end mb-14 md:mb-20">
            <div className="lg:col-span-7">
              <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
                § 02 — {t("home.platform")}
              </div>
              <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[26px] sm:text-[24px] md:text-[28px] lg:text-[32px] text-neutral-light">
                Une suite.{" "}
                <span className="kinetic-word">
                  {content.apps?.length ?? 0} apps
                </span>{" "}
                <br className="hidden md:block" />
                <span className="italic font-light text-neutral-light/75">pensées pour l'OHADA.</span>
              </h2>
            </div>
            <div className="lg:col-span-5 lg:text-right">
              <div className="meta-mono text-[11px] tracking-[0.2em] uppercase text-neutral-light/40 mb-3">
                Catalogue actif
              </div>
              <div className="flex flex-wrap lg:justify-end gap-x-3 gap-y-1.5 meta-mono text-[12px] text-neutral-light/70">
                {(content.apps || []).map((app, i, arr) => (
                  <span key={app.id}>
                    {app.name}
                    {i < arr.length - 1 && <span className="text-neutral-light/25"> · </span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {(content.apps || []).map((app, i) => (
              <ScrollReveal key={app.id} delay={i * 80}>
                <AppCard app={app} index={i} />
              </ScrollReveal>
            ))}
          </div>

          <div className="mt-16 flex items-baseline justify-between gap-4 flex-wrap">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/35">
              Fin de section · 02 / 09
            </div>
            <Link to="/applications" className="cta-arrow">
              {t("home.seeAllProducts")}
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § 03 — MÉTHODE — timeline typographique alternée
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1100px] mx-auto">
          <div className="mb-14 md:mb-20">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § 03 — {t("home.howItWorks")}
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[26px] sm:text-[24px] md:text-[28px] lg:text-[32px] text-neutral-light max-w-3xl">
              {t("home.operationalIn")}
            </h2>
            <p className="text-[15px] text-neutral-muted font-light max-w-[520px] leading-relaxed mt-6">
              {t("home.noInstall")}
            </p>
          </div>

          <div className="relative">
            {(content.steps || []).map((step, i) => {
              const right = i % 2 === 1;
              return (
                <ScrollReveal key={i} delay={i * 80}>
                  <div className={`grid grid-cols-12 gap-4 md:gap-8 py-8 md:py-10 border-t border-white/[0.06] ${i === (content.steps || []).length - 1 ? "border-b" : ""}`}>
                    <div className={`col-span-12 ${right ? "md:col-start-2 md:col-span-2" : "md:col-span-2"} flex items-baseline`}>
                      <span className="font-display font-light text-[36px] md:text-[52px] leading-none text-[#A9B57E]/80 tracking-tighter">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className={`col-span-12 ${right ? "md:col-start-5 md:col-span-8 md:text-right" : "md:col-span-8"}`}>
                      <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40 mb-3">
                        <StyledText>{step.num}</StyledText>
                      </div>
                      <h3 className="font-display font-medium text-[22px] md:text-[28px] leading-tight text-neutral-light mb-3 tracking-[-0.02em]">
                        <StyledText>{step.title}</StyledText>
                      </h3>
                      <p className={`text-[14px] md:text-[15px] text-neutral-muted font-light leading-relaxed max-w-[520px] ${right ? "md:ml-auto" : ""}`}>
                        <StyledText>{step.desc}</StyledText>
                      </p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § 04 — MANIFESTE — pull quote + ledger
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 hero-techgrid opacity-60 pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-8">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § 04 — {t("home.aboutLabel")}
            </div>
            <blockquote className="font-display font-medium tracking-[-0.025em] leading-[1.06] text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] text-neutral-light mb-8">
              <span className="text-[#A9B57E] font-light italic mr-2">«</span>
              <span className="italic font-light">{content.about?.p1}</span>
              <span className="text-[#A9B57E] font-light italic ml-1">»</span>
            </blockquote>
            <p className="text-[15px] md:text-[16px] text-neutral-muted font-light leading-relaxed max-w-[640px] mb-8">
              {content.about?.p2}
            </p>
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-neutral-light/45">
              <span className="font-logo text-gradient-champagne text-[20px] tracking-normal normal-case mr-3">Atlas Studio</span>
              · Origine du projet
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40 mb-5">
              Ledger
            </div>
            <dl className="space-y-5">
              {(content.about?.values || []).map((v, i) => (
                <div key={i} className="border-t border-white/[0.06] pt-4">
                  <dt className="meta-mono text-[10px] tracking-[0.18em] uppercase text-[#A9B57E] mb-1.5">
                    {String(i + 1).padStart(2, "0")} · {v.title}
                  </dt>
                  <dd className="text-[13px] text-neutral-muted font-light leading-relaxed">
                    {v.desc}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § 05 — SECTEURS
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-28 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
            <div className="lg:col-span-7">
              <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
                § 05 — {t("home.sectors")}
              </div>
              <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[30px] lg:text-[36px] text-neutral-light">
                {t("home.allSectors")}
              </h2>
            </div>
            <div className="lg:col-span-5 lg:text-right">
              <p className="text-[14px] text-neutral-muted font-light leading-relaxed lg:ml-auto max-w-[440px]">
                {t("home.sectorsSubtitle")}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(content.sectors || []).map((s, i) => (
              <ScrollReveal key={i} delay={i * 40}>
                <SectorBadge icon={s.icon} name={s.name} />
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § 06 — PREUVE — tableau comparatif
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-12 items-end">
            <div className="lg:col-span-7">
              <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
                § 06 — {t("home.comparison")}
              </div>
              <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[30px] lg:text-[36px] text-neutral-light">
                {t("home.vsAlternatives")}
              </h2>
            </div>
            <div className="lg:col-span-5 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45">
              Recoupé sur le marché OHADA · {new Date().getFullYear()}
            </div>
          </div>
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

      {/* ════════════════════════════════════════════════════════════════
           § 07 — TÉMOIGNAGES — hero quote + ledger compact
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
            § 07 — {t("home.testimonials")}
          </div>
          <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[30px] lg:text-[36px] text-neutral-light mb-14 md:mb-20 max-w-3xl">
            {t("home.trustedBy")}
          </h2>

          {(() => {
            const list = content.testimonials || [];
            const [lead, ...rest] = list;
            if (!lead) return null;
            return (
              <>
                {/* lead testimonial */}
                <ScrollReveal>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-14 md:mb-20">
                    <div className="lg:col-span-8">
                      <div className="text-[#A9B57E] text-[15px] mb-6 tracking-[0.3em]">★ ★ ★ ★ ★</div>
                      <blockquote className="font-display font-light italic tracking-[-0.02em] leading-[1.12] text-[24px] md:text-[34px] lg:text-[40px] text-neutral-light">
                        <span className="text-[#A9B57E] font-normal mr-2">«</span>
                        {lead.text}
                        <span className="text-[#A9B57E] font-normal ml-1">»</span>
                      </blockquote>
                    </div>
                    <div className="lg:col-span-4 lg:border-l border-white/[0.06] lg:pl-10">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/25 to-gold/5 border border-gold/25 flex items-center justify-center text-sm font-semibold text-gold">{lead.avatar}</div>
                        <div>
                          <div className="text-[14px] font-semibold text-neutral-light">{lead.name}</div>
                          <div className="text-[11px] text-neutral-muted font-light">{lead.role}</div>
                        </div>
                      </div>
                      <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mt-4">
                        {lead.company}
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* autres témoignages — format compact ledger */}
                {rest.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/[0.06] pt-10">
                    {rest.map((tm, i) => (
                      <ScrollReveal key={i} delay={i * 80}>
                        <div className="relative">
                          <div className="text-[#A9B57E] text-[11px] mb-3 tracking-[0.3em]">★ ★ ★ ★ ★</div>
                          <p className="text-[13px] text-neutral-light/85 font-light italic leading-relaxed mb-4">
                            « {tm.text} »
                          </p>
                          <div className="meta-mono text-[10px] tracking-[0.18em] uppercase text-neutral-light/55">
                            {tm.name} · <span className="text-neutral-light/35">{tm.company}</span>
                          </div>
                        </div>
                      </ScrollReveal>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § 08 — TARIFS — ligne unique éditoriale
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
            § 08 — {t("home.pricingLabel")}
          </div>
          <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.02] text-[28px] sm:text-[36px] md:text-[44px] lg:text-[52px] text-neutral-light mb-4">
            {t("home.simplePricing")}
          </h2>
          <p className="text-[16px] md:text-[18px] text-neutral-muted font-light max-w-[640px] leading-relaxed mb-14">
            {t("home.pricingSubtitle")}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 max-w-3xl mb-14 border-t border-white/[0.06] pt-10">
            <div>
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-3">
                {t("home.atlasFNA")}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display font-medium text-[32px] md:text-[40px] leading-none text-[#A9B57E] tracking-tight tabular-nums whitespace-nowrap">99 000</span>
                <span className="text-neutral-muted text-[12px] md:text-[13px] font-light whitespace-nowrap">FCFA/mois</span>
              </div>
              <p className="text-[13px] text-neutral-muted font-light mt-3 max-w-[300px]">{t("home.accountingSyscohada")}</p>
            </div>
            <div>
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-3">
                {t("home.standaloneAppsLabel")}
              </div>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-display font-light italic text-[18px] md:text-[22px] leading-none text-neutral-light/70 mr-0.5">dès</span>
                <span className="font-display font-medium text-[32px] md:text-[40px] leading-none text-[#A9B57E] tracking-tight tabular-nums whitespace-nowrap">25 000</span>
                <span className="text-neutral-muted text-[12px] md:text-[13px] font-light whitespace-nowrap">{t("home.perMonthOrYear")}</span>
              </div>
              <p className="text-[13px] text-neutral-muted font-light mt-3 max-w-[300px]">{t("home.liasspilotAdvist")}</p>
            </div>
          </div>

          <div className="flex items-baseline gap-8 flex-wrap">
            <Link to="/tarifs" className="cta-arrow cta-arrow--primary">
              {t("home.seeAllPricingCta")}
            </Link>
            <Link to="/tarifs" className="cta-arrow">
              Comparer les plans
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § 09 — QUESTIONS
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <div className="lg:col-span-4">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § 09 — {t("home.faqLabel")}
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[28px] lg:text-[32px] text-neutral-light">
              {t("home.faqTitle")}
            </h2>
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40 mt-8">
              {(content.faqs || []).length} questions
            </div>
          </div>
          <div className="lg:col-span-8">
            <ScrollReveal>
              {(content.faqs || []).map((faq, i) => (
                <div key={i} className="flex gap-4 md:gap-6 items-start border-t border-white/[0.06] first:border-t-0 first:pt-0">
                  <span className="meta-mono text-[11px] tracking-[0.18em] text-[#A9B57E] pt-6 hidden md:block min-w-[28px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <FAQItem question={faq.q} answer={faq.a} isOpen={faqOpen === i} onToggle={() => setFaqOpen(faqOpen === i ? null : i)} />
                  </div>
                </div>
              ))}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § FIN — closing manifesto
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-28 md:py-40 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8 flex items-center gap-3">
            <span className="meta-led" />
            <span>§ FIN — Atlas Studio · MMXXVI</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[1.04] text-[28px] sm:text-[34px] md:text-[42px] lg:text-[48px] text-neutral-light max-w-3xl mb-4">
            {t("home.readyTitle")}
          </h2>
          <p className="font-display italic font-light text-[18px] md:text-[22px] text-neutral-light/65 leading-snug max-w-2xl mb-10">
            {t("home.readySubtitle")}
          </p>
          <div className="flex items-baseline gap-8 flex-wrap">
            <Link to="/portal" className="cta-arrow cta-arrow--primary">
              {t("home.startFree")}
            </Link>
            <Link to="/contact" className="cta-arrow">
              {t("home.contactUs")}
            </Link>
          </div>
          <div className="mt-20 flex items-baseline justify-between flex-wrap gap-4 meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/35">
            <span>09 / 09 · fin du document</span>
            <span>Atlas Studio · OHADA · {new Date().getFullYear()}</span>
          </div>
        </div>
      </section>
    </>
  );
}
