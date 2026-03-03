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
  const { apps } = useApps();

  const appWithStatus = apps.find((a) => a.id === id);
  const app = appWithStatus || content.apps.find((a) => a.id === id);
  if (!app) return <Navigate to="/applications" replace />;

  const pricingEntries = Object.entries(app.pricing);
  const status = appWithStatus?.status || "available";
  const isAvailable = status === "available";
  const appColor = app.color || "#C8A960";
  const iconName = app.icon || "receipt";
  const highlights = app.highlights || [];
  const IconComponent = ICON_MAP[iconName] || CheckCircle;

  const allFeatures = [
    ...app.features,
    "Support prioritaire",
    "API & intégrations",
  ];

  return (
    <div className="min-h-screen">
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
              <span className="px-3 py-1 rounded-full text-[11px] font-semibold border bg-gold/10 text-gold border-gold/20">
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
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <Clock size={12} /> Bientôt disponible
                </span>
              )}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-neutral-light mb-4 tracking-tight">
              <AppLogo name={app.name} size={48} color="text-neutral-light" />
            </h1>
            <p className="text-neutral-400 text-lg md:text-xl max-w-2xl leading-relaxed">
              {app.tagline}
            </p>
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
                    <div className="text-neutral-text font-bold text-lg">{h}</div>
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
              <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-text mb-4">
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
                    <div className="text-neutral-text font-semibold text-[15px] pt-1.5">
                      {f}
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PLAN COMPARISON ===== */}
      <section className="bg-white py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-text mb-3">
                Comparez les plans
              </h2>
              <p className="text-neutral-muted text-[15px]">
                Choisissez l'offre adaptée à vos besoins
              </p>
              <div className="w-12 h-[3px] bg-gold mx-auto mt-3" />
            </div>
          </ScrollReveal>

          <ScrollReveal>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[500px] bg-white rounded-2xl overflow-hidden border border-warm-border">
                <thead>
                  <tr className="bg-warm-bg">
                    <th className="p-5 text-left text-neutral-muted text-xs font-bold uppercase border-b border-warm-border">
                      Fonctionnalité
                    </th>
                    {pricingEntries.map(([plan], i) => {
                      const isPopular = i === 1;
                      return (
                        <th
                          key={plan}
                          className={`p-5 text-center text-xs font-bold uppercase border-b border-warm-border ${
                            isPopular ? "text-gold" : "text-neutral-muted"
                          }`}
                        >
                          {plan}
                          {isPopular && (
                            <span className="shimmer bg-gold text-onyx px-2 py-0.5 rounded-full text-[10px] ml-1.5 inline-block">
                              POPULAIRE
                            </span>
                          )}
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
                        {feature}
                      </td>
                      {pricingEntries.map(([plan], pi) => {
                        const isPopular = pi === 1;
                        const isIncluded =
                          fi < app.features.length
                            ? fi < 2 || pi > 0
                            : pi === pricingEntries.length - 1;
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
                    <td className="p-5 text-neutral-text font-bold text-sm">
                      Prix
                    </td>
                    {pricingEntries.map(([plan, price], pi) => {
                      const isPopular = pi === 1;
                      return (
                        <td
                          key={plan}
                          className={`p-5 text-center ${
                            isPopular ? "bg-gold/[0.03]" : ""
                          }`}
                        >
                          <div className="text-gold text-2xl font-extrabold">
                            {price === 0 ? "Gratuit" : price}
                          </div>
                          {(price as number) > 0 && (
                            <div className="text-neutral-placeholder text-xs">
                              /mois
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

      {/* ===== CTA FINAL ===== */}
      <section className="relative bg-onyx text-neutral-light py-16 md:py-24 px-5 md:px-8 overflow-hidden">
        <GridPattern dark />
        <div className="relative max-w-2xl mx-auto text-center">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-light mb-4">
              Prêt à essayer {app.name} ?
            </h2>
            <p className="text-neutral-400 text-[15px] mb-8 max-w-md mx-auto leading-relaxed">
              Démarrez votre essai gratuit de 14 jours. Sans engagement, sans
              carte bancaire.
            </p>
            {isAvailable ? (
              <Link to={`/portal?app=${app.id}`} className="btn-gold">
                Essayer {app.name} gratuitement
              </Link>
            ) : (
              <button
                disabled
                className="py-3 px-6 rounded-lg bg-neutral-700 text-neutral-400 font-semibold text-sm cursor-not-allowed"
              >
                {status === "coming_soon"
                  ? "Bientôt disponible"
                  : "Indisponible"}
              </button>
            )}
            {isAvailable && (
              <p className="text-neutral-500 text-[12px] mt-4">
                14 jours d'essai gratuit &middot; Sans carte bancaire
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
