import { Link } from "react-router-dom";
import { CheckCircle, X } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { AppLogo } from "../components/ui/Logo";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";
import type { AppItem } from "../config/content";

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

const PREMIUM_TAGS = ["(Premium)", "(Cabinet)", "(Entreprise)"];
const isPremiumFeature = (f: string) => PREMIUM_TAGS.some(tag => f.includes(tag));
const cleanFeatureName = (f: string) => {
  let clean = f;
  for (const tag of PREMIUM_TAGS) clean = clean.replace(` ${tag}`, "");
  return clean;
};

function AppPricingSection({ app }: { app: AppItem }) {
  const plans = Object.entries(app.pricing);
  const period = app.pricingPeriod || "mois";
  const appColor = app.color || "#C8A960";

  return (
    <div className="mb-20 last:mb-0">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${appColor}15` }}>
          <AppLogo name={app.name.charAt(0)} size={20} color="text-gold" />
        </div>
        <div>
          <Link to={`/applications/${app.id}`} className="hover:opacity-80 transition-opacity">
            <AppLogo name={app.name} size={24} color="text-neutral-light" />
          </Link>
          <p className="text-neutral-muted text-sm font-light">{app.tagline}</p>
        </div>
      </div>

      <div className={`grid gap-4 ${plans.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
        {plans.map(([plan, price], i) => {
          const isPopular = plans.length > 1 && i === plans.length - 1;
          return (
            <div key={plan} className={`relative rounded-xl border p-8 flex flex-col ${isPopular ? "border-gold bg-gold/[0.02]" : "border-dark-border bg-dark-bg2"}`}>
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="shimmer bg-gold text-onyx px-4 py-1 rounded-full text-[11px] font-bold tracking-wide">POPULAIRE</span>
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-neutral-light text-lg font-bold mb-2">{plan}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  {price === 0 ? (
                    <span className="text-gold font-mono text-4xl font-semibold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-gold font-mono text-3xl font-semibold">{formatPrice(price)}</span>
                      <span className="text-neutral-muted text-sm ml-1 font-light">FCFA/{period}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 mb-6 space-y-2.5">
                {app.features.map((feature, fi) => {
                  const included = i > 0 || !isPremiumFeature(feature);
                  return (
                    <div key={fi} className={`flex items-start gap-2.5 text-[13px] font-light ${included ? "text-neutral-light" : "text-neutral-muted/40"}`}>
                      {included ? <CheckCircle size={16} className="text-gold flex-shrink-0 mt-0.5" /> : <X size={16} className="text-neutral-muted/30 flex-shrink-0 mt-0.5" />}
                      <span>{cleanFeatureName(feature)}</span>
                    </div>
                  );
                })}
              </div>
              <Link to={`/portal?app=${app.id}&plan=${encodeURIComponent(plan)}`} className={`block w-full text-center py-3.5 rounded-lg font-semibold text-sm transition-all ${isPopular ? "bg-gold text-onyx hover:bg-gold-dark" : "border border-dark-border2 text-neutral-muted hover:border-neutral-muted hover:text-neutral-light"}`}>
                Souscrire
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { content } = useContentContext();

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="Tarifs" description="Tarifs simples et transparents. Atlas Studio." canonical="/tarifs" />
      <section className="pt-24 pb-16 md:pt-28 md:pb-20 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Tarifs</div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-light mb-4 tracking-tight">Tarifs simples et transparents</h1>
            <p className="text-neutral-muted text-base font-light max-w-xl mx-auto">Payez uniquement ce que vous utilisez. Sans engagement, changez ou annulez à tout moment.</p>
          </ScrollReveal>
        </div>
      </section>
      <section className="py-16 md:py-24 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-5xl mx-auto">
          {content.apps.map((app) => (
            <ScrollReveal key={app.id}><AppPricingSection app={app} /></ScrollReveal>
          ))}
        </div>
      </section>
      <section className="bg-dark-bg2 py-16 md:py-20 px-5 md:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-light mb-4">Prêt à démarrer ?</h2>
          <p className="text-neutral-muted text-[15px] font-light mb-8 max-w-md mx-auto">Essai gratuit 14 jours. Sans engagement, sans carte bancaire.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/portal" className="btn-gold">Créer mon compte</Link>
            <Link to="/contact" className="btn-outline-light">Nous contacter</Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
