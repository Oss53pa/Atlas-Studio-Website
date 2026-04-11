import { SectionLabel } from '../shared/SectionLabel';
import { StatRow, type Stat } from '../shared/StatRow';

const STATS: Stat[] = [
  { value: '20+', label: "Ans d'expérience terrain" },
  { value: '10', label: 'Pays africains' },
  { value: '3', label: 'Secteurs — pétrole, mine, retail' },
  { value: '2025', label: "Fondation d'Atlas Studio" },
];

export function AboutHero() {
  return (
    <section
      className="px-20 py-18 md:px-12 md:py-14 sm:px-6 sm:py-10"
      style={{
        background: '#0A0A0A',
        borderBottom: '0.5px solid #1E1E2E',
      }}
    >
      <div style={{ maxWidth: 720 }}>
        <SectionLabel>Pourquoi Atlas Studio</SectionLabel>

        <h1
          style={{
            fontSize: 40,
            fontWeight: 500,
            color: '#F5F5F5',
            lineHeight: 1.2,
            marginBottom: 28,
            letterSpacing: '-0.01em',
          }}
        >
          Vous perdez des heures à retraiter ce que votre logiciel aurait dû vous donner{' '}
          <span style={{ color: '#EF9F27' }}>directement</span>
        </h1>

        <p
          style={{
            fontSize: 15,
            color: '#888888',
            lineHeight: 1.85,
            marginBottom: 16,
          }}
        >
          Export Excel. Retraitement. Mise en forme. Encore un export. Si cette séquence vous
          est familière, vous n'avez pas un problème d'organisation — vous avez des outils qui
          ne sont pas conçus pour vous.
        </p>

        <p
          style={{
            fontSize: 15,
            color: '#888888',
            lineHeight: 1.85,
            marginBottom: 16,
          }}
        >
          Atlas Studio est née de ce constat, vécu pendant plus de vingt ans dans les secteurs
          pétrolier, minier et retail à travers dix pays africains. Les outils existants ne
          sont pas mauvais — ils ne sont simplement pas conçus pour les réalités africaines :
          normes OHADA, Mobile Money, connectivité variable, fiscalité multi-pays.
        </p>

        <p
          style={{
            fontSize: 15,
            color: '#F5F5F5',
            lineHeight: 1.85,
            fontWeight: 500,
          }}
        >
          Nous construisons la suite que nous aurions voulu trouver.
        </p>

        <StatRow stats={STATS} />
      </div>
    </section>
  );
}
