import { SectionLabel } from '../shared/SectionLabel';

const FOUNDER = {
  initials: 'PA',
  name: 'Pamela Atokouna',
  titles: [
    'Fondatrice & CEO — Atlas Studio',
    'Senior Director Retail — Rocklane Capital',
  ],
  bio:
    "Plus de vingt ans dans les secteurs pétrolier, minier et retail à travers dix pays africains. Ce parcours n'est pas une ligne de CV — c'est la source directe de chaque fonctionnalité d'Atlas Studio. Chaque problème que vous rencontrez a été vécu, documenté, et transformé en spécification produit. Curieuse de la technologie sans en être issue à la base : c'est ce qui donne à Atlas Studio un regard de prescriptrice plutôt que de développeuse — les outils sont pensés pour ceux qui les utilisent, pas pour ceux qui les codent.",
  badges: [
    'Executive MBA INSEEC Paris',
    'MBA Sorbonne',
    'Master II Paris 1 Panthéon-Sorbonne',
    'INSA Strasbourg — Facility Management',
    'Halliburton · BHP Billiton · CBRE · Addax Petroleum',
  ],
};

export function CredibilitySection() {
  return (
    <section
      className="px-20 py-18 md:px-12 md:py-14 sm:px-6 sm:py-10"
      style={{
        background: '#0A0A0A',
        borderBottom: '0.5px solid #1E1E2E',
      }}
    >
      <div style={{ maxWidth: 860, marginLeft: 'auto', marginRight: 'auto' }}>
        <SectionLabel>Pourquoi nous comprenons votre contexte</SectionLabel>

        <h2
          style={{
            fontSize: 32,
            fontWeight: 500,
            color: '#F5F5F5',
            lineHeight: 1.25,
            marginBottom: 24,
            letterSpacing: '-0.01em',
          }}
        >
          Atlas Studio est conçue par quelqu'un{' '}
          <span style={{ color: '#EF9F27' }}>
            qui a vécu ces problèmes sur le terrain
          </span>
        </h2>

        <p
          style={{
            fontSize: 15,
            color: '#888888',
            lineHeight: 1.85,
            maxWidth: 700,
          }}
        >
          Ce n'est pas une garantie de perfection — c'est une garantie de pertinence. Quand
          nous concevons une fonctionnalité, nous savons exactement dans quelle situation
          elle sera utilisée, par qui, avec quelles contraintes.
        </p>

        <div
          className="flex gap-7 items-start sm:flex-col sm:gap-5"
          style={{ marginTop: 32 }}
        >
          <div
            style={{
              width: 68,
              height: 68,
              borderRadius: '50%',
              background: '#141414',
              border: '1.5px solid #EF9F27',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 500,
              color: '#EF9F27',
              flexShrink: 0,
              letterSpacing: '0.05em',
            }}
          >
            {FOUNDER.initials}
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: '#F5F5F5',
                marginBottom: 4,
              }}
            >
              {FOUNDER.name}
            </div>
            {FOUNDER.titles.map((t) => (
              <div
                key={t}
                style={{ fontSize: 11, color: '#EF9F27', lineHeight: 1.6 }}
              >
                {t}
              </div>
            ))}
            <p
              style={{
                fontSize: 13,
                color: '#666666',
                lineHeight: 1.85,
                marginTop: 14,
              }}
            >
              {FOUNDER.bio}
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                marginTop: 14,
              }}
            >
              {FOUNDER.badges.map((b) => (
                <span
                  key={b}
                  style={{
                    fontSize: 10,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: '#141414',
                    color: '#444444',
                    border: '0.5px solid #1E1E2E',
                  }}
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
