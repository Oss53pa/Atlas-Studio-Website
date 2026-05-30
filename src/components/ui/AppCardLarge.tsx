import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { StyledText } from "./StyledText";
import { StartTrialButton } from "../marketplace/StartTrialButton";
import type { AppItem } from "../../config/content";
import type { AppStatus } from "../../lib/database.types";
import { planEntries } from "../../lib/utils";

interface AppCardLargeProps {
  app: AppItem & { status?: AppStatus };
  /** Indice d'ordre dans la liste (1-based) — affiché en numéro éditorial. */
  index?: number;
  /** Inverse la disposition (col features à gauche) pour le rythme alterné. */
  reverse?: boolean;
}

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

export function AppCardLarge({ app, index, reverse = false }: AppCardLargeProps) {
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
  const numStr = typeof index === "number" ? String(index).padStart(2, "0") : undefined;

  return (
    <article className={`relative border-y border-white/[0.06] py-12 md:py-16 ${isComingSoon ? "opacity-75" : ""}`}>
      {/* fine accent line indexée sur la couleur du produit */}
      <div className="absolute top-0 left-0 h-px w-24"
        style={{ background: `linear-gradient(90deg, ${appColor} 0%, transparent 100%)` }} />

      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>

        {/* COL PRINCIPALE — édito */}
        <div className="lg:col-span-7">
          {/* méta : index + type */}
          <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
            <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E]">
              {numStr ? <>§ {numStr} — </> : null}{app.type}
            </div>
            {isComingSoon && (
              <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-amber-400/80">
                · Bientôt disponible
              </span>
            )}
          </div>

          {/* Wordmark + tagline */}
          <h3 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[22px] sm:text-[26px] md:text-[30px] text-neutral-light mb-3">
            {app.name}
          </h3>
          <p className="font-display font-light italic text-[14px] md:text-[16px] text-neutral-light/70 mb-6 leading-snug">
            {app.tagline}
          </p>

          <p className="text-[14px] md:text-[15px] text-neutral-muted leading-relaxed mb-8 font-light max-w-[640px]">
            <StyledText>{app.desc}</StyledText>
          </p>

          {/* Highlights — chips mono */}
          {highlights.length > 0 && (
            <div className="flex gap-x-4 gap-y-2 flex-wrap mb-10 meta-mono text-[11px] tracking-[0.18em] uppercase">
              {highlights.map((h, i) => (
                <span key={i} className="inline-flex items-baseline gap-2" style={{ color: appColor }}>
                  <span className="opacity-60">◇</span>
                  <span>{h}</span>
                </span>
              ))}
            </div>
          )}

          {/* Prix — ledger horizontal */}
          {prices.length > 0 && (
            <div className="border-t border-white/[0.06] pt-6 mb-8">
              <div className="flex flex-wrap gap-x-10 gap-y-6">
                {prices.map(([planName, price]) => (
                  <div key={planName}>
                    <div className="meta-mono text-[10px] tracking-[0.2em] uppercase text-neutral-light/45 mb-1.5">
                      {planName}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      {price === 0 ? (
                        <span className="text-gradient-gold font-mono text-[28px] md:text-[32px] font-semibold tracking-tight tabular-nums">Gratuit</span>
                      ) : (
                        <>
                          <span className="text-gradient-gold font-mono text-[28px] md:text-[32px] font-semibold tracking-tight tabular-nums">{formatPrice(price)}</span>
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
            </div>
          )}

          {/* CTAs — flèches éditoriales */}
          <div className="flex items-baseline gap-6 md:gap-8 flex-wrap">
            {isExternal ? (
              <a href={detailLink} {...linkProps} className="cta-arrow cta-arrow--primary">
                Découvrir {app.name} <ExternalLink size={14} strokeWidth={1.8} className="ml-1" />
              </a>
            ) : (
              <Link to={detailLink} className="cta-arrow cta-arrow--primary">
                Découvrir {app.name}
              </Link>
            )}
            {!isComingSoon && (
              <StartTrialButton appId={app.id} appName={app.name} />
            )}
          </div>
        </div>

        {/* COL FEATURES — ledger compact */}
        <div className="lg:col-span-5 lg:border-l border-white/[0.06] lg:pl-10">
          <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-6 flex items-baseline gap-2">
            <span className="w-6 h-px" style={{ background: `linear-gradient(90deg, ${appColor} 0%, transparent 100%)` }} />
            Fonctionnalités clés
          </div>
          <ul className="space-y-3.5">
            {previewFeatures.map((f, i) => {
              const clean = f.replace(/\s*\((Premium|Cabinet|Entreprise)\)/, "");
              return (
                <li key={i} className="flex items-baseline gap-3 text-[13px] text-neutral-light/85 font-light leading-snug">
                  <span className="meta-mono text-[10px] tabular-nums" style={{ color: appColor, opacity: 0.7 }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span><StyledText>{clean}</StyledText></span>
                </li>
              );
            })}
          </ul>
          {moreCount > 0 && (
            isExternal ? (
              <a href={detailLink} {...linkProps} className="cta-arrow mt-6 !text-[13px]">
                +{moreCount} fonctionnalités
              </a>
            ) : (
              <Link to={detailLink} className="cta-arrow mt-6 !text-[13px]">
                +{moreCount} fonctionnalités
              </Link>
            )
          )}
        </div>
      </div>
    </article>
  );
}
