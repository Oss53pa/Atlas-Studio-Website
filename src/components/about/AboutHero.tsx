import { ScrollReveal } from "../ui/ScrollReveal";

interface Stat { value: string; label: string; }

const STATS: Stat[] = [
  { value: "20+",  label: "Ans d'expérience terrain" },
  { value: "10",   label: "Pays africains" },
  { value: "3",    label: "Pétrole · Mine · Retail" },
  { value: "2025", label: "Fondation d'Atlas Studio" },
];

export function AboutHero() {
  return (
    <section className="relative bg-onyx border-b border-white/[0.06] pt-32 md:pt-40 pb-20 md:pb-28 px-5 md:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 hero-techgrid pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 20% 30%, rgba(169,181,126,0.10) 0%, transparent 60%)" }} />

      <div className="relative max-w-[1280px] mx-auto">
        {/* méta-strip */}
        <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-12">
          <span className="meta-led" />
          <span>§ Origine</span>
          <span className="text-neutral-light/25">/</span>
          <span>Atlas Studio · MMXXVI</span>
          <span className="text-neutral-light/25 hidden sm:inline">/</span>
          <span className="hidden sm:inline text-neutral-light/45">Manifeste</span>
        </div>

        <ScrollReveal>
          <h1 className="font-display font-medium tracking-[-0.035em] leading-[0.98] text-[20px] sm:text-[24px] md:text-[28px] lg:text-[34px] text-neutral-light max-w-5xl mb-12">
            Vous passez des heures à refaire ce que votre logiciel aurait dû livrer <span className="kinetic-word">directement</span>.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
            <div className="lg:col-span-7 space-y-6 text-[15px] md:text-[17px] text-neutral-muted font-light leading-relaxed">
              <p>
                Export Excel. Retraitement. Mise en forme. Encore un export. Cette routine,
                vous la connaissez par cœur. Le problème ne vient pas de votre organisation,
                mais d'outils qui n'ont jamais été pensés pour vous.
              </p>
              <p>
                Atlas Studio est née sur le terrain, après plus de vingt ans dans les secteurs
                pétroliers, miniers et retail, à travers dix pays africains. Les logiciels du
                marché ne sont pas mauvais. Ils ignorent simplement vos réalités : SYSCOHADA,
                Mobile Money, réseau capricieux, fiscalité qui change à chaque frontière.
              </p>
              <p className="text-neutral-light font-display italic text-[15px] md:text-[17px] leading-snug">
                Alors nous avons bâti la suite que nous cherchions sans jamais la trouver.
              </p>
            </div>

            {/* Ledger des stats — typo éditoriale */}
            <div className="lg:col-span-5">
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/40 mb-5">
                Ledger
              </div>
              <dl className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                {STATS.map((s, i) => (
                  <div key={i} className="py-5 flex items-baseline justify-between gap-6">
                    <dt className="meta-mono text-[11px] tracking-[0.2em] uppercase text-neutral-light/55 flex-1">
                      <span className="text-[#A9B57E] mr-2">{String(i + 1).padStart(2, "0")}</span>
                      {s.label}
                    </dt>
                    <dd className="font-display font-medium text-[15px] md:text-[17px] leading-none text-[#D6DDB3] tracking-tight tabular-nums">
                      {s.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
