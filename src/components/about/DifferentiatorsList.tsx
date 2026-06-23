import { ScrollReveal } from "../ui/ScrollReveal";
import { StyledText } from "../ui/StyledText";

interface Differentiator { num: string; title: string; desc: string; }

const ITEMS: Differentiator[] = [
  {
    num: "01",
    title: "Votre rapport de direction prêt en 20 minutes, sans ouvrir Excel",
    desc: "Atlas Finance embarque un véritable éditeur de rapports. Tableaux de bord, graphiques, KPIs, commentaires : tout reste relié à vos données en temps réel. Vous composez, vous envoyez en validation, vous archivez. Sans jamais quitter le logiciel.",
  },
  {
    num: "02",
    title: "Votre balance comptable remplit la liasse fiscale toute seule",
    desc: "Atlas Finance produit vos états SYSCOHADA (Bilan, Compte de Résultat, TFT, TAFIRE). La balance file directement dans LiassPilot, qui génère la liasse complète (84 onglets, 129 contrôles de cohérence) sans la moindre manipulation. Ce pont n'existe nulle part ailleurs en zone OHADA.",
  },
  {
    num: "03",
    title: "Un contrat part en validation et revient signé, sans rien installer",
    desc: "ADVIST envoie votre document à chaque intervenant via un lien sécurisé. Chacun annote, approuve et signe depuis son navigateur. Vous suivez l'avancement en direct, et le compte rendu de validation se génère tout seul à la clôture du circuit.",
  },
  {
    num: "04",
    title: "Une IA qui connaît votre entreprise et ne parle à personne",
    desc: "Proph3t, notre moteur d'IA, tourne en local sur votre infrastructure via Ollama. Il connaît vos données en temps réel, maîtrise SYSCOHADA et la fiscalité de votre pays. Vos chiffres ne quittent jamais vos murs. Le cloud reste possible, jamais imposé.",
  },
  {
    num: "05",
    title: "Toutes vos entités, plusieurs pays, un seul compte",
    desc: "Un seul Atlas Studio pour la Côte d'Ivoire, le Sénégal, le Cameroun et le reste. Chaque pays arrive avec ses paramètres fiscaux et comptables déjà configurés. 17 pays OHADA couverts.",
  },
];

export function DifferentiatorsList() {
  return (
    <section className="relative bg-onyx border-b border-white/[0.06] py-24 md:py-32 px-5 md:px-10 lg:px-16 overflow-hidden">
      <div className="relative max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 items-end">
          <div className="lg:col-span-8">
            <div className="meta-mono text-[11px] tracking-[0.22em] uppercase text-[#A9B57E] mb-6">
              § Différenciateurs
            </div>
            <h2 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[14px] md:text-[16px] lg:text-[26px] text-neutral-light max-w-3xl">
              Ce que vous pouvez faire avec{" "}
              <span className="font-logo text-gradient-champagne text-[80%]">Atlas Studio</span>
            </h2>
          </div>
          <div className="lg:col-span-4 lg:text-right meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45">
            Cinq choses que vos outils actuels rendent impossibles
          </div>
        </div>

        <div>
          {ITEMS.map((item, i) => (
            <ScrollReveal key={item.num} delay={i * 60}>
              <article className={`group grid grid-cols-12 gap-4 md:gap-8 py-10 border-t border-white/[0.06] ${i === ITEMS.length - 1 ? "border-b" : ""}`}>
                <div className="col-span-12 md:col-span-2 flex items-baseline">
                  <span className="font-display font-light text-[28px] md:text-[36px] leading-none text-[#A9B57E]/85 tracking-tighter tabular-nums group-hover:text-[#D6DDB3] transition-colors">
                    {item.num}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-10">
                  <h3 className="font-display font-medium text-[16px] md:text-[20px] leading-tight text-neutral-light mb-4 tracking-[-0.02em] group-hover:text-[#D6DDB3] transition-colors">
                    <StyledText>{item.title}</StyledText>
                  </h3>
                  <p className="text-[14px] md:text-[15px] text-neutral-muted font-light leading-relaxed max-w-[720px]">
                    <StyledText>{item.desc}</StyledText>
                  </p>
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
