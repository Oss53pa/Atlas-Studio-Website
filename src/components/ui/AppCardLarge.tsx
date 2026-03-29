import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Clock } from "lucide-react";
import { AppLogo } from "./Logo";
import type { AppItem } from "../../config/content";
import type { AppStatus } from "../../lib/database.types";

interface AppCardLargeProps {
  app: AppItem & { status?: AppStatus };
  reverse?: boolean;
}

const typeBadgeClass: Record<string, string> = {
  "Module ERP": "bg-gold/10 text-gold border-gold/20",
  "App": "bg-blue-50 text-blue-600 border-blue-200",
  "App mobile": "bg-emerald-50 text-emerald-600 border-emerald-200",
};

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

export function AppCardLarge({ app, reverse = false }: AppCardLargeProps) {
  const prices = Object.entries(app.pricing);
  const minPrice = Math.min(...Object.values(app.pricing));
  const period = app.pricingPeriod || "mois";
  const isComingSoon = app.status === "coming_soon";
  const appColor = app.color || "#C8A960";
  const highlights = app.highlights || [];

  // Show first 6 features as preview
  const previewFeatures = app.features.slice(0, 6);
  const moreCount = Math.max(0, app.features.length - 6);

  return (
    <div
      className={`bg-white border border-warm-border rounded-2xl overflow-hidden card-hover ${isComingSoon ? "opacity-80" : ""}`}
      style={{ borderTopWidth: "4px", borderTopColor: appColor }}
    >
      <div className={`flex flex-col lg:flex-row ${reverse ? "lg:flex-row-reverse" : ""}`}>
        {/* ── LEFT: Info ── */}
        <div className="flex-1 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <AppLogo name={app.name} size={24} color="text-gold" />
            <div className="flex items-center gap-1.5">
              {isComingSoon && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-600 border-amber-200">
                  <Clock size={10} /> Bientôt
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadgeClass[app.type] || ""}`}>
                {app.type}
              </span>
            </div>
          </div>

          <p className="text-neutral-muted text-sm mb-2">{app.tagline}</p>
          <p className="text-neutral-body text-[15px] leading-relaxed mb-6">
            {app.desc}
          </p>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold border"
                  style={{
                    color: appColor,
                    backgroundColor: `${appColor}10`,
                    borderColor: `${appColor}25`,
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {/* Pricing */}
          <div className="flex items-end gap-6 flex-wrap mb-6">
            {prices.map(([planName, price]) => (
              <div key={planName}>
                <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-wider mb-0.5">
                  {planName}
                </div>
                <div className="flex items-baseline gap-1">
                  {price === 0 ? (
                    <span className="text-gold text-2xl font-extrabold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-gold text-2xl font-extrabold">{formatPrice(price)}</span>
                      <span className="text-neutral-muted text-[12px]">FCFA/{period}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Link
            to={`/applications/${app.id}`}
            className="inline-flex items-center gap-2 bg-gold text-onyx px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gold-dark transition-colors"
          >
            Découvrir {app.name} <ArrowRight size={16} />
          </Link>
        </div>

        {/* ── RIGHT: Features preview ── */}
        <div className="lg:w-[380px] xl:w-[420px] bg-warm-bg/50 p-8 md:p-10 border-t lg:border-t-0 lg:border-l border-warm-border flex flex-col justify-center">
          <div className="text-neutral-muted text-[11px] font-bold uppercase tracking-wider mb-4">
            Fonctionnalités clés
          </div>
          <div className="space-y-3">
            {previewFeatures.map((f, i) => {
              // Clean premium/cabinet tags for display
              const clean = f.replace(/\s*\((Premium|Cabinet|Entreprise)\)/, "");
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: appColor }} />
                  <span className="text-neutral-text text-[13px] font-medium leading-snug">{clean}</span>
                </div>
              );
            })}
          </div>
          {moreCount > 0 && (
            <Link
              to={`/applications/${app.id}`}
              className="mt-4 text-[13px] font-semibold hover:gap-2 transition-all duration-200 inline-flex items-center gap-1"
              style={{ color: appColor }}
            >
              +{moreCount} fonctionnalités <ArrowRight size={14} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
