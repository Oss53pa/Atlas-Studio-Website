import { Link } from "react-router-dom";
import { CheckCircle, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { AppLogo } from "./Logo";
import { StyledText } from "./StyledText";
import type { AppItem } from "../../config/content";
import type { AppStatus } from "../../lib/database.types";

interface AppCardLargeProps {
  app: AppItem & { status?: AppStatus };
  reverse?: boolean;
}

const typeBadgeClass: Record<string, string> = {
  "Module ERP": "bg-gold/10 text-gold border-gold/20",
  "App": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "App mobile": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

export function AppCardLarge({ app, reverse = false }: AppCardLargeProps) {
  const prices = Object.entries(app.pricing);
  const period = app.pricingPeriod || "mois";
  const isComingSoon = app.status === "coming_soon";
  const appColor = app.color || "#C8A960";
  const highlights = app.highlights || [];

  const previewFeatures = app.features.slice(0, 6);
  const moreCount = Math.max(0, app.features.length - 6);

  const detailLink = app.external_url || `/applications/${app.id}`;
  const isExternal = !!app.external_url;
  const linkProps = isExternal ? { target: "_blank" as const, rel: "noopener noreferrer" } : {};

  return (
    <div
      className={`bg-dark-bg2 border border-dark-border rounded-xl overflow-hidden card-hover ${isComingSoon ? "opacity-80" : ""}`}
      style={{ borderTopWidth: "4px", borderTopColor: appColor }}
    >
      <div className={`flex flex-col lg:flex-row ${reverse ? "lg:flex-row-reverse" : ""}`}>
        {/* Info */}
        <div className="flex-1 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-4">
            <AppLogo name={app.name} size={24} color="text-gold" />
            <div className="flex items-center gap-1.5">
              {isComingSoon && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-normal border bg-amber-500/10 text-amber-400 border-amber-500/20">
                  <Clock size={10} /> Bientôt
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-normal border ${typeBadgeClass[app.type] || ""}`}>
                {app.type}
              </span>
            </div>
          </div>

          <p className="text-neutral-muted text-sm mb-2 font-light">{app.tagline}</p>
          <p className="text-neutral-placeholder text-[15px] leading-relaxed mb-6 font-light"><StyledText>{app.desc}</StyledText></p>

          {highlights.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6">
              {highlights.map((h, i) => (
                <span key={i} className="px-3 py-1.5 rounded-lg text-[12px] font-normal border" style={{ color: appColor, backgroundColor: `${appColor}15`, borderColor: `${appColor}30` }}>
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-6 flex-wrap mb-6">
            {prices.map(([planName, price]) => (
              <div key={planName}>
                <div className="text-neutral-muted text-[11px] font-normal uppercase tracking-wider mb-0.5">{planName}</div>
                <div className="flex items-baseline gap-1">
                  {price === 0 ? (
                    <span className="text-gold font-mono text-2xl font-normal">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-gold font-mono text-2xl font-normal">{formatPrice(price)}</span>
                      <span className="text-neutral-muted text-[12px] font-light">FCFA/{period}</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {isExternal ? (
            <a href={detailLink} {...linkProps} className="inline-flex items-center gap-2 bg-gold text-onyx px-6 py-3 rounded-lg font-normal text-sm hover:bg-gold-dark transition-colors">
              Découvrir {app.name} <ExternalLink size={16} />
            </a>
          ) : (
            <Link to={detailLink} className="inline-flex items-center gap-2 bg-gold text-onyx px-6 py-3 rounded-lg font-normal text-sm hover:bg-gold-dark transition-colors">
              Découvrir {app.name} <ArrowRight size={16} />
            </Link>
          )}
        </div>

        {/* Features */}
        <div className="lg:w-[380px] xl:w-[420px] bg-dark-bg3 p-8 md:p-10 border-t lg:border-t-0 lg:border-l border-dark-border flex flex-col justify-center">
          <div className="text-neutral-muted text-[11px] font-normal uppercase tracking-wider mb-4">Fonctionnalités clés</div>
          <div className="space-y-3">
            {previewFeatures.map((f, i) => {
              const clean = f.replace(/\s*\((Premium|Cabinet|Entreprise)\)/, "");
              return (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: appColor }} />
                  <span className="text-neutral-light text-[13px] font-light leading-snug"><StyledText>{clean}</StyledText></span>
                </div>
              );
            })}
          </div>
          {moreCount > 0 && (
            isExternal ? (
              <a href={detailLink} {...linkProps} className="mt-4 text-[13px] font-normal hover:gap-2 transition-all duration-200 inline-flex items-center gap-1" style={{ color: appColor }}>
                +{moreCount} fonctionnalités <ArrowRight size={14} />
              </a>
            ) : (
              <Link to={detailLink} className="mt-4 text-[13px] font-normal hover:gap-2 transition-all duration-200 inline-flex items-center gap-1" style={{ color: appColor }}>
                +{moreCount} fonctionnalités <ArrowRight size={14} />
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
