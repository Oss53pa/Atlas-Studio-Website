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

  const activeFilters: { label: string; value: Filter }[] = [
    { label: "Tous", value: "Tous" },
    ...(typeCountMap["Module ERP"] ? [{ label: "Modules ERP", value: "Module ERP" as Filter }] : []),
    ...(typeCountMap["App"] ? [{ label: "Apps", value: "App" as Filter }] : []),
    ...(typeCountMap["App mobile"] ? [{ label: "Apps mobiles", value: "App mobile" as Filter }] : []),
  ];

  return (
    <div className="min-h-screen bg-onyx">
      <SEOHead title="Applications" description="Découvrez les applications Atlas Studio." canonical="/applications" />

      {/* Hero */}
      <section className="pt-24 pb-16 md:pt-28 md:pb-20 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-site mx-auto text-center">
          <ScrollReveal>
            <div className="text-[11px] font-semibold text-gold uppercase tracking-[0.1em] mb-3">Applications</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-neutral-light mb-4 tracking-tight">Nos Solutions</h1>
            <p className="text-neutral-muted text-base font-light max-w-2xl mx-auto leading-relaxed mb-8">
              Des outils professionnels conçus pour les réalités africaines.
              Comptabilité SYSCOHADA, liasse fiscale, signature électronique — tout ce qu'il faut pour digitaliser votre gestion.
            </p>
            {activeFilters.length > 2 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {activeFilters.map((f) => (
                  <button key={f.value} onClick={() => setFilter(f.value)} className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${filter === f.value ? "bg-gold text-onyx" : "border border-dark-border2 text-neutral-muted hover:border-gold/40 hover:text-gold"}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Cards */}
      <section className="py-16 md:py-24 px-5 md:px-8 border-b border-dark-border">
        <div className="max-w-site mx-auto flex flex-col gap-8">
          {filtered.map((app, i) => (
            <ScrollReveal key={app.id} delay={i * 100}>
              <AppCardLarge app={app} reverse={i % 2 !== 0} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-bg2 py-16 md:py-20 px-5 md:px-8 text-center">
        <ScrollReveal>
          <h2 className="text-3xl md:text-4xl font-extrabold text-neutral-light mb-4">Prêt à digitaliser votre gestion ?</h2>
          <p className="text-neutral-muted text-[15px] font-light mb-8 max-w-md mx-auto">Essai gratuit 14 jours. Sans engagement, sans carte bancaire.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/portal" className="btn-gold">Démarrer gratuitement</Link>
            <Link to="/contact" className="btn-outline-light">Nous contacter</Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
