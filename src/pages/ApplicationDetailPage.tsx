import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  CheckCircle2, Clock,
  Receipt, Wallet, Users, Package, Calculator,
  LayoutDashboard, UserCheck, Megaphone, BarChart3,
  Wrench, Home, Hammer, Building2, FileCheck,
  FolderOpen, Banknote, CreditCard, ArrowLeftRight,
  FileText, Search, Gauge, UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { useApps } from "../hooks/useApps";
import { planEntries } from "../lib/utils";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { AppMockup } from "../components/ui/AppMockup";
import { SEOHead } from "../components/ui/SEOHead";
import { StyledText } from "../components/ui/StyledText";
import type { AppItem } from "../config/content";

// Champs optionnels présents au runtime (alimentés par le CMS) mais pas dans
// l'interface AppItem statique. Cast typé localement, plus propre que `as any`.
type AppWithRuntimeExtras = AppItem & {
  pricingPeriod?: string;
  pricingNotes?: Record<string, string>;
};

const ICON_MAP: Record<string, LucideIcon> = {
  receipt: Receipt, wallet: Wallet, users: Users, package: Package, calculator: Calculator,
  "layout-dashboard": LayoutDashboard, "user-check": UserCheck, megaphone: Megaphone,
  "bar-chart-3": BarChart3, wrench: Wrench, home: Home, hammer: Hammer, "building-2": Building2,
  "file-check": FileCheck, "folder-open": FolderOpen, banknote: Banknote,
  "credit-card": CreditCard, "arrow-left-right": ArrowLeftRight, "file-text": FileText,
  search: Search, gauge: Gauge, utensils: UtensilsCrossed,
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { content } = useContentContext();
  const { apps, loading } = useApps();

  const appWithStatus = apps.find((a) => a.id === id);
  const app = appWithStatus || content.apps.find((a) => a.id === id);

  useEffect(() => {
    if (app?.external_url) window.location.href = app.external_url;
  }, [app]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) return <Navigate to="/applications" replace />;
  if (app.external_url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-onyx">
        <div className="w-10 h-10 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pricingEntries = planEntries(app.pricing);
  const status = appWithStatus?.status || "available";
  const isAvailable = status === "available";
  const appColor = app.color || "#A9B57E";
  const iconName = app.icon || "receipt";
  const highlights = app.highlights || [];
  const IconComponent = ICON_MAP[iconName] || CheckCircle2;
  const appExt = app as AppWithRuntimeExtras;
  const pricingPeriod = appExt.pricingPeriod || "mois";

  const formatPrice = (price: number) => price.toLocaleString("fr-FR");
  const PREMIUM_TAGS = ["(Premium)", "(Cabinet)", "(Entreprise)"];
  const isPremiumFeature = (f: string) => PREMIUM_TAGS.some(tag => f.includes(tag));
  const cleanFeatureName = (f: string) => {
    let clean = f;
    for (const tag of PREMIUM_TAGS) clean = clean.replace(` ${tag}`, "");
    return clean;
  };

  const allFeatures = app.features;
  const isFeatureIncluded = (feature: string, planIndex: number) => {
    if (planIndex > 0) return true;
    return !isPremiumFeature(feature);
  };

  // Position de l'app dans le catalogue (pour le numéro éditorial).
  const appIndex = Math.max(1, (content.apps?.findIndex((a) => a.id === id) ?? 0) + 1);
  const numStr = String(appIndex).padStart(2, "0");

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title={app.name} description={app.tagline} canonical={`/applications/${id}`} />

      {/* HERO ÉDITORIAL */}
      <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${appColor}1a 0%, transparent 60%)`, filter: "blur(40px)" }} />

        <div className="relative max-w-[1280px] mx-auto">
          {/* breadcrumb mono */}
          <Link to="/applications" className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55 hover:text-[#A9B57E] transition-colors mb-10 inline-flex items-baseline gap-2">
            <span>←</span><span>Applications</span>
          </Link>

          {/* méta-strip */}
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase flex items-baseline gap-3 md:gap-4 mb-10 flex-wrap" style={{ color: appColor }}>
            <span>§ {numStr} — {app.type}</span>
            {app.categories.map((c) => (
              <span key={c} className="text-neutral-light/55">
                <span className="text-neutral-light/25 mr-3">/</span>{c}
              </span>
            ))}
            {status === "coming_soon" && (
              <span className="text-amber-400/85">
                <span className="text-neutral-light/25 mr-3">/</span>
                <Clock size={11} className="inline -mt-0.5 mr-1" /> Bientôt disponible
              </span>
            )}
          </div>

          {/* titre éditorial monumental */}
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.96] text-[26px] sm:text-[30px] md:text-[38px] lg:text-[44px] text-neutral-light mb-6">
            {app.name}
          </h1>
          <p className="font-display italic font-light text-[15px] md:text-[18px] text-neutral-light/70 max-w-3xl mb-10 leading-snug">
            {app.tagline}
          </p>

          {isAvailable && (
            <div className="flex items-baseline gap-6 md:gap-8 flex-wrap">
              <a href="#tarifs" className="cta-arrow cta-arrow--primary">Voir les tarifs</a>
              <Link to={`/portal?app=${app.id}`} className="cta-arrow">Souscrire maintenant</Link>
            </div>
          )}
        </div>
      </section>

      {/* MOCKUPS — préservé tel quel (visuellement distinct) */}
      <section className="relative py-20 md:py-28 px-5 md:px-8 overflow-hidden border-b border-white/[0.06] bg-ink-100">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${appColor}18 0%, transparent 60%)`, filter: "blur(40px)" }} />
        <div className="relative max-w-[1280px] mx-auto">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-6 md:gap-10">
              <div className="hidden md:block w-64 transform -rotate-3 scale-90 opacity-70">
                <AppMockup appName={app.name} color={appColor} variant="list" />
              </div>
              <div className="w-80 md:w-96 transform scale-100 md:scale-105 z-10">
                <AppMockup appName={app.name} color={appColor} variant="dashboard" />
              </div>
              <div className="hidden md:block w-64 transform rotate-3 scale-90 opacity-70">
                <AppMockup appName={app.name} color={appColor} variant="form" />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* § A — POINTS FORTS */}
      {highlights.length > 0 && (
        <section className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
          <div className="relative max-w-[1280px] mx-auto">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-10">
              § A — Points forts
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-10">
              {highlights.map((h, i) => (
                <ScrollReveal key={i} delay={i * 80}>
                  <div className="border-t border-white/[0.06] pt-6">
                    <div className="flex items-baseline gap-3 mb-4">
                      <span className="meta-mono text-[10px] tabular-nums tracking-[0.2em]" style={{ color: appColor }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <IconComponent size={20} style={{ color: appColor }} strokeWidth={1.6} />
                    </div>
                    <div className="font-display font-medium text-[15px] md:text-[17px] leading-tight text-neutral-light">
                      <StyledText>{h}</StyledText>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* § B — DESCRIPTION & FONCTIONNALITÉS */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 mb-14">
            <div className="lg:col-span-7">
              <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
                § B — Fonctionnalités
              </div>
              <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[14px] md:text-[16px] lg:text-[26px] text-neutral-light mb-6">
                Tout ce dont vous avez <span className="kinetic-word">besoin</span>.
              </h2>
              <p className="text-[15px] md:text-[16px] text-neutral-muted leading-relaxed font-light max-w-[600px]">
                <StyledText>{app.desc}</StyledText>
              </p>
            </div>
            <div className="lg:col-span-5 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40">
              {allFeatures.length} fonctionnalités au catalogue
            </div>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
            {allFeatures.map((f, i) => (
              <ScrollReveal key={i} delay={(i % 8) * 40}>
                <li className="flex items-baseline gap-3 text-[14px] text-neutral-light/85 font-light leading-snug border-t border-white/[0.04] pt-3">
                  <span className="meta-mono text-[10px] tabular-nums" style={{ color: appColor, opacity: 0.7 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1">
                    <StyledText>{cleanFeatureName(f)}</StyledText>
                    {isPremiumFeature(f) && (
                      <span className="ml-2 meta-mono text-[9px] tracking-[0.2em] uppercase text-[#A9B57E]/70">· Premium</span>
                    )}
                  </span>
                </li>
              </ScrollReveal>
            ))}
          </ul>
        </div>
      </section>

      {/* § C — TARIFS */}
      <section id="tarifs" className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="relative max-w-[1280px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
            <div className="lg:col-span-7">
              <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
                § C — Tarifs
              </div>
              <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[14px] md:text-[16px] lg:text-[26px] text-neutral-light">
                Choisissez votre plan
              </h2>
            </div>
            <div className="lg:col-span-5 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40">
              Toutes les fonctionnalités incluses · Sans engagement
            </div>
          </div>

          <div className={`grid gap-x-8 gap-y-12 ${pricingEntries.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
            {pricingEntries.map(([plan, price], pi) => {
              const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
              return (
                <ScrollReveal key={plan} delay={pi * 80}>
                  <article className="relative flex flex-col h-full border-t border-white/[0.06] pt-6">
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55">
                        {plan}
                      </span>
                      {isPopular && (
                        <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E]">
                          ★ Recommandé
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1.5 mb-2">
                      {(price as number) === 0 ? (
                        <span className="text-gradient-gold font-mono text-[15px] md:text-[17px] font-semibold">Gratuit</span>
                      ) : (
                        <>
                          <span className="text-gradient-gold font-mono text-[15px] md:text-[17px] font-semibold tracking-tight tabular-nums">
                            {formatPrice(price as number)}
                          </span>
                          <span className="text-neutral-muted text-[13px] font-light">FCFA/{pricingPeriod}</span>
                        </>
                      )}
                    </div>
                    {appExt.pricingNotes?.[plan] && (
                      <p className="text-[11px] text-neutral-muted font-light mb-5">{appExt.pricingNotes[plan]}</p>
                    )}

                    <ul className="flex-1 mb-7 space-y-2.5">
                      {allFeatures.map((feature, fi) => {
                        const included = isFeatureIncluded(feature, pi);
                        return (
                          <li key={fi} className={`flex items-baseline gap-2.5 text-[13px] font-light leading-snug ${included ? "text-neutral-light/85" : "text-neutral-muted/40 line-through"}`}>
                            <span className="meta-mono text-[10px] tabular-nums" style={{ color: included ? appColor : "currentColor", opacity: included ? 0.7 : 0.4 }}>
                              {String(fi + 1).padStart(2, "0")}
                            </span>
                            <span>{cleanFeatureName(feature)}</span>
                          </li>
                        );
                      })}
                    </ul>

                    {isAvailable ? (
                      <Link
                        to={`/portal?app=${app.id}&plan=${encodeURIComponent(plan)}`}
                        className={isPopular ? "cta-arrow cta-arrow--primary" : "cta-arrow"}
                      >
                        Souscrire
                      </Link>
                    ) : (
                      <span className="meta-mono text-[11px] tracking-[0.22em] uppercase text-neutral-light/40">
                        · {status === "coming_soon" ? "Bientôt disponible" : "Indisponible"}
                      </span>
                    )}
                  </article>
                </ScrollReveal>
              );
            })}
          </div>

          {isAvailable && (
            <p className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40 mt-12">
              Sans engagement · Annulation à tout moment
            </p>
          )}
        </div>
      </section>

      {/* § D — COMPARAISON DÉTAILLÉE */}
      {pricingEntries.length > 1 && (
        <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
          <div className="relative max-w-[1280px] mx-auto">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § D — Comparaison
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[32px] md:text-[44px] text-neutral-light mb-12">
              Comparez les plans en détail
            </h2>

            <ScrollReveal>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px]">
                  <thead>
                    <tr className="border-b border-white/[0.12]">
                      <th className="p-4 text-left meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55">
                        Fonctionnalité
                      </th>
                      {pricingEntries.map(([plan], i) => {
                        const isPopular = pricingEntries.length > 1 && i === pricingEntries.length - 1;
                        return (
                          <th key={plan}
                            className={`p-4 text-center meta-mono text-[10px] tracking-[0.22em] uppercase ${isPopular ? "text-[#A9B57E]" : "text-neutral-light/55"}`}>
                            {plan}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {allFeatures.map((feature, fi) => (
                      <tr key={fi} className="border-b border-white/[0.04] hover:bg-white/[0.015] transition-colors">
                        <td className="p-4 text-neutral-light/85 text-[13px] font-light">
                          <span className="meta-mono text-[10px] tabular-nums text-neutral-light/40 mr-3">{String(fi + 1).padStart(2, "0")}</span>
                          <StyledText>{cleanFeatureName(feature)}</StyledText>
                        </td>
                        {pricingEntries.map(([plan], pi) => {
                          const isIncluded = isFeatureIncluded(feature, pi);
                          return (
                            <td key={plan} className="p-4 text-center">
                              {isIncluded
                                ? <span className="text-[#A9B57E] text-[15px]">●</span>
                                : <span className="text-neutral-light/15 text-[13px]">○</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-t border-white/[0.12]">
                      <td className="p-5 meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55">Prix</td>
                      {pricingEntries.map(([plan, price]) => (
                        <td key={plan} className="p-5 text-center">
                          <div className="text-gradient-gold font-mono text-[20px] font-semibold tracking-tight tabular-nums">
                            {price === 0 ? "Gratuit" : formatPrice(price as number)}
                          </div>
                          {(price as number) > 0 && (
                            <div className="text-neutral-muted text-[11px] font-light mt-1">FCFA/{pricingPeriod}</div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* § FIN */}
      <section className="relative bg-onyx border-t border-white/[0.06] py-28 md:py-40 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at center, ${appColor}1a 0%, transparent 60%)`, filter: "blur(40px)" }} />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8 flex items-center gap-3">
            <span className="meta-led" />
            <span>§ FIN — {app.name}</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.98] text-[28px] sm:text-[36px] md:text-[48px] text-neutral-light max-w-4xl mb-12">
            Prêt à essayer <span className="italic font-light text-neutral-light/70">{app.name}</span> ?
          </h2>
          {isAvailable ? (
            <div className="flex items-baseline gap-8 flex-wrap">
              <Link to={`/portal?app=${app.id}`} className="cta-arrow cta-arrow--primary">
                Souscrire maintenant
              </Link>
              <a href="#tarifs" className="cta-arrow">
                Revoir les tarifs
              </a>
            </div>
          ) : (
            <span className="meta-mono text-[12px] tracking-[0.22em] uppercase text-neutral-light/50">
              · {status === "coming_soon" ? "Bientôt disponible" : "Indisponible"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}
