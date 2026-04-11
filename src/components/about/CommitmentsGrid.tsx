import { ScrollReveal } from "../ui/ScrollReveal";
import { SectionLabel } from "../shared/SectionLabel";

interface Commitment {
  title: string;
  desc: string;
}

const COMMITMENTS: Commitment[] = [
  {
    title: "Zéro retraitement",
    desc:
      "L'information doit être disponible dans le format utile, immédiatement. Si vous exportez pour analyser, c'est notre problème à résoudre — pas le vôtre à contourner.",
  },
  {
    title: "Vos données vous appartiennent",
    desc:
      "PROPH3T en local. Synchronisation transparente. Aucune dépendance à une plateforme étrangère pour accéder à vos propres données.",
  },
  {
    title: "Fonctionne partout, toujours",
    desc:
      "Offline-first par architecture. Connectivité dégradée, coupure réseau, site isolé — votre outil continue de fonctionner et de sauvegarder.",
  },
  {
    title: "Prix africain, qualité internationale",
    desc:
      "Tarifs en FCFA. Mobile Money et carte bancaire acceptés. 5 à 10 fois moins cher que les ERP internationaux — sans compromis sur les fonctionnalités.",
  },
  {
    title: "Conçu pour vos normes",
    desc:
      "SYSCOHADA, OHADA, fiscalité UEMOA et CEMAC — natifs, pas adaptés. La différence se mesure au quotidien, à chaque clôture fiscale.",
  },
  {
    title: "S'améliore en continu",
    desc:
      "Chaque retour terrain devient une spécification. La fondatrice est encore sur le terrain — ce que vous vivez aujourd'hui est ce que nous construisons demain.",
  },
];

export function CommitmentsGrid() {
  return (
    <section className="bg-dark-bg2 border-b border-dark-border py-20 md:py-28 px-5 md:px-8">
      <div className="max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Ce que nous croyons</SectionLabel>
          <h2 className="text-[32px] md:text-[40px] font-normal text-neutral-light leading-tight tracking-tight mb-12 max-w-2xl">
            Nos engagements envers vous
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {COMMITMENTS.map((c, i) => (
            <ScrollReveal key={c.title} delay={i * 60}>
              <div className="h-full bg-onyx border border-dark-border rounded-xl p-7 card-hover">
                <h3 className="text-neutral-light text-base md:text-lg font-normal mb-3 leading-snug">
                  {c.title}
                </h3>
                <p className="text-neutral-muted text-[13px] md:text-sm font-light leading-relaxed">
                  {c.desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
