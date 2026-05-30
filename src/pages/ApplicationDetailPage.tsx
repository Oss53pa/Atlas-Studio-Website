import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  CheckCircle2, ArrowLeft, ArrowRight, Clock,
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
import { AppLogo } from "../components/ui/Logo";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { AppMockup } from "../components/ui/AppMockup";
import { SEOHead } from "../components/ui/SEOHead";
import { StyledText } from "../components/ui/StyledText";

const ICON_MAP: Record<string, LucideIcon> = {
  receipt: Receipt,
  wallet: Wallet,
  users: Users,
  package: Package,
  calculator: Calculator,
  "layout-dashboard": LayoutDashboard,
  "user-check": UserCheck,
  megaphone: Megaphone,
  "bar-chart-3": BarChart3,
  wrench: Wrench,
  home: Home,
  hammer: Hammer,
  "building-2": Building2,
  "file-check": FileCheck,
  "folder-open": FolderOpen,
  banknote: Banknote,
  "credit-card": CreditCard,
  "arrow-left-right": ArrowLeftRight,
  "file-text": FileText,
  search: Search,
  gauge: Gauge,
  utensils: UtensilsCrossed,
};

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { content } = useContentContext();
  const { apps, loading } = useApps();

  const appWithStatus = apps.find((a) => a.id === id);
  const app = appWithStatus || content.apps.find((a) => a.id === id);

  useEffect(() => {
    if (app?.external_url) {
      window.location.href = app.external_url;
    }
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
  const pricingPeriod = (app as any).pricingPeriod || "mois";

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

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title={app.name} description={app.tagline} canonical={`/applications/${id}`} />

      {/* ===== HERO ===== */}
      <section className="relative bg-onyx text-neutral-light pt-28 pb-16 md:pt-32 md:pb-20 px-5 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-30 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${appColor}1f 0%, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />

        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <Link
              to="/applications"
              className="inline-flex items-center gap-2 text-neutral-muted text-sm hover:text-gold transition-colors mb-8 group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Applications
            </Link>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex items-center gap-2 flex-wrap mb-5">
              <span
                className="px-3 py-1 rounded-full text-[11px] font-medium border"
                style={{
                  background: `${appColor}15`,
                  color: appColor,
                  borderColor: `${appColor}40`,
                }}
              >
                {app.type}
              </span>
              {app.categories.map((c, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-[11px] font-medium border border-white/[0.1] text-neutral-muted backdrop-blur-sm"
                >
                  {c}
                </span>
              ))}
              {status === "coming_soon" && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium border bg-amber-500/10 text-amber-300 border-amber-500/25">
                  <Clock size={12} /> Bientôt disponible
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold text-neutral-light mb-5 tracking-tight leading-[1.12]">
              <AppLogo name={app.name} size={56} color="text-gold" />
            </h1>
            <p className="text-neutral-muted text-lg md:text-xl max-w-2xl leading-relaxed mb-9 font-light">
              {app.tagline}
            </p>
            {isAvailable && (
              <div className="flex gap-4 flex-wrap">
                <a href="#tarifs" className="btn-gold">
                  Voir les tarifs
                  <ArrowRight size={16} strokeWidth={2.2} />
                </a>
                <Link to={`/portal?app=${app.id}`} className="btn-outline-light">
                  Souscrire maintenant
                </Link>
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* ===== MOCKUPS ===== */}
      <section className="relative py-20 md:py-28 px-5 md:px-8 overflow-hidden border-y border-white/[0.04]"
        style={{
          background: "linear-gradient(180deg, #1c1c20 0%, #212126 50%, #1c1c20 100%)",
        }}
      >
        <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${appColor}18 0%, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        <div className="relative max-w-site mx-auto">
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

      {/* ===== HIGHLIGHTS ===== */}
      {highlights.length > 0 && (
        <section className="relative bg-onyx py-16 md:py-20 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
          <div className="relative max-w-site mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {highlights.map((h, i) => (
                <ScrollReveal key={i} delay={i * 100}>
                  <div className="relative text-center p-7 rounded-2xl border border-white/[0.06] bg-ink-100 card-hover overflow-hidden">
                    <div
                      className="absolute -top-px left-[10%] right-[10%] h-px"
                      style={{ background: `linear-gradient(90deg, transparent 0%, ${appColor}cc 50%, transparent 100%)` }}
                    />
                    <div
                      className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center border"
                      style={{
                        background: `linear-gradient(135deg, ${appColor}22 0%, ${appColor}08 100%)`,
                        borderColor: `${appColor}30`,
                      }}
                    >
                      <IconComponent size={26} style={{ color: appColor }} strokeWidth={1.8} />
                    </div>
                    <div className="text-neutral-light font-medium text-base"><StyledText>{h}</StyledText></div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== DESCRIPTION + FEATURES ===== */}
      <section className="relative bg-ink-100 py-20 md:py-28 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center mb-14">
              <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>Fonctionnalités</div>
              <h2 className="text-3xl md:text-4xl font-medium text-gradient-light mb-4 tracking-tight">
                Tout ce dont vous avez besoin
              </h2>
              <p className="text-neutral-muted text-[15px] leading-relaxed font-light">
                {app.desc}
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {app.features.map((f, i) => (
              <ScrollReveal key={i} delay={i * 60}>
                <div className="bg-ink-200 rounded-xl border border-white/[0.06] p-5 card-hover">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center border"
                      style={{
                        background: `linear-gradient(135deg, ${appColor}22 0%, ${appColor}08 100%)`,
                        borderColor: `${appColor}28`,
                      }}
                    >
                      <CheckCircle2 size={18} style={{ color: appColor }} strokeWidth={2} />
                    </div>
                    <div className="text-neutral-light font-medium text-[14px] pt-1.5 leading-snug">
                      <StyledText>{cleanFeatureName(f)}</StyledText>
                      {isPremiumFeature(f) && (
                        <span className="ml-1.5 text-[10px] font-medium text-gold bg-gold/10 px-1.5 py-0.5 rounded-full align-middle border border-gold/20">
                          Premium
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING CARDS ===== */}
      <section id="tarifs" className="relative bg-onyx py-20 md:py-28 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold opacity-50 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>Tarifs</div>
              <h2 className="text-3xl md:text-4xl font-medium text-gradient-light mb-4 tracking-tight">
                Choisissez votre plan
              </h2>
              <p className="text-neutral-muted text-[15px] font-light">
                Toutes les fonctionnalités incluses. Choisissez la formule adaptée à votre taille.
              </p>
            </div>
          </ScrollReveal>

          <div className={`grid gap-5 mx-auto ${pricingEntries.length <= 2 ? "grid-cols-1 md:grid-cols-2 max-w-3xl" : "grid-cols-1 md:grid-cols-3 max-w-5xl"}`}>
            {pricingEntries.map(([plan, price], pi) => {
              const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
              return (
                <ScrollReveal key={plan} delay={pi * 100}>
                  <div
                    className={`relative rounded-2xl p-8 flex flex-col h-full overflow-hidden card-hover ${
                      isPopular
                        ? "border border-gold/35 shadow-[0_0_0_1px_rgba(169,181,126,0.15),0_24px_56px_-12px_rgba(169,181,126,0.18)]"
                        : "border border-white/[0.06] shadow-premium"
                    }`}
                    style={{
                      background: isPopular
                        ? "linear-gradient(180deg, rgba(169,181,126,0.05) 0%, rgba(169,181,126,0.01) 100%), #1c1c20"
                        : "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%), #1c1c20",
                    }}
                  >
                    {isPopular && (
                      <>
                        <div className="absolute top-0 left-0 right-0 h-px"
                          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.7) 50%, transparent 100%)" }}
                        />
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="shimmer btn-gold !py-1 !px-4 !text-[10px] !font-bold tracking-[0.18em] !rounded-full">
                            POPULAIRE
                          </span>
                        </div>
                      </>
                    )}

                    <div className="text-center mb-7">
                      <h3 className="text-neutral-light text-xl font-semibold mb-3 tracking-tight">{plan}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        {(price as number) === 0 ? (
                          <span className="text-gradient-gold text-4xl font-semibold font-mono">Gratuit</span>
                        ) : (
                          <>
                            <span className="text-gradient-gold text-4xl font-semibold font-mono tracking-tight">
                              {formatPrice(price as number)}
                            </span>
                            <span className="text-neutral-muted text-sm font-light ml-1">
                              FCFA/{pricingPeriod}
                            </span>
                          </>
                        )}
                      </div>
                      {(app as any).pricingNotes?.[plan] && (
                        <p className="text-neutral-muted text-xs font-light mt-2">{(app as any).pricingNotes[plan]}</p>
                      )}
                    </div>

                    <div className="flex-1 mb-7">
                      <div className="space-y-3">
                        {allFeatures.map((feature, fi) => {
                          const included = isFeatureIncluded(feature, pi);
                          return (
                            <div key={fi} className={`flex items-start gap-2.5 text-[13px] font-light ${included ? "text-neutral-light" : "text-neutral-muted/40"}`}>
                              {included ? (
                                <CheckCircle2 size={16} className="text-gold flex-shrink-0 mt-0.5" strokeWidth={2} />
                              ) : (
                                <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center text-neutral-muted/30">&mdash;</span>
                              )}
                              <span><StyledText>{cleanFeatureName(feature)}</StyledText></span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isAvailable ? (
                      <Link
                        to={`/portal?app=${app.id}&plan=${encodeURIComponent(plan)}`}
                        className={isPopular ? "btn-gold w-full !rounded-xl" : "btn-outline-light w-full !rounded-xl !text-[13px]"}
                      >
                        Souscrire
                        {isPopular && <ArrowRight size={15} strokeWidth={2.2} />}
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-white/[0.03] text-neutral-muted/60 font-medium text-sm cursor-not-allowed border border-white/[0.06]"
                      >
                        {status === "coming_soon" ? "Bientôt disponible" : "Indisponible"}
                      </button>
                    )}
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {isAvailable && (
            <ScrollReveal>
              <p className="text-center text-neutral-muted text-[13px] mt-9 font-light">
                Sans engagement &middot; Annulation à tout moment
              </p>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      {pricingEntries.length > 1 && (
        <section className="relative bg-ink-100 py-20 md:py-28 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
          <div className="relative max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-14">
                <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>Comparaison</div>
                <h2 className="text-3xl md:text-4xl font-medium text-gradient-light mb-3 tracking-tight">
                  Comparez les plans en détail
                </h2>
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="overflow-x-auto rounded-2xl shadow-premium">
                <table className="w-full border-collapse min-w-[500px] bg-ink-200 rounded-2xl overflow-hidden border border-white/[0.06]">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="p-5 text-left text-neutral-muted text-xs font-semibold uppercase tracking-[0.14em] border-b border-white/[0.06]">
                        Fonctionnalité
                      </th>
                      {pricingEntries.map(([plan], i) => {
                        const isPopular = pricingEntries.length > 1 && i === pricingEntries.length - 1;
                        return (
                          <th
                            key={plan}
                            className={`p-5 text-center text-xs font-semibold uppercase tracking-[0.14em] border-b border-white/[0.06] ${
                              isPopular ? "text-gold" : "text-neutral-muted"
                            }`}
                          >
                            {plan}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {allFeatures.map((feature, fi) => (
                      <tr key={fi} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.015] transition-colors">
                        <td className="p-4 text-neutral-light text-sm font-light">
                          <StyledText>{cleanFeatureName(feature)}</StyledText>
                        </td>
                        {pricingEntries.map(([plan], pi) => {
                          const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
                          const isIncluded = isFeatureIncluded(feature, pi);
                          return (
                            <td
                              key={plan}
                              className={`p-4 text-center ${isPopular ? "bg-gold/[0.04]" : ""}`}
                            >
                              {isIncluded ? (
                                <CheckCircle2 size={18} className="text-gold mx-auto" strokeWidth={2} />
                              ) : (
                                <span className="text-neutral-muted/30">&mdash;</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="bg-white/[0.02]">
                      <td className="p-5 text-neutral-light font-medium text-sm">Prix</td>
                      {pricingEntries.map(([plan, price], pi) => {
                        const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
                        return (
                          <td key={plan} className={`p-5 text-center ${isPopular ? "bg-gold/[0.04]" : ""}`}>
                            <div className="text-gradient-gold text-2xl font-semibold font-mono tracking-tight">
                              {price === 0 ? "Gratuit" : formatPrice(price as number)}
                            </div>
                            {(price as number) > 0 && (
                              <div className="text-neutral-muted text-xs font-light mt-1">FCFA/{pricingPeriod}</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ===== CTA FINAL ===== */}
      <section className="relative bg-onyx text-neutral-light py-20 md:py-28 px-5 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${appColor}18 0%, transparent 60%)`,
            filter: "blur(40px)",
          }}
        />
        <div className="relative max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-medium text-gradient-light mb-4 tracking-tight">
              Prêt à essayer {app.name} ?
            </h2>
            <p className="text-neutral-muted text-[15px] mb-9 max-w-md mx-auto leading-relaxed font-light">
              Démarrez maintenant. Sans engagement, sans carte bancaire.
            </p>
            {isAvailable ? (
              <div className="flex gap-4 justify-center flex-wrap">
                <Link to={`/portal?app=${app.id}`} className="btn-gold">
                  Souscrire maintenant
                  <ArrowRight size={16} strokeWidth={2.2} />
                </Link>
                <a href="#tarifs" className="btn-outline-light">
                  Revoir les tarifs
                </a>
              </div>
            ) : (
              <button
                disabled
                className="py-3 px-6 rounded-lg bg-white/[0.03] text-neutral-muted/60 font-medium text-sm cursor-not-allowed border border-white/[0.06]"
              >
                {status === "coming_soon" ? "Bientôt disponible" : "Indisponible"}
              </button>
            )}
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
