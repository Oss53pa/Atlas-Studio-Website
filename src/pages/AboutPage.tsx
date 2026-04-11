import { Link } from 'react-router-dom';
import { SEOHead } from '../components/ui/SEOHead';
import { AboutHero } from '../components/about/AboutHero';
import { ProblemsGrid } from '../components/about/ProblemsGrid';
import { DifferentiatorsList } from '../components/about/DifferentiatorsList';
import { CredibilitySection } from '../components/about/CredibilitySection';
import { CommitmentsGrid } from '../components/about/CommitmentsGrid';

export default function AboutPage() {
  return (
    <main style={{ background: '#0A0A0A', minHeight: '100vh' }}>
      <SEOHead
        title="À propos"
        description="Atlas Studio est née d'une frustration vécue pendant 20 ans dans les secteurs pétrolier, minier et retail en Afrique : des outils qui obligent à exporter et retraiter pour obtenir une information utile."
        canonical="/a-propos"
      />

      <AboutHero />
      <ProblemsGrid />
      <DifferentiatorsList />
      <CredibilitySection />
      <CommitmentsGrid />

      {/* CTA final */}
      <section
        className="px-20 py-18 md:px-12 md:py-14 sm:px-6 sm:py-10"
        style={{
          textAlign: 'center',
          borderTop: '0.5px solid #1E1E2E',
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 500,
            color: '#F5F5F5',
            marginBottom: 12,
            letterSpacing: '-0.01em',
          }}
        >
          Prêt à voir la différence ?
        </div>
        <p
          style={{
            fontSize: 14,
            color: '#888888',
            maxWidth: 480,
            margin: '0 auto 28px',
            lineHeight: 1.7,
          }}
        >
          14 jours d'essai gratuit. Aucune carte requise. Accès immédiat.
        </p>
        <div
          style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <Link
            to="/portal"
            style={{
              background: '#EF9F27',
              color: '#000000',
              padding: '12px 28px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Essai gratuit — 14 jours
          </Link>
          <Link
            to="/contact"
            style={{
              background: 'transparent',
              color: '#F5F5F5',
              padding: '12px 28px',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 500,
              border: '0.5px solid #2A2A3A',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Demander une démo
          </Link>
        </div>
      </section>
    </main>
  );
}
