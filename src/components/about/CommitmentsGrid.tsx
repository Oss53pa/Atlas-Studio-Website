import { ScrollReveal } from "../ui/ScrollReveal";
import { StyledText } from "../ui/StyledText";

interface Commitment { title: string; desc: string; }

const COMMITMENTS: Commitment[] = [
  {
    title: "Zéro retraitement",
    desc: "L'information doit être utile tout de suite, dans le bon format. Si vous devez exporter pour analyser, c'est à nous de le corriger, pas à vous de le contourner.",
  },
  {
    title: "Vos données restent les vôtres",
    desc: "Proph3t tourne en local. Synchronisation transparente. Aucune dépendance à une plateforme étrangère pour accéder à vos propres données.",
  },
  {
    title: "Fonctionne partout, tout le temps",
    desc: "Pensé hors ligne dès la conception. Réseau dégradé, coupure, site isolé : votre outil continue de tourner et d'enregistrer.",
  },
  {
    title: "Prix africain, qualité internationale",
    desc: "Tarifs en FCFA. Mobile Money et carte bancaire. Cinq à dix fois moins cher que les ERP internationaux, sans rien sacrifier.",
  },
  {
    title: "Vos normes, nativement",
    desc: "SYSCOHADA, OHADA, fiscalité UEMOA et CEMAC, intégrés en natif. La différence se sent à chaque clôture.",
  },
  {
    title: "On s'améliore avec vous",
    desc: "Chaque retour du terrain devient une fonctionnalité. La fondatrice y est toujours : ce que vous vivez aujourd'hui, nous le construisons pour demain.",
  },
];

export function CommitmentsGrid() {
  return (
    <section className="relative bg-onyx border-b border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
          <div className="lg:col-span-8">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Engagements
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[14px] md:text-[16px] lg:text-[26px] text-neutral-light max-w-3xl">
              Ce sur quoi vous pouvez <span className="kinetic-word">compter</span>.
            </h2>
          </div>
          <div className="lg:col-span-4 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45">
            {COMMITMENTS.length} engagements · sans clause d'échappatoire
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-10">
          {COMMITMENTS.map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 60}>
              <article className="border-t border-white/[0.06] pt-6">
                <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4">
                  {String(i + 1).padStart(2, "0")} · Promesse
                </div>
                <h3 className="font-display font-medium text-[20px] md:text-[22px] text-neutral-light tracking-tight leading-snug mb-3">
                  <StyledText>{c.title}</StyledText>
                </h3>
                <p className="text-[13px] md:text-[14px] text-neutral-muted font-light leading-relaxed">
                  <StyledText>{c.desc}</StyledText>
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
