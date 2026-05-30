import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Lien retour (par défaut: vers le site) */
  backHref?: string;
  backLabel?: string;
}

/**
 * AuthLayout — wrapper visuel partagé pour toutes les pages auth du portail.
 * Cohérent avec la palette Midnight Emerald : fond ink, dot grid, glow émeraude,
 * carte centrale glass + ligne or champagne en haut.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
  backHref = "/",
  backLabel = "Retour au site",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-onyx flex items-center justify-center px-5 py-12 relative overflow-hidden">
      {/* Layered backgrounds */}
      <div className="absolute inset-0 bg-dotgrid opacity-25 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] glow-gold pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-9">
          <Link to="/" className="inline-block group">
            <span className="font-logo text-4xl text-gradient-champagne group-hover:opacity-80 transition-opacity">
              Atlas Studio
            </span>
          </Link>
          <p className="text-neutral-muted text-[12px] mt-2 tracking-wide uppercase">Espace Client</p>
        </div>

        {/* Card */}
        <div className="relative bg-ink-100 border border-white/[0.06] rounded-3xl p-8 md:p-9 shadow-elev-4 overflow-hidden">
          {/* Top gradient accent line */}
          <div
            className="absolute -top-px left-[10%] right-[10%] h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.55) 50%, transparent 100%)",
            }}
          />

          <div className="relative">
            <h1 className="text-neutral-light text-2xl font-medium mb-2 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-neutral-muted text-sm font-light mb-7">{subtitle}</p>
            )}
            {!subtitle && <div className="mb-7" />}
            {children}
          </div>
        </div>

        {/* Back link */}
        <p className="text-center mt-6">
          <Link
            to={backHref}
            className="inline-flex items-center gap-1.5 text-neutral-muted text-[13px] hover:text-gold transition-colors group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            {backLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}
