import { ScrollReveal } from "../ui/ScrollReveal";

interface Problem {
  title: string;
  body: string;
  emphasis: string;
}

const PROBLEMS: Problem[] = [
  {
    title: "Vos données sont là. Mais hors de portée.",
    body:
      "Votre logiciel contient tout. Pourtant, pour un simple tableau de bord, vous exportez, retraitez, reformatez.",
    emphasis:
      "Chez nous, la donnée arrive prête à décider, en temps réel, sans aucune manipulation.",
  },
  {
    title: "Les ERP du marché ne parlent pas SYSCOHADA",
    body:
      "Sage, Odoo, Zoho reposent sur des normes occidentales, « adaptées » tant bien que mal à l'OHADA.",
    emphasis:
      "Atlas Finance et LiassPilot sont nés SYSCOHADA. La balance alimente la liasse fiscale toute seule, sans un seul export.",
  },
  {
    title: "Le Mobile Money n'a rien d'accessoire",
    body:
      "Pour la plupart des entreprises africaines, Orange Money, MTN MoMo et Wave, c'est le quotidien.",
    emphasis:
      "Nous les avons placés au cœur de nos outils, jamais en simple plugin.",
  },
  {
    title: "Le réseau lâche. Pas votre outil.",
    body:
      "Sur un site minier, en zone périurbaine ou pendant une coupure, votre logiciel doit tenir.",
    emphasis:
      "Toutes nos apps fonctionnent hors ligne et se synchronisent dès que le réseau revient.",
  },
];

export function ProblemsGrid() {
  return (
    <section className="relative bg-onyx border-b border-white/[0.04] py-20 md:py-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <h2 className="text-[32px] md:text-[42px] font-bold text-gradient-light leading-[1.12] tracking-tight mb-14 max-w-2xl">
            Ce qui vous freine aujourd'hui, nous l'avons réglé
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {PROBLEMS.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 80}>
              <div className="relative h-full bg-ink-100 border border-white/[0.05] rounded-2xl p-8 card-hover shadow-premium overflow-hidden">
                <div
                  className="absolute top-0 left-0 bottom-0 w-[3px]"
                  style={{ background: "linear-gradient(180deg, var(--c-volt) 0%, var(--c-accent) 100%)" }}
                />
                <h3 className="text-neutral-light text-base md:text-lg font-bold mb-3 leading-snug tracking-tight">
                  {p.title}
                </h3>
                <p className="text-neutral-body text-[13px] md:text-sm font-normal leading-relaxed mb-3">
                  {p.body}
                </p>
                <p className="text-neutral-body text-[13px] md:text-sm font-medium leading-relaxed">
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
