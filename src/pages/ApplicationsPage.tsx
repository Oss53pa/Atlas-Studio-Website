import { useState } from "react";
import { useApps } from "../hooks/useApps";
import { SectionHeading } from "../components/ui/SectionHeading";
import { ScrollReveal } from "../components/ui/ScrollReveal";
import { AppCard } from "../components/ui/AppCard";
import type { AppType } from "../config/content";

type Filter = "Tous" | AppType;

const filters: { label: string; value: Filter }[] = [
  { label: "Tous", value: "Tous" },
  { label: "Modules ERP", value: "Module ERP" },
  { label: "Apps", value: "App" },
  { label: "Apps mobiles", value: "App mobile" },
];

export default function ApplicationsPage() {
  const { apps } = useApps();
  const [filter, setFilter] = useState<Filter>("Tous");

  const visibleApps = apps.filter(a => a.status !== 'unavailable');
  const filtered = filter === "Tous"
    ? visibleApps
    : visibleApps.filter((a) => a.type === filter);

  const erpCount = visibleApps.filter(a => a.type === "Module ERP").length;
  const appCount = visibleApps.filter(a => a.type === "App").length;
  const mobileCount = visibleApps.filter(a => a.type === "App mobile").length;
  const counts: Record<string, number> = { "Tous": visibleApps.length, "Module ERP": erpCount, "App": appCount, "App mobile": mobileCount };

  return (
    <div className="bg-warm-bg text-neutral-text pt-28 pb-24 px-6 min-h-screen">
      <div className="max-w-site mx-auto">
        <ScrollReveal>
          <SectionHeading
            title="Nos Produits"
            subtitle={`${visibleApps.length} solutions professionnelles : un ERP modulaire et des apps standalone pour tous vos besoins.`}
          />
        </ScrollReveal>

        <ScrollReveal>
          <div className="flex gap-2 justify-center flex-wrap mb-10">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-5 py-2.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
                  filter === f.value
                    ? "bg-gold text-onyx"
                    : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
                }`}
              >
                {f.label}
                <span className="ml-1.5 text-[11px] opacity-70">{counts[f.value]}</span>
              </button>
            ))}
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((app, i) => (
            <ScrollReveal key={app.id} delay={i * 50}>
              <AppCard app={app} index={i} />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </div>
  );
}
