import { ScrollReveal } from "../ui/ScrollReveal";
import { SectionLabel } from "../shared/SectionLabel";
import { StatRow, type Stat } from "../shared/StatRow";

const STATS: Stat[] = [
  { value: "20+", label: "Ans d'expérience terrain" },
  { value: "10", label: "Pays africains" },
  { value: "3", label: "Secteurs — pétrole, mine, retail" },
  { value: "2025", label: "Fondation d'Atlas Studio" },
];

export function AboutHero() {
  return (
    <section className="relative bg-onyx border-b border-dark-border pt-28 pb-20 md:pt-32 md:pb-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] glow-gold pointer-events-none" />

      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Pourquoi Atlas Studio</SectionLabel>
          <h1 className="text-4xl md:text-5xl lg:text-[56px] font-normal text-neutral-light leading-[1.15] tracking-tight mb-8 max-w-4xl">
            Vous perdez des heures à retraiter ce que votre logiciel aurait dû vous donner{" "}
            <span className="text-gold">directement</span>.
          </h1>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="max-w-2xl space-y-5">
            <p className="text-[15px] md:text-base text-neutral-muted font-light leading-relaxed">
              Export Excel. Retraitement. Mise en forme. Encore un export. Si cette séquence
              vous est familière, vous n'avez pas un problème d'organisation — vous avez des
              outils qui ne sont pas conçus pour vous.
            </p>
            <p className="text-[15px] md:text-base text-neutral-muted font-light leading-relaxed">
              Atlas Studio est née de ce constat, vécu pendant plus de vingt ans dans les
              secteurs pétrolier, minier et retail à travers dix pays africains. Les outils
              existants ne sont pas mauvais — ils ne sont simplement pas conçus pour les
              réalités africaines : normes OHADA, Mobile Money, connectivité variable,
              fiscalité multi-pays.
            </p>
            <p className="text-[15px] md:text-base text-neutral-light font-normal leading-relaxed">
              Nous construisons la suite que nous aurions voulu trouver.
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
