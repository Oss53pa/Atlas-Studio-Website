import { ScrollReveal } from "../ui/ScrollReveal";
import { SectionLabel } from "../shared/SectionLabel";

const FOUNDER = {
  name: "Pamela Atokouna",
  title: "Fondatrice & CEO — Atlas Studio",
  bio: "Plus de vingt ans dans les secteurs pétrolier, minier et retail à travers dix pays africains. Ce parcours n'est pas une ligne de CV — c'est la source directe de chaque fonctionnalité d'Atlas Studio. Chaque problème que vous rencontrez a été vécu, documenté, et transformé en spécification produit. Curieuse de la technologie sans en être issue à la base : c'est ce qui donne à Atlas Studio un regard de prescriptrice plutôt que de développeuse — les outils sont pensés pour ceux qui les utilisent, pas pour ceux qui les codent.",
  badges: [
    "Executive MBA INSEEC Paris",
    "MBA Sorbonne",
    "Master II Paris 1 Panthéon-Sorbonne",
    "INSA Strasbourg — Facility Management",
    "Halliburton",
    "BHP Billiton",
    "CBRE",
    "Addax Petroleum",
  ],
};

export function CredibilitySection() {
  return (
    <section className="relative bg-onyx border-b border-white/[0.04] py-20 md:py-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Pourquoi nous comprenons votre contexte</SectionLabel>
          <h2 className="text-[32px] md:text-[42px] font-medium text-gradient-light leading-[1.12] tracking-tight mb-7 max-w-3xl">
            Atlas Studio est conçue par quelqu'un qui a vécu ces problèmes{" "}
            <span className="text-gradient-gold">sur le terrain</span>.
          </h2>
          <p className="text-neutral-muted text-[15px] md:text-base font-light leading-relaxed max-w-2xl mb-14">
            Ce n'est pas une garantie de perfection — c'est une garantie de pertinence. Quand
            nous concevons une fonctionnalité, nous savons exactement dans quelle situation
            elle sera utilisée, par qui, avec quelles contraintes.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="relative bg-ink-100 border border-white/[0.06] rounded-2xl p-9 md:p-14 overflow-hidden shadow-premium-lg">
            <div className="absolute -top-px left-[8%] right-[8%] h-px"
              style={{ background: "linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.6) 50%, transparent 100%)" }}
            />
            <div className="absolute -top-1/2 left-1/2 -translate-x-1/2 w-[100%] h-[80%] pointer-events-none opacity-50"
              style={{
                background: "radial-gradient(ellipse 30% 50% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <div className="relative">
              <div className="text-neutral-light text-2xl md:text-3xl font-semibold mb-1 tracking-tight">
                {FOUNDER.name}
              </div>
              <div className="text-gradient-gold text-[13px] md:text-sm font-semibold tracking-wide mb-6">
                {FOUNDER.title}
              </div>
              <p className="text-neutral-muted text-[14px] md:text-[15px] font-light leading-relaxed mb-7 max-w-3xl">
                {FOUNDER.bio}
              </p>
              <div className="flex flex-wrap gap-2">
                {FOUNDER.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-block text-[11px] md:text-xs text-neutral-muted font-medium px-3 py-1.5 rounded-full bg-white/[0.025] border border-white/[0.08] tracking-wide"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
