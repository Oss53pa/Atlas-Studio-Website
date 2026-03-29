import { Link } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useContentContext } from "../components/layout/Layout";
import { AppLogo } from "../components/ui/Logo";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { GridPattern } from "../components/ui/GridPattern";
import type { AppItem } from "../config/content";

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

function AppPricingCard({ app }: { app: AppItem }) {
  const plans = Object.entries(app.pricing);
  const period = app.pricingPeriod || "mois";

  return (
    <div className="mb-14">
      <div className="mb-6">
        <Link to={`/applications/${app.id}`} className="hover:opacity-80 transition-opacity">
          <AppLogo name={app.name} size={24} color="text-gold" />
        </Link>
        <p className="text-neutral-muted text-sm mt-1">{app.tagline}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {plans.map(([plan, price], i) => (
          <div
            key={plan}
            className={`bg-white border rounded-2xl p-7 ${
              i === 1 ? "border-gold/40 ring-1 ring-gold/20" : "border-warm-border"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-neutral-text font-bold text-lg">{plan}</h4>
              {i === 1 && (
                <span className="shimmer bg-gold text-onyx px-2 py-0.5 rounded-full text-[10px] font-semibold">
                  PREMIUM
                </span>
              )}
            </div>
            <div className="mb-5">
              <span className="text-gold text-3xl font-extrabold">{formatPrice(price)}</span>
              <span className="text-neutral-muted text-sm ml-1">FCFA/{period}</span>
            </div>

            <ul className="space-y-2">
              {app.features
                .filter((f) => {
                  if (i === 0) return !f.includes("(Cabinet)") && !f.includes("(Entreprise)") && !f.includes("(Premium)");
                  return true;
                })
                .map((f, fi) => (
                  <li key={fi} className="flex items-start gap-2 text-neutral-body text-[13px]">
                    <CheckCircle size={15} className="text-gold flex-shrink-0 mt-0.5" />
                    <span>{f.replace(/ \(Cabinet\)$/, "").replace(/ \(Entreprise\)$/, "").replace(/ \(Premium\)$/, "")}</span>
                  </li>
                ))}
            </ul>

            <Link
              to={`/portal?app=${app.id}`}
              className={`mt-6 block text-center py-2.5 rounded-lg font-semibold text-sm transition-colors ${
                i === 1
                  ? "btn-gold w-full"
                  : "border border-warm-border text-neutral-body hover:border-gold/40"
              }`}
            >
              Démarrer
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { content } = useContentContext();

  return (
    <div className="min-h-screen">
      {/* Hero dark */}
      <section className="relative bg-onyx text-neutral-light pt-24 pb-14 md:pt-28 md:pb-20 px-5 md:px-8 overflow-hidden">
        <GridPattern dark />
        <div className="relative max-w-3xl mx-auto text-center">
          <ScrollReveal>
            <h1 className="text-4xl md:text-5xl font-extrabold text-neutral-light mb-4">
              Tarifs simples et transparents
            </h1>
            <p className="text-neutral-400 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
              Payez uniquement ce que vous utilisez. Changez ou annulez à tout moment.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing content */}
      <div className="bg-warm-bg text-neutral-text py-16 md:py-24 px-5 md:px-8">
        <div className="max-w-4xl mx-auto">
          {content.apps.map((app) => (
            <ScrollReveal key={app.id}>
              <AppPricingCard app={app} />
            </ScrollReveal>
          ))}

          {/* CTA */}
          <ScrollReveal>
            <div className="text-center mt-12">
              <Link to="/portal" className="btn-gold">
                Créer mon compte &rarr;
              </Link>
              <p className="text-neutral-placeholder text-[13px] mt-4">
                Essai gratuit 14 jours &middot; Sans carte bancaire &middot; Sans engagement
              </p>
            </div>
          </ScrollReveal>

          {/* FAQ preview */}
          <ScrollReveal>
            <div className="mt-20 max-w-2xl mx-auto text-center">
              <h3 className="text-neutral-text text-xl font-bold mb-4">Questions sur les tarifs ?</h3>
              <p className="text-neutral-muted text-sm mb-6">
                Consultez notre FAQ ou contactez-nous directement.
              </p>
              <div className="flex gap-4 justify-center flex-wrap">
                <Link to="/faq" className="text-gold font-semibold text-sm hover:underline">
                  Voir la FAQ &rarr;
                </Link>
                <Link to="/contact" className="text-gold font-semibold text-sm hover:underline">
                  Nous contacter &rarr;
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
