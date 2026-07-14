import { ScrollReveal } from "../ui/ScrollReveal";
import { StatRow, type Stat } from "../shared/StatRow";

const STATS: Stat[] = [
  { value: "20+", label: "Ans d'expérience terrain" },
  { value: "10", label: "Pays africains" },
  { value: "3", label: "Pétrole, mine, retail" },
  { value: "2025", label: "Fondation d'Atlas Studio" },
];

export function AboutHero() {
  return (
    <section className="relative bg-onyx border-b border-white/[0.04] pt-32 pb-24 md:pt-40 md:pb-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] glow-gold pointer-events-none" />
      <div className="aurora-blob-gold" style={{ top: "20%", right: "-15%" }} />

      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <h1 className="text-4xl md:text-5xl lg:text-[58px] font-bold text-gradient-light leading-[1.12] tracking-tight mb-9 max-w-4xl">
            Vous passez des heures à refaire ce que votre logiciel aurait dû livrer{" "}
            <span className="text-gradient-gold">directement</span>.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="max-w-2xl space-y-5">
            <p className="text-[15px] md:text-base text-neutral-muted font-light leading-relaxed">
              Export Excel. Retraitement. Mise en forme. Encore un export. Cette routine,
              vous la connaissez par cœur. Le problème ne vient pas de votre organisation,
              mais d'outils qui n'ont jamais été pensés pour vous.
            </p>
            <p className="text-[15px] md:text-base text-neutral-muted font-light leading-relaxed">
              Atlas Studio est née sur le terrain, après plus de vingt ans dans les secteurs
              pétroliers, miniers et retail, à travers dix pays africains. Les logiciels du
              marché ne sont pas mauvais. Ils ignorent simplement vos réalités : SYSCOHADA,
              Mobile Money, réseau capricieux, fiscalité qui change à chaque frontière.
            </p>
            <p className="text-[15px] md:text-base text-neutral-light font-medium leading-relaxed">
              Alors nous avons bâti la suite que nous cherchions sans jamais la trouver.
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={200}>
          <StatRow stats={STATS} />
        </ScrollReveal>
      </div>
    </section>
  );
}
