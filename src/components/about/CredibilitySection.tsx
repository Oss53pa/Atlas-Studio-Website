import { ScrollReveal } from "../ui/ScrollReveal";
import { SectionLabel } from "../shared/SectionLabel";

const FOUNDER = {
  initials: "PA",
  name: "Pamela Atokouna",
  titles: [
    "Fondatrice & CEO — Atlas Studio",
    "Senior Director Retail — Rocklane Capital",
  ],
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
    <section className="bg-onyx border-b border-dark-border py-20 md:py-28 px-5 md:px-8">
      <div className="max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Pourquoi nous comprenons votre contexte</SectionLabel>
          <h2 className="text-[32px] md:text-[40px] font-normal text-neutral-light leading-tight tracking-tight mb-6 max-w-3xl">
            Atlas Studio est conçue par quelqu'un qui a vécu ces problèmes{" "}
            <span className="text-gold">sur le terrain</span>.
          </h2>
          <p className="text-neutral-muted text-[15px] md:text-base font-light leading-relaxed max-w-2xl mb-14">
            Ce n'est pas une garantie de perfection — c'est une garantie de pertinence. Quand
            nous concevons une fonctionnalité, nous savons exactement dans quelle situation
            elle sera utilisée, par qui, avec quelles contraintes.
          </p>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <div className="bg-dark-bg2 border border-dark-border rounded-2xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-8 md:gap-10 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-onyx border-2 border-gold flex items-center justify-center">
                  <span className="text-gold text-xl md:text-2xl font-normal tracking-wider">
                    {FOUNDER.initials}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="text-neutral-light text-xl md:text-2xl font-normal mb-1">
                  {FOUNDER.name}
                </div>
                <div className="space-y-0.5 mb-5">
                  {FOUNDER.titles.map((t) => (
                    <div key={t} className="text-gold text-[13px] md:text-sm font-normal">
                      {t}
                    </div>
                  ))}
                </div>
                <p className="text-neutral-muted text-[14px] md:text-[15px] font-light leading-relaxed mb-6">
                  {FOUNDER.bio}
                </p>
                <div className="flex flex-wrap gap-2">
                  {FOUNDER.badges.map((b) => (
                    <span
                      key={b}
                      className="inline-block text-[11px] md:text-xs text-neutral-muted font-light px-3 py-1.5 rounded-full bg-onyx border border-dark-border"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
