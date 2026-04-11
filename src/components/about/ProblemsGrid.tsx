import { ScrollReveal } from "../ui/ScrollReveal";
import { SectionLabel } from "../shared/SectionLabel";

interface Problem {
  title: string;
  body: string;
  emphasis: string;
}

const PROBLEMS: Problem[] = [
  {
    title: "L'information existe mais elle est inaccessible",
    body:
      "Votre logiciel contient toutes les données — mais pour obtenir un tableau de bord utile, vous exportez, retraitez, reformatez.",
    emphasis:
      "Chez nous, l'information est disponible en temps réel, dans le format décisionnel, sans manipulation intermédiaire.",
  },
  {
    title: "Les ERP existants ne parlent pas SYSCOHADA",
    body:
      "Sage, Odoo, Zoho sont construits sur des normes comptables occidentales et « adaptés » pour l'OHADA.",
    emphasis:
      "Atlas Finance et LiassPilot sont nés SYSCOHADA — la balance se déverse automatiquement dans la liasse fiscale, sans export.",
  },
  {
    title: "Le Mobile Money n'est pas une méthode secondaire",
    body:
      "Pour la majorité des entreprises africaines, Orange Money, MTN MoMo et Wave sont la norme — pas l'exception.",
    emphasis:
      "Ils sont intégrés nativement dans nos outils, pas ajoutés comme plugin.",
  },
  {
    title: "La connectivité n'est pas garantie",
    body:
      "Sur un site minier, dans une zone périurbaine, lors d'une coupure réseau — votre outil doit continuer à fonctionner.",
    emphasis:
      "Toutes nos apps sont offline-first et se synchronisent dès que le réseau revient.",
  },
];

export function ProblemsGrid() {
  return (
    <section className="bg-onyx border-b border-dark-border py-20 md:py-28 px-5 md:px-8">
      <div className="max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Ce que nous résolvons</SectionLabel>
          <h2 className="text-[32px] md:text-[40px] font-normal text-neutral-light leading-tight tracking-tight mb-12 max-w-2xl">
            Des problèmes que vous connaissez probablement
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROBLEMS.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 80}>
              <div className="h-full bg-dark-bg2 border border-dark-border rounded-xl p-7 card-hover border-l-[3px] border-l-gold">
                <h3 className="text-neutral-light text-base md:text-lg font-normal mb-3 leading-snug">
                  {p.title}
                </h3>
                <p className="text-neutral-muted text-[13px] md:text-sm font-light leading-relaxed mb-3">
                  {p.body}
                </p>
                <p className="text-neutral-light/80 text-[13px] md:text-sm font-normal leading-relaxed">
                  {p.emphasis}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
