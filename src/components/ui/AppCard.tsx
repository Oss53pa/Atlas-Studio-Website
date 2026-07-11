import { Link } from "react-router-dom";
import { Clock, ArrowUpRight } from "lucide-react";
import { AppLogo } from "./Logo";
import { StyledText } from "./StyledText";
import type { AppItem } from "../../config/content";
import type { AppStatus } from "../../lib/database.types";
import { planEntries } from "../../lib/utils";

interface AppCardProps {
  app: AppItem & { status?: AppStatus };
  index?: number;
}

const typeBadgeClass: Record<string, string> = {
  "Module ERP": "bg-gold/10 text-gold border-gold/25",
  "App": "bg-blue-500/10 text-blue-300 border-blue-500/25",
  "App mobile": "bg-emerald-500/10 text-emerald-300 border-emerald-500/25",
};

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

export function AppCard({ app, index = 0 }: AppCardProps) {
  const minPrice = Math.min(...planEntries(app.pricing).map(([, v]) => v));
  const period = app.pricingPeriod || "mois";
  const isComingSoon = app.status === 'coming_soon';
  const accent = app.color || 'var(--c-accent)';

  const sharedClassName = `relative block bg-ink-100 border border-white/[0.05] rounded-2xl p-6 card-hover shadow-premium group overflow-hidden ${isComingSoon ? 'opacity-85' : ''}`;
  const sharedStyle = { animationDelay: `${index * 60}ms` };

  const content = (
    <>
      {/* Premium top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent}cc 50%, transparent 100%)`,
        }}
      />
      {/* Subtle glow on hover */}
      <div
        className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[200%] h-[200%] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 30% 20% at 50% 25%, ${accent}18 0%, transparent 70%)`,
        }}
      />

      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <AppLogo name={app.name} size={20} color="text-gold" />
          <div className="flex items-center gap-1.5">
            {isComingSoon && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-amber-500/10 text-amber-300 border-amber-500/25">
                <Clock size={10} />
                Bientôt
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeBadgeClass[app.type] || ""}`}>
              {app.type}
            </span>
          </div>
        </div>
        <p className="text-neutral-muted text-[12px] mb-1.5 font-medium tracking-wide">{app.tagline}</p>
        <p className="text-neutral-placeholder text-[13px] leading-relaxed mb-4 line-clamp-2 font-light">
          <StyledText>{app.desc}</StyledText>
        </p>

        <div className="flex items-baseline justify-between pt-4 border-t border-white/[0.05]">
          <div>
            {minPrice === 0 ? (
              <span className="text-gradient-gold text-base font-semibold">Gratuit</span>
            ) : (
              <>
                <span className="text-gradient-gold font-mono text-lg font-semibold">{formatPrice(minPrice)}</span>
                <span className="text-neutral-muted text-[11px] ml-1.5 font-light">FCFA/{period}</span>
              </>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-gold text-[12px] font-medium group-hover:gap-1.5 transition-all duration-300">
            Détails
            <ArrowUpRight size={14} strokeWidth={2} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
          </span>
        </div>
      </div>
    </>
  );

  if (app.external_url) {
    return (
      <a href={app.external_url} target="_blank" rel="noopener noreferrer" className={sharedClassName} style={sharedStyle}>
        {content}
      </a>
    );
  }

  return (
    <Link to={`/applications/${app.id}`} className={sharedClassName} style={sharedStyle}>
      {content}
    </Link>
  );
}
