import { useEffect } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import {
  CheckCircle, ArrowLeft, Clock,
  Receipt, Wallet, Users, Package, Calculator,
  LayoutDashboard, UserCheck, Megaphone, BarChart3,
  Wrench, Home, Hammer, Building2, FileCheck,
  FolderOpen, Banknote, CreditCard, ArrowLeftRight,
  FileText, Search, Gauge,
  type LucideIcon,
} from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { useApps } from "../hooks/useApps";
import { AppLogo } from "../components/ui/Logo";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { GridPattern } from "../components/ui/GridPattern";
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
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) return <Navigate to="/applications" replace />;

  if (app.external_url) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-10 h-10 border-2 border-gold-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const pricingEntries = Object.entries(app.pricing);
  const status = appWithStatus?.status || "available";
  const isAvailable = status === "available";
  const appColor = app.color || "#C8A960";
  const iconName = app.icon || "receipt";
  const highlights = app.highlights || [];
  const IconComponent = ICON_MAP[iconName] || CheckCircle;
  const pricingPeriod = (app as any).pricingPeriod || "mois";

  const formatPrice = (price: number) => price.toLocaleString("fr-FR");

  // Premium tags used to mark features exclusive to the higher-tier plan
  const PREMIUM_TAGS = ["(Premium)", "(Cabinet)", "(Entreprise)"];
  const isPremiumFeature = (f: string) => PREMIUM_TAGS.some(tag => f.includes(tag));
  const cleanFeatureName = (f: string) => {
    let clean = f;
    for (const tag of PREMIUM_TAGS) clean = clean.replace(` ${tag}`, "");
    return clean;
  };

  const allFeatures = app.features;

  const isFeatureIncluded = (feature: string, planIndex: number) => {
    if (planIndex > 0) return true; // premium plan gets everything
    return !isPremiumFeature(feature); // basic plan only gets non-tagged features
  };

  return (
    <div className="min-h-screen">
      <SEOHead title={app.name} description={app.tagline} canonical={`/applications/${id}`} />
      {/* ===== HERO DARK ===== */}
      <section className="relative bg-onyx text-neutral-light pt-24 pb-16 md:pt-28 md:pb-20 px-5 md:px-8 overflow-hidden">
        <GridPattern dark />
        <div className="relative max-w-site mx-auto">
          <ScrollReveal>
            <Link
              to="/applications"
              className="inline-flex items-center gap-2 text-neutral-400 text-sm hover:text-gold transition-colors mb-8"
            >
              <ArrowLeft size={16} /> Applications
            </Link>
          </ScrollReveal>

          <ScrollReveal>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <span className="px-3 py-1 rounded-full text-[11px] font-normal border bg-gold/10 text-gold border-gold/20">
                {app.type}
              </span>
              {app.categories.map((c, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-[11px] font-medium border border-neutral-700 text-neutral-400"
                >
                  {c}
                </span>
              ))}
              {status === "coming_soon" && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-normal border bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <Clock size={12} /> Bientôt disponible
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-normal text-neutral-light mb-4 tracking-tight">
              <AppLogo name={app.name} size={48} color="text-neutral-light" />
            </h1>
            <p className="text-neutral-400 text-lg md:text-xl max-w-2xl leading-relaxed mb-8">
              {app.tagline}
            </p>
            {isAvailable && (
              <div className="flex gap-4 flex-wrap">
                <a href="#tarifs" className="btn-gold">
                  Voir les tarifs
                </a>
                <Link to={`/portal?app=${app.id}`} className="btn-outline-light">
                  Essai gratuit 14 jours
                </Link>
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* ===== MOCKUPS ===== */}
      <section className="bg-warm-bg py-16 md:py-24 px-5 md:px-8 overflow-hidden">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="flex items-center justify-center gap-6 md:gap-10">
              <div className="hidden md:block w-64 transform -rotate-3 scale-90 opacity-80">
                <AppMockup appName={app.name} color={appColor} variant="list" />
              </div>
              <div className="w-80 md:w-96 transform scale-100 md:scale-105 z-10">
                <AppMockup appName={app.name} color={appColor} variant="dashboard" />
              </div>
              <div className="hidden md:block w-64 transform rotate-3 scale-90 opacity-80">
                <AppMockup appName={app.name} color={appColor} variant="form" />
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ===== HIGHLIGHTS ===== */}
      {highlights.length > 0 && (
        <section className="bg-white py-14 md:py-20 px-5 md:px-8">
          <div className="max-w-site mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {highlights.map((h, i) => (
                <ScrollReveal key={i} delay={i * 100}>
                  <div className="text-center p-6 rounded-2xl border border-warm-border">
                    <div
                      className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                      style={{ backgroundColor: `${appColor}15` }}
                    >
                      <IconComponent size={24} style={{ color: appColor }} />
                    </div>
                    <div className="text-neutral-text font-normal text-lg"><StyledText>{h}</StyledText></div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== DESCRIPTION + FEATURES ===== */}
      <section className="bg-warm-bg py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-site mx-auto">
          <ScrollReveal>
            <div className="max-w-2xl mx-auto text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-normal text-neutral-text mb-4">
                Fonctionnalités
              </h2>
              <p className="text-neutral-body text-[15px] leading-relaxed">
                {app.desc}
              </p>
              <div className="w-12 h-[3px] bg-gold mx-auto mt-4" />
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {app.features.map((f, i) => (
              <ScrollReveal key={i} delay={i * 80}>
                <div className="bg-white rounded-xl border border-warm-border p-5 card-hover">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: `${appColor}15` }}
                    >
                      <CheckCircle size={18} style={{ color: appColor }} />
                    </div>
                    <div className="text-neutral-text font-normal text-[15px] pt-1.5">
                      <StyledText>{cleanFeatureName(f)}</StyledText>
                      {isPremiumFeature(f) && (
                        <span className="ml-1.5 text-[10px] font-normal text-gold bg-gold/10 px-1.5 py-0.5 rounded-full align-middle">
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
      <section id="tarifs" className="bg-white py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-normal text-neutral-text mb-3">
                Choisissez votre plan
              </h2>
              <p className="text-neutral-muted text-[15px]">
                Toutes les fonctionnalités incluses. Choisissez la formule adaptée à votre taille.
              </p>
              <div className="w-12 h-[3px] bg-gold mx-auto mt-3" />
            </div>
          </ScrollReveal>

          <div className={`grid gap-6 mx-auto ${pricingEntries.length <= 2 ? "grid-cols-1 md:grid-cols-2 max-w-3xl" : "grid-cols-1 md:grid-cols-3 max-w-5xl"}`}>
            {pricingEntries.map(([plan, price], pi) => {
              const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
              return (
                <ScrollReveal key={plan} delay={pi * 100}>
                  <div className={`relative rounded-2xl border-2 p-8 flex flex-col h-full ${
                    isPopular
                      ? "border-gold bg-gold/[0.02] shadow-lg"
                      : "border-warm-border bg-white"
                  }`}>
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="shimmer bg-gold text-onyx px-4 py-1 rounded-full text-[11px] font-normal tracking-wide">
                          POPULAIRE
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h3 className="text-neutral-text text-xl font-normal mb-2">{plan}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        {(price as number) === 0 ? (
                          <span className="text-gold text-4xl font-normal">Gratuit</span>
                        ) : (
                          <>
                            <span className="text-gold text-4xl font-normal">
                              {formatPrice(price as number)}
                            </span>
                            <span className="text-neutral-muted text-sm">
                              FCFA/{pricingPeriod}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 mb-6">
                      <div className="space-y-2.5">
                        {allFeatures.map((feature, fi) => {
                          const included = isFeatureIncluded(feature, pi);
                          return (
                            <div key={fi} className={`flex items-start gap-2.5 text-[13px] ${included ? "text-neutral-text" : "text-neutral-300"}`}>
                              {included ? (
                                <CheckCircle size={16} className="text-gold flex-shrink-0 mt-0.5" />
                              ) : (
                                <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center">&mdash;</span>
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
                        className={`block w-full text-center py-3.5 rounded-xl font-normal text-sm transition-all duration-200 ${
                          isPopular
                            ? "bg-gold text-onyx hover:bg-gold-dark"
                            : "border-2 border-gold text-gold hover:bg-gold/5"
                        }`}
                      >
                        Souscrire
                      </Link>
                    ) : (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-neutral-100 text-neutral-400 font-normal text-sm cursor-not-allowed"
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
              <p className="text-center text-neutral-muted text-[13px] mt-8">
                14 jours d'essai gratuit &middot; Sans carte bancaire &middot; Annulation à tout moment
              </p>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* ===== COMPARISON TABLE ===== */}
      {pricingEntries.length > 1 && (
        <section className="bg-warm-bg py-16 md:py-24 px-5 md:px-8">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-normal text-neutral-text mb-3">
                  Comparez les plans en détail
                </h2>
                <div className="w-12 h-[3px] bg-gold mx-auto mt-3" />
              </div>
            </ScrollReveal>

            <ScrollReveal>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[500px] bg-white rounded-2xl overflow-hidden border border-warm-border">
                  <thead>
                    <tr className="bg-warm-bg">
                      <th className="p-5 text-left text-neutral-muted text-xs font-normal uppercase border-b border-warm-border">
                        Fonctionnalité
                      </th>
                      {pricingEntries.map(([plan], i) => {
                        const isPopular = pricingEntries.length > 1 && i === pricingEntries.length - 1;
                        return (
                          <th
                            key={plan}
                            className={`p-5 text-center text-xs font-normal uppercase border-b border-warm-border ${
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
                      <tr
                        key={fi}
                        className="border-b border-warm-border last:border-0"
                      >
                        <td className="p-4 text-neutral-body text-sm">
                          <StyledText>{cleanFeatureName(feature)}</StyledText>
                        </td>
                        {pricingEntries.map(([plan], pi) => {
                          const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
                          const isIncluded = isFeatureIncluded(feature, pi);
                          return (
                            <td
                              key={plan}
                              className={`p-4 text-center ${
                                isPopular ? "bg-gold/[0.03]" : ""
                              }`}
                            >
                              {isIncluded ? (
                                <CheckCircle
                                  size={18}
                                  className="text-gold mx-auto"
                                />
                              ) : (
                                <span className="text-neutral-300">&mdash;</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Price row */}
                    <tr className="bg-warm-bg">
                      <td className="p-5 text-neutral-text font-normal text-sm">
                        Prix
                      </td>
                      {pricingEntries.map(([plan, price], pi) => {
                        const isPopular = pricingEntries.length > 1 && pi === pricingEntries.length - 1;
                        return (
                          <td
                            key={plan}
                            className={`p-5 text-center ${
                              isPopular ? "bg-gold/[0.03]" : ""
                            }`}
                          >
                            <div className="text-gold text-2xl font-normal">
                              {price === 0 ? "Gratuit" : formatPrice(price as number)}
                            </div>
                            {(price as number) > 0 && (
                              <div className="text-neutral-placeholder text-xs">
                                FCFA/{pricingPeriod}
                              </div>
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
      <section className="relative bg-onyx text-neutral-light py-16 md:py-24 px-5 md:px-8 overflow-hidden">
        <GridPattern dark />
        <div className="relative max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-normal text-neutral-light mb-4">
              Prêt à essayer {app.name} ?
            </h2>
            <p className="text-neutral-400 text-[15px] mb-8 max-w-md mx-auto leading-relaxed">
              Démarrez votre essai gratuit de 14 jours. Sans engagement, sans
              carte bancaire.
            </p>
            {isAvailable ? (
              <div className="flex gap-4 justify-center flex-wrap">
                <Link to={`/portal?app=${app.id}`} className="btn-gold">
                  Souscrire maintenant
                </Link>
                <a href="#tarifs" className="btn-outline-light">
                  Revoir les tarifs
                </a>
              </div>
            ) : (
              <button
                disabled
                className="py-3 px-6 rounded-lg bg-neutral-700 text-neutral-400 font-normal text-sm cursor-not-allowed"
              >
                {status === "coming_soon"
                  ? "Bientôt disponible"
                  : "Indisponible"}
              </button>
            )}
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
