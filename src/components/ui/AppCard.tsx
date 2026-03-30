import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import { AppLogo } from "./Logo";
import type { AppItem } from "../../config/content";
import type { AppStatus } from "../../lib/database.types";

interface AppCardProps {
  app: AppItem & { status?: AppStatus };
  index?: number;
}

const typeBadgeClass: Record<string, string> = {
  "Module ERP": "bg-gold/10 text-gold border-gold/20",
  "App": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "App mobile": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

export function AppCard({ app, index = 0 }: AppCardProps) {
  const minPrice = Math.min(...Object.values(app.pricing));
  const period = app.pricingPeriod || "mois";
  const isComingSoon = app.status === 'coming_soon';

  return (
    <Link
      to={`/applications/${app.id}`}
      className={`block bg-dark-bg2 border border-dark-border rounded-xl p-5 card-hover group overflow-hidden ${isComingSoon ? 'opacity-80' : ''}`}
      style={{ animationDelay: `${index * 60}ms`, borderTopWidth: '3px', borderTopColor: app.color || '#C8A960' }}
    >
      <div className="flex items-center justify-between mb-2">
        <AppLogo name={app.name} size={18} color="text-gold" />
        <div className="flex items-center gap-1.5">
          {isComingSoon && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-500/10 text-amber-400 border-amber-500/20">
              <Clock size={10} />
              Bientôt
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadgeClass[app.type] || ""}`}>
            {app.type}
          </span>
        </div>
      </div>
      <p className="text-neutral-muted text-[12px] mb-1.5 font-light">{app.tagline}</p>
      <p className="text-neutral-placeholder text-[13px] leading-relaxed mb-3 line-clamp-2 font-light">{app.desc}</p>

      <div className="flex items-baseline justify-between pt-2 border-t border-dark-border">
        <div>
          {minPrice === 0 ? (
            <span className="text-gold text-sm font-extrabold">Gratuit</span>
          ) : (
            <>
              <span className="text-gold font-mono text-lg font-semibold">{formatPrice(minPrice)}</span>
              <span className="text-neutral-muted text-[11px] ml-1 font-light">FCFA/{period}</span>
            </>
          )}
        </div>
        <span className="text-gold text-[12px] font-semibold group-hover:translate-x-1 transition-transform duration-300">
          Détails →
        </span>
      </div>
    </Link>
  );
}
