import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
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
      <section className="relative pt-28 pb-16 md:pt-32 md:pb-20 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] glow-gold pointer-events-none" />
        <div className="relative max-w-site mx-auto text-center">
          <ScrollReveal>
            <div className="section-eyebrow justify-center" style={{ display: "inline-flex" }}>Applications</div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gradient-light mb-5 tracking-tight leading-[1.12]">Nos Solutions</h1>
            <p className="text-neutral-muted text-base md:text-lg font-light max-w-2xl mx-auto leading-relaxed mb-10">
              Des outils professionnels pensés pour les réalités africaines.
              Comptabilité SYSCOHADA, liasse fiscale, signature électronique : tout ce qu'il faut pour digitaliser votre gestion, sans détour.
            </p>
            {activeFilters.length > 2 && (
              <div className="flex gap-2 justify-center flex-wrap">
                {activeFilters.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-300 ${
                      filter === f.value
                        ? "btn-gold !py-2.5 !px-5 !text-[13px] !rounded-lg"
                        : "border border-white/[0.10] text-neutral-muted hover:border-gold/40 hover:text-gold hover:bg-white/[0.03] backdrop-blur-sm"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Cards */}
      <section className="relative py-16 md:py-24 px-5 md:px-8 border-b border-white/[0.04] overflow-hidden">
        <div className="relative max-w-site mx-auto flex flex-col gap-8">
          {filtered.map((app, i) => (
            <ScrollReveal key={app.id} delay={i * 100}>
              <AppCardLarge app={app} reverse={i % 2 !== 0} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative bg-ink-100 py-16 md:py-24 px-5 md:px-8 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] glow-gold opacity-50 pointer-events-none" />
        <div className="relative">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-gradient-light mb-4 tracking-tight">Prêt à digitaliser votre gestion ?</h2>
            <p className="text-neutral-muted text-[15px] font-light mb-9 max-w-md mx-auto">Souscrivez maintenant. Sans engagement, annulation à tout moment.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/portal" className="btn-gold">
                Créer un compte
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
