import { useParams, Link, Navigate } from "react-router-dom";
import { CheckCircle, ArrowLeft, Clock } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { useApps } from "../hooks/useApps";
import { AppLogo } from "../components/ui/Logo";
import { ScrollReveal } from "../components/ui/ScrollReveal";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { content } = useContentContext();
  const { apps } = useApps();

  // Try to find from Supabase apps first, fallback to content.apps
  const appWithStatus = apps.find((a) => a.id === id);
  const app = appWithStatus || content.apps.find((a) => a.id === id);
  if (!app) return <Navigate to="/applications" replace />;

  const pricingEntries = Object.entries(app.pricing);
  const status = appWithStatus?.status || 'available';
  const isAvailable = status === 'available';

  return (
    <div className="bg-warm-bg text-neutral-text pt-24 pb-16 md:pt-28 md:pb-24 px-5 md:px-8 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <ScrollReveal>
          <Link
            to="/applications"
            className="inline-flex items-center gap-2 text-neutral-muted text-sm hover:text-gold transition-colors mb-8"
          >
            <ArrowLeft size={16} /> Retour aux applications
          </Link>
        </ScrollReveal>

        <ScrollReveal>
          <div className="mb-10">
            <div className="flex items-center gap-3 flex-wrap">
              <AppLogo name={app.name} size={36} color="text-gold" />
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-gold/10 text-gold border-gold/20">
                {app.type}
              </span>
              {status === 'coming_soon' && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-600 border-amber-200">
                  <Clock size={12} />
                  Bientôt disponible
                </span>
              )}
            </div>
            <p className="text-neutral-muted text-[15px] mt-1">{app.tagline}</p>
          </div>
        </ScrollReveal>

        <div className="flex gap-10 flex-wrap">
          <ScrollReveal className="flex-1 min-w-[320px]">
            <div className="bg-white border border-warm-border rounded-2xl p-8">
              <h2 className="text-neutral-text text-xl font-bold mb-4">Description</h2>
              <p className="text-neutral-body text-[15px] leading-relaxed mb-6">{app.desc}</p>

              <div className="flex flex-wrap gap-2 mb-6">
                {app.categories.map((c, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full text-xs font-medium bg-warm-bg text-neutral-body border border-warm-border">
                    {c}
                  </span>
                ))}
              </div>

              <h3 className="text-neutral-text text-lg font-bold mb-4">Fonctionnalités</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {app.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle size={16} className="text-gold flex-shrink-0 mt-0.5" />
                    <span className="text-neutral-body text-sm">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal className="w-full md:w-80 flex-shrink-0" delay={150}>
            <div className="bg-white border border-warm-border rounded-2xl p-8 sticky top-28">
              <h3 className="text-neutral-text text-lg font-bold mb-6 text-center">Tarifs</h3>

              <div className="space-y-4">
                {pricingEntries.map(([plan, price]) => (
                  <div key={plan} className="border border-warm-border rounded-xl p-5 text-center hover:border-gold/40 transition-colors">
                    <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-2">
                      {plan}
                    </div>
                    <div className="text-gold text-3xl font-extrabold">{price === 0 ? "Gratuit" : price}</div>
                    {price > 0 && <div className="text-neutral-placeholder text-sm">/mois</div>}
                  </div>
                ))}
              </div>

              {isAvailable ? (
                <Link
                  to={`/portal?app=${app.id}`}
                  className="btn-gold w-full mt-6 text-center block"
                >
                  Essayer {app.name}
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full mt-6 py-3 px-6 rounded-lg bg-neutral-200 text-neutral-500 font-semibold text-sm cursor-not-allowed"
                >
                  {status === 'coming_soon' ? 'Bientôt disponible' : 'Indisponible'}
                </button>
              )}

              {isAvailable && (
                <p className="text-neutral-placeholder text-[11px] text-center mt-3">
                  14 jours d'essai gratuit
                </p>
              )}
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
