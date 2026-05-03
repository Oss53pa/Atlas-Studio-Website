import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "../components/ui/Logo";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-onyx flex items-center justify-center px-5 md:px-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-dotgrid opacity-30 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] glow-gold pointer-events-none" />
      <div className="relative text-center">
        <div className="mb-10">
          <Logo size={36} color="text-neutral-light" />
        </div>
        <div className="text-gradient-gold text-[120px] md:text-[160px] font-mono font-bold mb-4 leading-none tracking-tight">404</div>
        <h1 className="text-neutral-light text-3xl md:text-4xl font-semibold mb-4 tracking-tight">Page introuvable</h1>
        <p className="text-neutral-muted text-sm mb-10 max-w-sm mx-auto font-light leading-relaxed">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className="btn-gold">
          <ArrowLeft size={16} strokeWidth={2.2} />
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
