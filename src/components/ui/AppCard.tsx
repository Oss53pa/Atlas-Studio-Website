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
  "App": "bg-blue-50 text-blue-600 border-blue-200",
  "App mobile": "bg-emerald-50 text-emerald-600 border-emerald-200",
};

export function AppCard({ app, index = 0 }: AppCardProps) {
  const minPrice = Math.min(...Object.values(app.pricing));
  const isComingSoon = app.status === 'coming_soon';

  return (
    <Link
      to={`/applications/${app.id}`}
      className={`block bg-white border border-warm-border rounded-xl p-5 card-hover group ${isComingSoon ? 'opacity-80' : ''}`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <AppLogo name={app.name} size={18} color="text-gold" />
        <div className="flex items-center gap-1.5">
          {isComingSoon && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-amber-50 text-amber-600 border-amber-200">
              <Clock size={10} />
              Bientôt
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeBadgeClass[app.type] || ""}`}>
            {app.type}
          </span>
        </div>
      </div>
      <p className="text-neutral-muted text-[12px] mb-1.5">{app.tagline}</p>
      <p className="text-neutral-body text-[13px] leading-relaxed mb-3 line-clamp-2">{app.desc}</p>

      <div className="flex items-baseline justify-between pt-2 border-t border-warm-border">
        <div>
          {minPrice === 0 ? (
            <span className="text-gold text-sm font-extrabold">Gratuit</span>
          ) : (
            <>
              <span className="text-gold text-lg font-extrabold">{minPrice}</span>
              <span className="text-neutral-muted text-[11px] ml-0.5">/mois</span>
            </>
          )}
        </div>
        <span className="text-gold text-[12px] font-semibold group-hover:translate-x-1 transition-transform duration-300">
          Détails &rarr;
        </span>
      </div>
    </Link>
  );
}
