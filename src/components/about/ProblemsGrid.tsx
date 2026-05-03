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
    <section className="relative bg-onyx border-b border-white/[0.04] py-20 md:py-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Ce que nous résolvons</SectionLabel>
          <h2 className="text-[32px] md:text-[42px] font-semibold text-gradient-light leading-[1.1] tracking-tight mb-14 max-w-2xl">
            Des problèmes que vous connaissez probablement
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROBLEMS.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 80}>
              <div className="relative h-full bg-ink-100 border border-white/[0.06] rounded-2xl p-8 card-hover overflow-hidden">
                <div
                  className="absolute top-0 left-0 bottom-0 w-[3px]"
                  style={{ background: "linear-gradient(180deg, #10B981 0%, rgba(16,185,129,0.2) 100%)" }}
                />
                <h3 className="text-neutral-light text-base md:text-lg font-semibold mb-3 leading-snug tracking-tight">
                  {p.title}
                </h3>
                <p className="text-neutral-muted text-[13px] md:text-sm font-light leading-relaxed mb-3">
                  {p.body}
                </p>
                <p className="text-neutral-light/85 text-[13px] md:text-sm font-medium leading-relaxed">
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
