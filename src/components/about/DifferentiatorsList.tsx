import { ScrollReveal } from "../ui/ScrollReveal";
import { StyledText } from "../ui/StyledText";

interface Differentiator {
  num: string;
  title: string;
  desc: string;
}

const ITEMS: Differentiator[] = [
  {
    num: "01",
    title: "Votre rapport de direction prêt en 20 minutes, sans ouvrir Excel",
    desc:
      "Atlas Finance embarque un véritable éditeur de rapports. Tableaux de bord, graphiques, KPIs, commentaires : tout reste relié à vos données en temps réel. Vous composez, vous envoyez en validation, vous archivez. Sans jamais quitter le logiciel.",
  },
  {
    num: "02",
    title: "Votre balance comptable remplit la liasse fiscale toute seule",
    desc:
      "Atlas Finance produit vos états SYSCOHADA (Bilan, Compte de Résultat, TFT, TAFIRE). La balance file directement dans LiassPilot, qui génère la liasse complète (84 onglets, 129 contrôles de cohérence) sans la moindre manipulation. Ce pont n'existe nulle part ailleurs en zone OHADA.",
  },
  {
    num: "03",
    title: "Un contrat part en validation et revient signé, sans rien installer",
    desc:
      "ADVIST envoie votre document à chaque intervenant via un lien sécurisé. Chacun annote, approuve et signe depuis son navigateur. Vous suivez l'avancement en direct, et le compte rendu de validation se génère tout seul à la clôture du circuit.",
  },
  {
    num: "04",
    title: "Une IA qui connaît votre entreprise et ne parle à personne",
    desc:
      "Proph3t, notre moteur d'IA, tourne en local sur votre infrastructure via Ollama. Il connaît vos données en temps réel, maîtrise SYSCOHADA et la fiscalité de votre pays. Vos chiffres ne quittent jamais vos murs. Le cloud reste possible, jamais imposé.",
  },
  {
    num: "05",
    title: "Toutes vos entités, plusieurs pays, un seul compte",
    desc:
      "Un seul Atlas Studio pour la Côte d'Ivoire, le Sénégal, le Cameroun et le reste. Chaque pays arrive avec ses paramètres fiscaux et comptables déjà configurés. 17 pays OHADA couverts.",
  },
];

export function DifferentiatorsList() {
  return (
    <section className="relative bg-ink-100 border-b border-white/[0.04] py-20 md:py-28 px-5 md:px-8 overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-20 pointer-events-none" />
      <div className="relative max-w-site mx-auto">
        <ScrollReveal>
          <h2 className="text-[32px] md:text-[42px] font-medium text-gradient-light leading-[1.12] tracking-tight mb-4 max-w-3xl">
            Ce que vous pouvez faire avec{" "}
            <span className="font-logo text-gradient-champagne">Atlas Studio</span>
          </h2>
          <p className="text-neutral-muted text-[15px] md:text-base font-light max-w-2xl leading-relaxed mb-14">
            Cinq choses que vos outils actuels rendent impossibles. Chez nous, elles vont
            de soi.
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
                    <StyledText>{item.title}</StyledText>
                  </h3>
                  <p className="text-neutral-muted text-[13px] md:text-sm font-light leading-relaxed">
                    <StyledText>{item.desc}</StyledText>
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
