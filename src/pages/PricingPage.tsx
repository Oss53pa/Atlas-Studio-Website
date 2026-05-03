import { Link } from "react-router-dom";
import { CheckCircle2, X, ArrowRight } from "lucide-react";
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
  const appColor = app.color || "#10B981";

  return (
    <div className="mb-24 last:mb-0">
      <div className="flex items-center gap-4 mb-9">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center border"
          style={{
            background: `linear-gradient(135deg, ${appColor}22 0%, ${appColor}08 100%)`,
            borderColor: `${appColor}33`,
          }}
        >
          <AppLogo name={app.name.charAt(0)} size={22} color="text-gold" />
        </div>
        <div>
          <Link to={`/applications/${app.id}`} className="hover:opacity-80 transition-opacity">
            <AppLogo name={app.name} size={26} color="text-neutral-light" />
          </Link>
          <p className="text-neutral-muted text-sm font-light mt-0.5">{app.tagline}</p>
        </div>
      </div>

      <div className={`grid gap-5 ${plans.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
        {plans.map(([plan, price], i) => {
          const isPopular = plans.length > 1 && i === plans.length - 1;
          return (
            <div
              key={plan}
              className={`relative rounded-2xl p-8 flex flex-col overflow-hidden card-hover ${
                isPopular
                  ? "border border-gold/35 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_24px_56px_-12px_rgba(16,185,129,0.18)]"
                  : "border border-white/[0.06] shadow-premium"
              }`}
              style={{
                background: isPopular
                  ? "linear-gradient(180deg, rgba(16,185,129,0.05) 0%, rgba(16,185,129,0.01) 100%), #0E1525"
                  : "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, rgba(255,255,255,0.005) 100%), #0E1525",
              }}
            >
              {isPopular && (
                <>
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.7) 50%, transparent 100%)" }}
                  />
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="shimmer btn-gold !py-1 !px-4 !text-[10px] !font-bold tracking-[0.18em] !rounded-full">
                      POPULAIRE
                    </span>
                  </div>
                </>
              )}
              <div className="text-center mb-7">
                <h3 className="text-neutral-light text-lg font-semibold mb-3 tracking-tight">{plan}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  {price === 0 ? (
                    <span className="text-gradient-gold font-mono text-4xl font-semibold">Gratuit</span>
                  ) : (
                    <>
                      <span className="text-gradient-gold font-mono text-4xl font-semibold tracking-tight">{formatPrice(price)}</span>
                      <span className="text-neutral-muted text-sm ml-1.5 font-light">FCFA/{period}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1 mb-7 space-y-3">
                {app.features.map((feature, fi) => {
                  const included = i > 0 || !isPremiumFeature(feature);
                  return (
                    <div key={fi} className={`flex items-start gap-2.5 text-[13px] font-light ${included ? "text-neutral-light" : "text-neutral-muted/40"}`}>
                      {included ? (
                        <CheckCircle2 size={16} className="text-gold flex-shrink-0 mt-0.5" strokeWidth={2} />
                      ) : (
                        <X size={16} className="text-neutral-muted/30 flex-shrink-0 mt-0.5" />
                      )}
                      <span>{cleanFeatureName(feature)}</span>
                    </div>
                  );
                })}
              </div>
              <Link
                to={`/portal?app=${app.id}&plan=${encodeURIComponent(plan)}`}
                className={isPopular ? "btn-gold w-full !rounded-xl" : "btn-outline-light w-full !rounded-xl !text-[13px]"}
              >
                Souscrire
                {isPopular && <ArrowRight size={15} strokeWidth={2.2} />}
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

      {/* Hero */}
      <section className="relative pt-28 pb-16 md:pt-32 md:pb-20 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>Tarifs</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium text-gradient-light mb-5 tracking-tight leading-[1.12]">
              Tarifs simples et transparents
            </h1>
            <p className="text-neutral-muted text-base md:text-lg font-light max-w-xl mx-auto leading-relaxed">
              Payez uniquement ce que vous utilisez. Sans engagement, changez ou annulez à tout moment.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-20 md:py-28 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="relative max-w-5xl mx-auto">
          {content.apps.map((app) => (
            <ScrollReveal key={app.id}><AppPricingSection app={app} /></ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-ink-100 py-20 md:py-24 px-5 md:px-8 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] glow-gold opacity-50 pointer-events-none" />
        <div className="relative">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-medium text-gradient-light mb-4 tracking-tight">Prêt à démarrer ?</h2>
            <p className="text-neutral-muted text-[15px] font-light mb-9 max-w-md mx-auto">Souscrivez maintenant. Sans engagement, annulation à tout moment.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/portal" className="btn-gold">
                Créer mon compte
                <ArrowRight size={16} strokeWidth={2.2} />
              </Link>
              <Link to="/contact" className="btn-outline-light">Nous contacter</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
