import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-onyx flex flex-col px-5 md:px-10 lg:px-16 pt-28 md:pt-36 pb-16 relative overflow-hidden">
      <div className="absolute inset-0 hero-techgrid pointer-events-none" />

      <div className="relative max-w-[1280px] mx-auto w-full flex-1 flex flex-col justify-center">
        {/* méta-strip */}
        <div className="meta-mono text-[10px] md:text-[11px] tracking-[0.22em] uppercase text-neutral-light/55 flex items-baseline gap-3 md:gap-4 mb-12">
          <span className="meta-led" />
          <span>§ Erreur 404</span>
          <span className="text-neutral-light/25">/</span>
          <span>Page introuvable</span>
          <span className="text-neutral-light/25 hidden sm:inline">/</span>
          <span className="hidden sm:inline text-neutral-light/45">Atlas Studio</span>
        </div>

        {/* 404 monumental */}
        <div className="font-display font-medium tracking-[-0.04em] leading-[0.85] text-[80px] sm:text-[120px] md:text-[160px] lg:text-[200px] text-[#A9B57E]/85 mb-10 tabular-nums">
          404
        </div>

        <h1 className="font-display font-medium tracking-[-0.025em] leading-[1.04] text-[24px] md:text-[30px] lg:text-[36px] text-neutral-light max-w-3xl mb-6">
          Cette page n'existe <span className="italic font-light text-neutral-light/70">plus ou pas encore</span>.
        </h1>
        <p className="text-[15px] md:text-[17px] text-neutral-muted font-light leading-relaxed max-w-[540px] mb-12">
          L'URL a peut-être changé, ou la page n'a jamais existé. Reprenez le fil au début ou explorez le catalogue.
        </p>

        <div className="flex items-baseline gap-8 flex-wrap">
          <Link to="/" className="cta-arrow cta-arrow--primary">Retour à l'accueil</Link>
          <Link to="/applications" className="cta-arrow">Voir le catalogue</Link>
        </div>
      </div>

      <div className="relative max-w-[1280px] mx-auto w-full meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/35 flex justify-between flex-wrap gap-4 mt-16">
        <span>Statut HTTP · 404 Not Found</span>
        <span>Atlas Studio · OHADA · {new Date().getFullYear()}</span>
      </div>
    </div>
  );
}
