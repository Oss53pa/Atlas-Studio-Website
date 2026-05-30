import { useState } from "react";
import { Link } from "react-router-dom";
import { useApps } from "../hooks/useApps";
import { SEOHead } from "../components/ui/SEOHead";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { AppCardLarge } from "../components/ui/AppCardLarge";
import type { AppType } from "../config/content";

type Filter = "Tous" | AppType;

export default function ApplicationsPage() {
  const { apps } = useApps();
  const [filter, setFilter] = useState<Filter>("Tous");

  const visibleApps = apps.filter(a => a.status !== 'unavailable');
  const filtered = filter === "Tous" ? visibleApps : visibleApps.filter((a) => a.type === filter);

  const typeCountMap: Record<string, number> = {};
  for (const a of visibleApps) typeCountMap[a.type] = (typeCountMap[a.type] || 0) + 1;

  const activeFilters: { label: string; value: Filter; count?: number }[] = [
    { label: "Tous", value: "Tous", count: visibleApps.length },
    ...(typeCountMap["Module ERP"] ? [{ label: "Modules ERP", value: "Module ERP" as Filter, count: typeCountMap["Module ERP"] }] : []),
    ...(typeCountMap["App"] ? [{ label: "Apps", value: "App" as Filter, count: typeCountMap["App"] }] : []),
    ...(typeCountMap["App mobile"] ? [{ label: "Apps mobiles", value: "App mobile" as Filter, count: typeCountMap["App mobile"] }] : []),
  ];

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="Applications" description="Découvrez les applications Atlas Studio." canonical="/applications" />

      {/* ════════════════════════════════════════════════════════════════
           HERO ÉDITORIAL
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative pt-28 pb-12 md:pt-36 md:pb-20 px-5 md:px-10 lg:px-16 border-b border-white/[0.06] overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          {/* méta-strip */}
          <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-10">
            <span className="meta-led" />
            <span>Catalogue</span>
            <span className="text-neutral-light/25">/</span>
            <span>{visibleApps.length} applications</span>
            <span className="text-neutral-light/25 hidden sm:inline">/</span>
            <span className="hidden sm:inline text-neutral-light/45">Toutes opérationnelles</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[44px] sm:text-[60px] md:text-[80px] lg:text-[96px] text-neutral-light mb-8">
                Nos <span className="kinetic-word">solutions</span>.
              </h1>
              <p className="text-[16px] md:text-[18px] text-neutral-muted font-light max-w-[540px] leading-relaxed">
                Des outils professionnels pensés pour les réalités africaines. Comptabilité SYSCOHADA, liasse fiscale, signature électronique — tout ce qu'il faut pour digitaliser sans détour.
              </p>
            </div>

            {/* filtres en chips mono à droite */}
            {activeFilters.length > 2 && (
              <div className="lg:col-span-4 lg:text-right">
                <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-3">
                  Filtrer
                </div>
                <div className="flex gap-2 flex-wrap lg:justify-end">
                  {activeFilters.map((f) => {
                    const isActive = filter === f.value;
                    return (
                      <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`meta-mono text-[11px] tracking-[0.16em] uppercase px-3 py-1.5 rounded-full border transition-colors ${
                          isActive
                            ? "border-[#A9B57E] text-[#0a0a0a] bg-[#A9B57E]"
                            : "border-white/[0.12] text-neutral-light/70 hover:border-[#A9B57E]/40 hover:text-[#A9B57E]"
                        }`}
                      >
                        {f.label}
                        {typeof f.count === "number" && (
                          <span className={`ml-2 ${isActive ? "text-black/60" : "text-neutral-light/35"}`}>{f.count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           CARTES — empilées avec rythme alterné
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative px-5 md:px-10 lg:px-16">
        <div className="relative max-w-[1280px] mx-auto">
          {filtered.map((app, i) => (
            <ScrollReveal key={app.id} delay={i * 80}>
              <AppCardLarge app={app} index={i + 1} reverse={i % 2 !== 0} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════
           § FIN — closing
         ════════════════════════════════════════════════════════════════ */}
      <section className="relative bg-ink-100 border-t border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
        <div className="absolute inset-0 hero-techgrid pointer-events-none" />
        <div className="relative max-w-[1280px] mx-auto">
          <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-8 flex items-center gap-3">
            <span className="meta-led" />
            <span>§ FIN — Catalogue</span>
          </div>
          <h2 className="font-display font-medium tracking-[-0.03em] leading-[0.98] text-[36px] sm:text-[52px] md:text-[72px] text-neutral-light max-w-4xl mb-12">
            Prêt à digitaliser ? <span className="italic font-light text-neutral-light/70">Sans engagement.</span>
          </h2>
          <div className="flex items-baseline gap-8 flex-wrap">
            <Link to="/portal" className="cta-arrow cta-arrow--primary">
              Créer un compte
            </Link>
            <Link to="/contact" className="cta-arrow">
              Nous contacter
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
