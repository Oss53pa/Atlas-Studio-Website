import { SectionLabel } from '../shared/SectionLabel';

interface Commitment {
  title: string;
  desc: string;
}

const COMMITMENTS: Commitment[] = [
  {
    title: 'Zéro retraitement',
    desc:
      "L'information doit être disponible dans le format utile, immédiatement. Si vous exportez pour analyser, c'est notre problème à résoudre — pas le vôtre à contourner.",
  },
  {
    title: 'Vos données vous appartiennent',
    desc:
      "PROPH3T en local. Synchronisation transparente. Aucune dépendance à une plateforme étrangère pour accéder à vos propres données.",
  },
  {
    title: 'Fonctionne partout, toujours',
    desc:
      'Offline-first par architecture. Connectivité dégradée, coupure réseau, site isolé — votre outil continue de fonctionner et de sauvegarder.',
  },
  {
    title: 'Prix africain, qualité internationale',
    desc:
      'Tarifs en FCFA. Mobile Money et carte bancaire acceptés. 5 à 10 fois moins cher que les ERP internationaux — sans compromis sur les fonctionnalités.',
  },
  {
    title: 'Conçu pour vos normes',
    desc:
      'SYSCOHADA, OHADA, fiscalité UEMOA et CEMAC — natifs, pas adaptés. La différence se mesure au quotidien, à chaque clôture fiscale.',
  },
  {
    title: "S'améliore en continu",
    desc:
      "Chaque retour terrain devient une spécification. La fondatrice est encore sur le terrain — ce que vous vivez aujourd'hui est ce que nous construisons demain.",
  },
];

export function CommitmentsGrid() {
  return (
    <section
      className="px-20 py-18 md:px-12 md:py-14 sm:px-6 sm:py-10"
      style={{ background: '#0A0A0A' }}
    >
      <div style={{ maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
        <SectionLabel>Ce que nous croyons</SectionLabel>

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
          Nos engagements envers vous
        </h2>

        <div className="grid grid-cols-3 gap-3 md:grid-cols-2 sm:grid-cols-1">
          {COMMITMENTS.map((c) => (
            <div
              key={c.title}
              style={{
                background: '#111111',
                border: '0.5px solid #222222',
                borderLeft: '3px solid #EF9F27',
                borderRadius: '0 10px 10px 0',
                padding: '18px',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#F5F5F5',
                  marginBottom: 8,
                  lineHeight: 1.4,
                }}
              >
                {c.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#666666',
                  lineHeight: 1.75,
                }}
              >
                {c.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
