import { SectionLabel } from '../shared/SectionLabel';

interface Differentiator {
  num: string;
  title: string;
  desc: string;
}

const ITEMS: Differentiator[] = [
  {
    num: '01',
    title:
      'Votre rapport de direction est prêt en 20 minutes — sans ouvrir Excel',
    desc:
      "Atlas Finance intègre un éditeur de rapports complet. Tableaux de bord, graphiques, KPIs, commentaires éditoriaux — tout est connecté en temps réel aux données. Vous composez votre rapport directement dans le logiciel, vous l'envoyez pour validation, vous l'archivez. Aucun outil externe.",
  },
  {
    num: '02',
    title:
      'La balance de votre comptabilité alimente la liasse fiscale automatiquement',
    desc:
      'Atlas Finance génère vos états financiers SYSCOHADA (Bilan, Compte de Résultat, TFT, TAFIRE). Cette balance est déversée automatiquement dans LiassPilot — qui produit la liasse fiscale complète (84 onglets, 129 contrôles de cohérence) sans aucune manipulation intermédiaire. Ce pont n\'existe nulle part ailleurs en zone OHADA.',
  },
  {
    num: '03',
    title:
      "Un contrat part en validation et revient signé sans que personne n'installe quoi que ce soit",
    desc:
      "ADVIST — Approbation Documentaire, Validation, Intégrité, Sécurité, Traçabilité — envoie votre document à chaque intervenant via un lien sécurisé. Chacun annote, approuve, signe depuis son navigateur. Le Document Owner suit l'avancement en temps réel. Un compte rendu de validation est généré automatiquement à la clôture du circuit.",
  },
  {
    num: '04',
    title: 'Votre IA connaît votre entreprise — et ne partage rien avec personne',
    desc:
      'PROPH3T, notre moteur IA, tourne en local sur votre infrastructure via Ollama. Il connaît vos données en temps réel, connaît SYSCOHADA et la fiscalité de votre pays. Vos données financières ne transitent pas par des serveurs tiers. Le cloud reste une option — jamais une obligation.',
  },
  {
    num: '05',
    title:
      'Vous gérez des entités dans plusieurs pays sans jongler entre plusieurs logiciels',
    desc:
      "Un seul compte Atlas Studio pour toutes vos entités — Côte d'Ivoire, Sénégal, Cameroun — avec les paramètres fiscaux et comptables de chaque pays configurés nativement. 17 pays OHADA couverts.",
  },
];

export function DifferentiatorsList() {
  return (
    <section
      className="px-20 py-18 md:px-12 md:py-14 sm:px-6 sm:py-10"
      style={{
        background: '#0A0A0A',
        borderBottom: '0.5px solid #1E1E2E',
      }}
    >
      <div style={{ maxWidth: 900, marginLeft: 'auto', marginRight: 'auto' }}>
        <SectionLabel>Nos produits en pratique</SectionLabel>

        <h2
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#F5F5F5',
            lineHeight: 1.25,
            marginBottom: 36,
            letterSpacing: '-0.01em',
          }}
        >
          Ce que vous pouvez faire avec Atlas Studio{' '}
          <span style={{ color: '#EF9F27' }}>
            que vous ne pouviez pas faire avant
          </span>
        </h2>

        <div>
          {ITEMS.map((item) => (
            <div
              key={item.num}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                padding: '20px 0',
                borderBottom: '0.5px solid #141414',
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 20,
                  fontWeight: 500,
                  color: '#EF9F27',
                  minWidth: 36,
                  paddingTop: 2,
                }}
              >
                {item.num}
              </div>
              <div>
                <h3
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#F5F5F5',
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: '#666666',
                    lineHeight: 1.8,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
