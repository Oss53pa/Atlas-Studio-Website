import { ScrollReveal } from "../ui/ScrollReveal";

const FOUNDER = {
  name: "Pamela Atokouna",
  title: "Fondatrice & CEO, Atlas Studio",
  bio: "Plus de vingt ans dans les secteurs pétroliers, miniers et retail, à travers dix pays africains. Ce parcours n'est pas une ligne de CV : c'est la source de chaque fonctionnalité d'Atlas Studio. Chaque problème que vous rencontrez a d'abord été vécu, documenté, puis transformé en produit. Venue du métier plus que de la tech, Pamela conçoit les outils pour ceux qui s'en servent, pas pour ceux qui les codent.",
  badges: [
    "Executive MBA INSEEC Paris",
    "MBA Sorbonne",
    "Master II Paris 1 Panthéon-Sorbonne",
    "INSA Strasbourg · Facility Management",
    "Halliburton",
    "BHP Billiton",
    "CBRE",
    "Addax Petroleum",
  ],
};

export function CredibilitySection() {
  return (
    <section className="relative bg-ink-100 border-b border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
      <div className="absolute inset-0 hero-techgrid opacity-60 pointer-events-none" />
      <div className="relative max-w-[1280px] mx-auto">
        <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
          § Origine — Sur le terrain
        </div>
        <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[32px] md:text-[44px] lg:text-[56px] text-neutral-light max-w-4xl mb-7">
          Atlas Studio est née <span className="kinetic-word">sur le terrain</span>,<br className="hidden md:block" />
          <span className="italic font-light text-neutral-light/75">pas dans une salle de réunion.</span>
        </h2>
        <p className="text-[15px] md:text-[17px] text-neutral-muted font-light leading-relaxed max-w-3xl mb-16">
          Nous ne promettons pas la perfection. Nous promettons la pertinence. Pour chaque
          fonctionnalité, nous savons précisément qui s'en servira, dans quelle situation et
          avec quelles contraintes.
        </p>

        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 border-t border-white/[0.06] pt-12">
            {/* Identité */}
            <div className="lg:col-span-4">
              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-[#A9B57E] mb-4">
                Fondatrice
              </div>
              <div className="font-display font-medium text-[28px] md:text-[36px] text-neutral-light tracking-tight leading-tight mb-2">
                {FOUNDER.name}
              </div>
              <div className="meta-mono text-[11px] tracking-[0.18em] uppercase text-neutral-light/55">
                {FOUNDER.title}
              </div>
            </div>

            {/* Bio + parcours */}
            <div className="lg:col-span-8">
              <blockquote className="font-display font-light italic text-[18px] md:text-[22px] text-neutral-light/85 leading-snug mb-10">
                <span className="text-[#A9B57E] mr-1">«</span>
                {FOUNDER.bio}
                <span className="text-[#A9B57E] ml-1">»</span>
              </blockquote>

              <div className="meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 mb-4">
                Parcours
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 meta-mono text-[11px] tracking-[0.14em] uppercase text-neutral-light/70">
                {FOUNDER.badges.map((b, i, arr) => (
                  <span key={b} className="inline-flex items-center">
                    {b}
                    {i < arr.length - 1 && <span className="text-[#A9B57E]/40 ml-4">·</span>}
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
