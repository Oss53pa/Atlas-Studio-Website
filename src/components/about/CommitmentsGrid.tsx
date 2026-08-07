import { ScrollReveal } from "../ui/ScrollReveal";
import { StyledText } from "../ui/StyledText";

interface Commitment {
  title: string;
  desc: string;
}

const COMMITMENTS: Commitment[] = [
  {
    title: "Zéro retraitement",
    desc:
      "L'information doit être utile tout de suite, dans le bon format. Si vous devez exporter pour analyser, c'est à nous de le corriger, pas à vous de le contourner.",
  },
  {
    title: "Vos données restent les vôtres",
    desc:
      "Proph3t tourne en local. Synchronisation transparente. Aucune dépendance à une plateforme étrangère pour accéder à vos propres données.",
  },
  {
    title: "Fonctionne partout, tout le temps",
    desc:
      "Pensé hors ligne dès la conception. Réseau dégradé, coupure, site isolé : votre outil continue de tourner et d'enregistrer.",
  },
  {
    title: "Prix africain, qualité internationale",
    desc:
      "Tarifs en FCFA. Mobile Money et carte bancaire. Cinq à dix fois moins cher que les ERP internationaux, sans rien sacrifier.",
  },
  {
    title: "Vos normes, nativement",
    desc:
      "SYSCOHADA, OHADA, fiscalité UEMOA et CEMAC, intégrés en natif. La différence se sent à chaque clôture.",
  },
  {
    title: "On s'améliore avec vous",
    desc:
      "Chaque retour du terrain devient une fonctionnalité. La fondatrice y est toujours : ce que vous vivez aujourd'hui, nous le construisons pour demain.",
  },
];

export function CommitmentsGrid() {
  return (
    <section className="relative bg-ink-100 border-b border-white/[0.04] py-20 md:py-28 px-5 md:px-8 overflow-hidden">
      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <h2 className="text-[32px] md:text-[42px] font-bold text-gradient-light leading-[1.12] tracking-tight mb-14 max-w-2xl">
            Ce sur quoi vous pouvez compter
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {COMMITMENTS.map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 60}>
              <div className="relative h-full bg-ink-200 border border-white/[0.05] rounded-2xl p-7 card-hover shadow-premium overflow-hidden">
                <div className="absolute -top-px left-[10%] right-[10%] h-px"
                  style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.5) 50%, transparent 100%)" }}
                />
                <h3 className="text-neutral-light text-base md:text-lg font-semibold mb-3 leading-snug tracking-tight">
                  <StyledText>{c.title}</StyledText>
                </h3>
                <p className="text-neutral-muted text-[13px] md:text-sm font-light leading-relaxed">
                  <StyledText>{c.desc}</StyledText>
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
