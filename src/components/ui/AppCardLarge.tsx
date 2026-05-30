import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Clock, ExternalLink } from "lucide-react";
import { AppLogo } from "./Logo";
import { StyledText } from "./StyledText";
import { StartTrialButton } from "../marketplace/StartTrialButton";
import type { AppItem } from "../../config/content";
import type { AppStatus } from "../../lib/database.types";
import { planEntries } from "../../lib/utils";

interface AppCardLargeProps {
  app: AppItem & { status?: AppStatus };
  reverse?: boolean;
}

const typeBadgeClass: Record<string, string> = {
  "Module ERP": "bg-gold/10 text-gold border-gold/25",
  "App": "bg-blue-500/10 text-blue-300 border-blue-500/25",
  "App mobile": "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
};

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

export function AppCardLarge({ app, reverse = false }: AppCardLargeProps) {
  const prices = planEntries(app.pricing);
  const period = app.pricingPeriod || "mois";
  const isComingSoon = app.status === "coming_soon";
  const appColor = app.color || "#A9B57E";
  const highlights = app.highlights || [];

  const previewFeatures = app.features.slice(0, 6);
  const moreCount = Math.max(0, app.features.length - 6);

  const detailLink = app.external_url || `/applications/${app.id}`;
  const isExternal = !!app.external_url;
  const linkProps = isExternal ? { target: "_blank" as const, rel: "noopener noreferrer" } : {};

  return (
    <div
      className={`relative bg-ink-100 border border-white/[0.06] rounded-2xl overflow-hidden card-hover ${isComingSoon ? "opacity-85" : ""} shadow-premium`}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] z-10"
        style={{
          background: `linear-gradient(90deg, ${appColor}00 0%, ${appColor}cc 30%, ${appColor} 50%, ${appColor}cc 70%, ${appColor}00 100%)`,
        }}
      />
      {/* Subtle ambient glow on hover */}
      <div
        className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[120%] h-[80%] opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 30% 50% at 50% 0%, ${appColor}1a 0%, transparent 70%)`,
        }}
      />

      <div className={`relative flex flex-col lg:flex-row ${reverse ? "lg:flex-row-reverse" : ""}`}>
        {/* Info */}
        <div className="flex-1 p-8 md:p-10">
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <AppLogo name={app.name} size={26} color="text-gold" />
            <div className="flex items-center gap-1.5">
              {isComingSoon && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium border bg-amber-500/10 text-amber-300 border-amber-500/25">
                  <Clock size={10} /> Bientôt
                </span>
              )}
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${typeBadgeClass[app.type] || ""}`}>
                {app.type}
              </span>
            </div>
          </div>

          <p className="text-neutral-muted text-sm mb-2 font-medium tracking-wide">{app.tagline}</p>
          <p className="text-neutral-placeholder text-[15px] leading-relaxed mb-6 font-light"><StyledText>{app.desc}</StyledText></p>

          {highlights.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-7">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium border backdrop-blur-sm"
                  style={{
                    color: appColor,
                    backgroundColor: `${appColor}12`,
                    borderColor: `${appColor}30`,
                  }}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          <div className="flex items-end gap-7 flex-wrap mb-7">
            {prices.map(([planName, price]) => (
              <div key={planName}>
                <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-[0.14em] mb-1">{planName}</div>
                <div className="flex items-baseline gap-1">
                  {price === 0 ? (
                    <span className="text-gradient-gold font-mono text-2xl font-semibold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-gradient-gold font-mono text-2xl font-semibold">{formatPrice(price)}</span>
                      <span className="text-neutral-muted text-[12px] font-light">FCFA/{period}</span>
                    </>
                  )}
                </div>
                {app.pricingNotes?.[planName] && (
                  <div className="text-neutral-muted/80 text-[11px] font-light mt-0.5">{app.pricingNotes[planName]}</div>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isExternal ? (
              <a href={detailLink} {...linkProps} className="btn-gold !px-6 !py-3 !text-[13px]">
                Découvrir {app.name} <ExternalLink size={15} strokeWidth={2} />
              </a>
            ) : (
              <Link to={detailLink} className="btn-gold !px-6 !py-3 !text-[13px]">
                Découvrir {app.name} <ArrowRight size={15} strokeWidth={2} />
              </Link>
            )}
            {!isComingSoon && (
              <StartTrialButton appId={app.id} appName={app.name} />
            )}
          </div>
        </div>

        {/* Features */}
        <div className="lg:w-[400px] xl:w-[440px] relative p-8 md:p-10 border-t lg:border-t-0 lg:border-l border-white/[0.05] flex flex-col justify-center"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0.005) 100%)",
          }}
        >
          <div className="text-neutral-muted text-[11px] font-semibold uppercase tracking-[0.14em] mb-5 flex items-center gap-2">
            <span className="w-6 h-px" style={{ background: `linear-gradient(90deg, ${appColor} 0%, transparent 100%)` }} />
            Fonctionnalités clés
          </div>
          <div className="space-y-3.5">
            {previewFeatures.map((f, i) => {
              const clean = f.replace(/\s*\((Premium|Cabinet|Entreprise)\)/, "");
              return (
                <div key={i} className="flex items-start gap-3">
                  <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" style={{ color: appColor }} strokeWidth={2} />
                  <span className="text-neutral-light text-[13px] font-light leading-snug"><StyledText>{clean}</StyledText></span>
                </div>
              );
            })}
          </div>
          {moreCount > 0 && (
            isExternal ? (
              <a href={detailLink} {...linkProps} className="mt-6 text-[13px] font-medium hover:gap-2 transition-all duration-300 inline-flex items-center gap-1.5" style={{ color: appColor }}>
                +{moreCount} fonctionnalités <ArrowRight size={14} />
              </a>
            ) : (
              <Link to={detailLink} className="mt-6 text-[13px] font-medium hover:gap-2 transition-all duration-300 inline-flex items-center gap-1.5" style={{ color: appColor }}>
                +{moreCount} fonctionnalités <ArrowRight size={14} />
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
