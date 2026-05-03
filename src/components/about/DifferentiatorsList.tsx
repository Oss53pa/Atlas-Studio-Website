import { ScrollReveal } from "../ui/ScrollReveal";
import { SectionLabel } from "../shared/SectionLabel";

interface Differentiator {
  num: string;
  title: string;
  desc: string;
}

const ITEMS: Differentiator[] = [
  {
    num: "01",
    title: "Votre rapport de direction est prêt en 20 minutes — sans ouvrir Excel",
    desc:
      "Atlas Finance intègre un éditeur de rapports complet. Tableaux de bord, graphiques, KPIs, commentaires éditoriaux — tout est connecté en temps réel aux données. Vous composez votre rapport directement dans le logiciel, vous l'envoyez pour validation, vous l'archivez. Aucun outil externe.",
  },
  {
    num: "02",
    title: "La balance de votre comptabilité alimente la liasse fiscale automatiquement",
    desc:
      "Atlas Finance génère vos états financiers SYSCOHADA (Bilan, Compte de Résultat, TFT, TAFIRE). Cette balance est déversée automatiquement dans LiassPilot — qui produit la liasse fiscale complète (84 onglets, 129 contrôles de cohérence) sans aucune manipulation intermédiaire. Ce pont n'existe nulle part ailleurs en zone OHADA.",
  },
  {
    num: "03",
    title:
      "Un contrat part en validation et revient signé sans que personne n'installe quoi que ce soit",
    desc:
      "ADVIST — Approbation Documentaire, Validation, Intégrité, Sécurité, Traçabilité — envoie votre document à chaque intervenant via un lien sécurisé. Chacun annote, approuve, signe depuis son navigateur. Le Document Owner suit l'avancement en temps réel. Un compte rendu de validation est généré automatiquement à la clôture du circuit.",
  },
  {
    num: "04",
    title: "Votre IA connaît votre entreprise — et ne partage rien avec personne",
    desc:
      "PROPH3T, notre moteur IA, tourne en local sur votre infrastructure via Ollama. Il connaît vos données en temps réel, connaît SYSCOHADA et la fiscalité de votre pays. Vos données financières ne transitent pas par des serveurs tiers. Le cloud reste une option — jamais une obligation.",
  },
  {
    num: "05",
    title:
      "Vous gérez des entités dans plusieurs pays sans jongler entre plusieurs logiciels",
    desc:
      "Un seul compte Atlas Studio pour toutes vos entités — Côte d'Ivoire, Sénégal, Cameroun — avec les paramètres fiscaux et comptables de chaque pays configurés nativement. 17 pays OHADA couverts.",
  },
];

export function DifferentiatorsList() {
  return (
    <section className="relative bg-ink-100 border-b border-white/[0.04] py-20 md:py-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <SectionLabel>Nos produits en pratique</SectionLabel>
          <h2 className="text-[32px] md:text-[42px] font-medium text-gradient-light leading-[1.12] tracking-tight mb-4 max-w-3xl">
            Ce que vous pouvez faire avec{" "}
            <span className="font-logo text-gradient-champagne">Atlas Studio</span>
          </h2>
          <p className="text-neutral-muted text-[15px] md:text-base font-light max-w-2xl leading-relaxed mb-14">
            Cinq choses concrètes que vos outils actuels ne permettent pas — et que nous
            rendons évidentes.
          </p>
        </ScrollReveal>

        <div className="space-y-2">
          {ITEMS.map((item, i) => (
            <ScrollReveal key={item.num} delay={i * 60}>
              <div className="group flex items-start gap-6 md:gap-10 py-8 border-b border-white/[0.06] last:border-b-0 hover:bg-white/[0.015] transition-colors duration-300 -mx-4 md:-mx-6 px-4 md:px-6 rounded-xl">
                <div className="font-mono text-gradient-gold text-2xl md:text-3xl font-semibold tracking-tight pt-0.5 min-w-[2.5rem] md:min-w-[3rem]">
                  {item.num}
                </div>
                <div className="flex-1">
                  <h3 className="text-neutral-light text-base md:text-lg font-semibold leading-snug mb-2 tracking-tight group-hover:text-gold transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-neutral-muted text-[13px] md:text-sm font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
