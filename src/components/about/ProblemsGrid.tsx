import { SectionLabel } from '../shared/SectionLabel';

interface Problem {
  title: string;
  body: string;
  emphasis: string;
}

const PROBLEMS: Problem[] = [
  {
    title: "L'information existe mais elle est inaccessible",
    body:
      'Votre logiciel contient toutes les données — mais pour obtenir un tableau de bord utile, vous exportez, retraitez, reformatez.',
    emphasis:
      "Chez nous, l'information est disponible en temps réel, dans le format décisionnel, sans manipulation intermédiaire.",
  },
  {
    title: 'Les ERP existants ne parlent pas SYSCOHADA',
    body:
      'Sage, Odoo, Zoho sont construits sur des normes comptables occidentales et « adaptés » pour l\'OHADA.',
    emphasis:
      'Atlas Finance et LiassPilot sont nés SYSCOHADA — la balance se déverse automatiquement dans la liasse fiscale, sans export.',
  },
  {
    title: "Le Mobile Money n'est pas une méthode secondaire",
    body:
      'Pour la majorité des entreprises africaines, Orange Money, MTN MoMo et Wave sont la norme — pas l\'exception.',
    emphasis:
      'Ils sont intégrés nativement dans nos outils, pas ajoutés comme plugin.',
  },
  {
    title: "La connectivité n'est pas garantie",
    body:
      'Sur un site minier, dans une zone périurbaine, lors d\'une coupure réseau — votre outil doit continuer à fonctionner.',
    emphasis:
      'Toutes nos apps sont offline-first et se synchronisent dès que le réseau revient.',
  },
];

export function ProblemsGrid() {
  return (
    <section
      className="px-20 py-18 md:px-12 md:py-14 sm:px-6 sm:py-10"
      style={{
        background: '#0A0A0A',
        borderBottom: '0.5px solid #1E1E2E',
      }}
    >
      <div style={{ maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto' }}>
        <SectionLabel>Ce que nous résolvons</SectionLabel>

        <h2
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#F5F5F5',
            lineHeight: 1.25,
            marginBottom: 40,
            letterSpacing: '-0.01em',
            maxWidth: 680,
          }}
        >
          Des problèmes que vous connaissez probablement
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 sm:grid-cols-1">
          {PROBLEMS.map((p) => (
            <div
              key={p.title}
              style={{
                background: '#111111',
                border: '0.5px solid #222222',
                borderLeft: '3px solid #EF9F27',
                borderRadius: '0 10px 10px 0',
                padding: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#F5F5F5',
                  marginBottom: 10,
                  lineHeight: 1.4,
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: '#666666',
                  lineHeight: 1.75,
                  marginBottom: 8,
                }}
              >
                {p.body}
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: '#888888',
                  lineHeight: 1.75,
                  fontWeight: 500,
                }}
              >
                {p.emphasis}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
