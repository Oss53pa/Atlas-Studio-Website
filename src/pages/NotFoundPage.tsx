import { Link } from "react-router-dom";
import { Logo } from "../components/ui/Logo";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-onyx flex items-center justify-center px-5 md:px-8">
      <div className="text-center">
        <div className="mb-8">
          <Logo size={32} color="text-neutral-light" />
        </div>
        <div className="text-gold text-8xl font-extrabold mb-4">404</div>
        <h1 className="text-neutral-light text-2xl font-bold mb-3">Page introuvable</h1>
        <p className="text-neutral-400 text-sm mb-10 max-w-sm mx-auto">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className="btn-gold">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
