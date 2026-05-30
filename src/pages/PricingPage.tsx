import { Link } from "react-router-dom";
import { useContentContext } from "../components/layout/Layout";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { SEOHead } from "../components/ui/SEOHead";
import type { AppItem } from "../config/content";
import { planEntries } from "../lib/utils";
import { useBundles } from "../hooks/useBundles";

function formatPrice(price: number): string {
  return price.toLocaleString("fr-FR");
}

// ─── Suites / bundles — bandeau éditorial ─────────────────────────────────
function BundlesSection() {
  const { bundles, loading } = useBundles();
  if (loading || bundles.length === 0) return null;

  return (
    <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
          <div className="lg:col-span-7">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Suites
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[30px] lg:text-[38px] text-neutral-light">
              Économisez avec les <span className="kinetic-word">suites</span>.
            </h2>
          </div>
          <div className="lg:col-span-5 lg:text-right">
            <p className="text-[14px] text-neutral-muted font-light leading-relaxed lg:ml-auto max-w-[420px]">
              Regroupez plusieurs applications et profitez de <span className="text-[#A9B57E]">−20 %</span> sur le total. Engagement annuel cumulable.
            </p>
          </div>
        </div>

        <div className="grid gap-x-10 gap-y-12 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {bundles.map((b, i) => (
            <ScrollReveal key={b.id} delay={i * 80}>
              <article className="relative border-t border-white/[0.06] pt-8 h-full flex flex-col">
                {b.is_popular && (
                  <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-3">
                    ★ Populaire
                  </span>
                )}
                <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-2">
                  Suite {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display font-medium text-[24px] md:text-[28px] text-neutral-light tracking-tight mb-2 leading-tight">
                  {b.name}
                </h3>
                {b.tagline && <p className="text-[13px] text-neutral-muted font-light leading-relaxed mb-6">{b.tagline}</p>}

                <ul className="space-y-2 mb-7 meta-mono text-[11px] tracking-[0.14em]">
                  {b.included.map((inc, idx) => (
                    <li key={idx} className="flex items-baseline gap-2 text-neutral-light/80">
                      <span className="text-[#A9B57E]">◇</span>
                      <span>{inc.app}</span>
                      <span className="text-neutral-light/35">· {inc.plan}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto border-t border-white/[0.06] pt-5">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-gradient-gold font-mono text-[32px] md:text-[36px] font-semibold tracking-tight tabular-nums">
                      {formatPrice(b.price_monthly_fcfa)}
                    </span>
                    <span className="text-neutral-muted text-[13px] font-light">FCFA/mois</span>
                  </div>
                  <div className="text-[11px] text-neutral-muted font-light mb-6 mt-1">
                    <span className="line-through tabular-nums">{formatPrice(b.sum_monthly_fcfa)}</span>
                    <span className="text-[#A9B57E] ml-2 font-medium">−{formatPrice(b.savings_monthly_fcfa)} FCFA/mois</span>
                  </div>
                  <Link to={`/portal?bundle=${b.slug}`} className={b.is_popular ? "cta-arrow cta-arrow--primary" : "cta-arrow"}>
                    Souscrire cette suite
                  </Link>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Bloc tarification par app — ledger éditorial ─────────────────────────
const PREMIUM_TAGS = ["(Premium)", "(Cabinet)", "(Entreprise)"];
const isPremiumFeature = (f: string) => PREMIUM_TAGS.some(tag => f.includes(tag));
const cleanFeatureName = (f: string) => {
  let clean = f;
  for (const tag of PREMIUM_TAGS) clean = clean.replace(` ${tag}`, "");
  return clean;
};

function AppPricingSection({ app, index }: { app: AppItem; index: number }) {
  const plans = planEntries(app.pricing);
  const period = app.pricingPeriod || "mois";
  const appColor = app.color || "#A9B57E";
  const numStr = String(index).padStart(2, "0");

  return (
    <div className="border-t border-white/[0.06] pt-16 pb-20 last:pb-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mb-12 items-baseline">
        <div className="lg:col-span-7">
          <div className="meta-mono text-[10px] tracking-[0.22em] uppercase mb-4" style={{ color: appColor }}>
            § {numStr} — {app.type}
          </div>
          <Link to={`/applications/${app.id}`} className="block group">
            <h3 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[30px] lg:text-[36px] text-neutral-light group-hover:opacity-80 transition-opacity">
              {app.name}
            </h3>
          </Link>
          <p className="font-display italic font-light text-[16px] md:text-[18px] text-neutral-light/65 mt-2">
            {app.tagline}
          </p>
        </div>
        <div className="lg:col-span-5 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40">
          {plans.length} {plans.length > 1 ? "plans disponibles" : "plan disponible"}
        </div>
      </div>

      <div className={`grid gap-x-8 gap-y-12 ${plans.length <= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-3"}`}>
        {plans.map(([plan, price], i) => {
          const isPopular = plans.length > 1 && i === plans.length - 1;
          return (
            <article key={plan} className="relative flex flex-col border-t border-white/[0.06] pt-6">
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/55">
                  {plan}
                </span>
                {isPopular && (
                  <span className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E]">
                    ★ Recommandé
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mb-2">
                {price === 0 ? (
                  <span className="text-gradient-gold font-mono text-[36px] md:text-[44px] font-semibold">Gratuit</span>
                ) : (
                  <>
                    <span className="text-gradient-gold font-mono text-[36px] md:text-[44px] font-semibold tracking-tight tabular-nums">
                      {formatPrice(price)}
                    </span>
                    <span className="text-neutral-muted text-[13px] font-light">FCFA/{period}</span>
                  </>
                )}
              </div>
              {app.pricingNotes?.[plan] && (
                <p className="text-[11px] text-neutral-muted font-light mb-5">{app.pricingNotes[plan]}</p>
              )}

              <ul className="flex-1 mb-7 space-y-2.5">
                {app.features.map((feature, fi) => {
                  const included = i > 0 || !isPremiumFeature(feature);
                  return (
                    <li key={fi} className={`flex items-baseline gap-2.5 text-[13px] font-light leading-snug ${included ? "text-neutral-light/85" : "text-neutral-muted/40 line-through"}`}>
                      <span className="meta-mono text-[10px] tabular-nums" style={{ color: included ? appColor : "currentColor", opacity: included ? 0.7 : 0.4 }}>
                        {String(fi + 1).padStart(2, "0")}
                      </span>
                      <span>{cleanFeatureName(feature)}</span>
                    </li>
                  );
                })}
              </ul>

              <Link
                to={`/portal?app=${app.id}&plan=${encodeURIComponent(plan)}`}
                className={isPopular ? "cta-arrow cta-arrow--primary" : "cta-arrow"}
              >
                Souscrire
              </Link>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page complète ────────────────────────────────────────────────────────
export default function PricingPage() {
  const { content } = useContentContext();

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="Tarifs" description="Tarifs simples et transparents. Atlas Studio." canonical="/tarifs" />

      {/* HERO ÉDITORIAL */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-20 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10">
            <span className="meta-led" />
            <span>Tarifs</span>
            <span className="text-neutral-light/25">/</span>
            <span>{content.apps?.length ?? 0} produits</span>
            <span className="text-neutral-light/25 hidden sm:inline">/</span>
            <span className="hidden sm:inline text-neutral-light/45">Sans engagement</span>
          </div>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[32px] sm:text-[40px] md:text-[52px] lg:text-[60px] text-neutral-light mb-8 max-w-5xl">
            Tarifs <span className="kinetic-word">transparents</span>. <br />
            <span className="italic font-light text-neutral-light/75">Pas de surprise.</span>
          </h1>
          <p className="text-[16px] md:text-[18px] text-neutral-muted font-light max-w-[560px] leading-relaxed">
            Payez uniquement ce que vous utilisez. Changez ou annulez à tout moment, depuis votre espace client.
          </p>
        </div>
      </section>

      {/* PLANS PAR APP — ledger */}
      <section className="relative px-5 md:px-10 lg:px-16 py-12 md:py-16">
        <div className="relative max-w-[1280px] mx-auto">
          {content.apps.map((app, i) => (
            <ScrollReveal key={app.id} delay={i * 60}>
              <AppPricingSection app={app} index={i + 1} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* SUITES */}
      <BundlesSection />

      {/* § FIN */}
      <section className="relative bg-onyx border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8 flex items-center gap-3">
            <span className="meta-led" />
            <span>§ FIN — Tarifs</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.98] text-[28px] sm:text-[36px] md:text-[44px] text-neutral-light max-w-4xl mb-12">
            Prêt à démarrer ? <span className="italic font-light text-neutral-light/70">Création en 2 minutes.</span>
          </h2>
          <div className="flex items-baseline gap-8 flex-wrap">
            <Link to="/portal" className="cta-arrow cta-arrow--primary">Créer mon compte</Link>
            <Link to="/contact" className="cta-arrow">Nous contacter</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
