import { ScrollReveal } from "../ui/ScrollReveal";

interface Problem { title: string; body: string; emphasis: string; }

const PROBLEMS: Problem[] = [
  {
    title: "Vos données sont là. Mais hors de portée.",
    body: "Votre logiciel contient tout. Pourtant, pour un simple tableau de bord, vous exportez, retraitez, reformatez.",
    emphasis: "Chez nous, la donnée arrive prête à décider, en temps réel, sans aucune manipulation.",
  },
  {
    title: "Les ERP du marché ne parlent pas SYSCOHADA",
    body: "Sage, Odoo, Zoho reposent sur des normes occidentales, « adaptées » tant bien que mal à l'OHADA.",
    emphasis: "Atlas Finance et LiassPilot sont nés SYSCOHADA. La balance alimente la liasse fiscale toute seule, sans un seul export.",
  },
  {
    title: "Le Mobile Money n'a rien d'accessoire",
    body: "Pour la plupart des entreprises africaines, Orange Money, MTN MoMo et Wave, c'est le quotidien.",
    emphasis: "Nous les avons placés au cœur de nos outils, jamais en simple plugin.",
  },
  {
    title: "Le réseau lâche. Pas votre outil.",
    body: "Sur un site minier, en zone périurbaine ou pendant une coupure, votre logiciel doit tenir.",
    emphasis: "Toutes nos apps fonctionnent hors ligne et se synchronisent dès que le réseau revient.",
  },
];

export function ProblemsGrid() {
  return (
    <section className="relative bg-ink-100 border-b border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
          <div className="lg:col-span-8">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Constat
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[32px] md:text-[44px] lg:text-[56px] text-neutral-light max-w-3xl">
              Ce qui vous freine aujourd'hui, <span className="italic font-light text-neutral-light/75">nous l'avons réglé.</span>
            </h2>
          </div>
          <div className="lg:col-span-4 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45">
            {PROBLEMS.length} freins · traités à la source
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
          {PROBLEMS.map((p, i) => (
            <ScrollReveal key={p.title} delay={i * 80}>
              <article className="border-t border-white/[0.06] pt-8">
                <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4">
                  {String(i + 1).padStart(2, "0")} · Frein
                </div>
                <h3 className="font-display font-medium text-[22px] md:text-[26px] text-neutral-light tracking-tight leading-snug mb-4">
                  {p.title}
                </h3>
                <p className="text-[14px] text-neutral-muted font-light leading-relaxed mb-4">
                  {p.body}
                </p>
                <p className="text-[14px] text-[#D6DDB3] font-display italic leading-relaxed">
                  → {p.emphasis}
                </p>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
