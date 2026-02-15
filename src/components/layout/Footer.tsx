import { Link } from "react-router-dom";
import { Heart, Shield } from "lucide-react";
import { Logo } from "../ui/Logo";

export function Footer() {
  return (
    <footer className="bg-onyx text-neutral-light border-t border-white/10">
      <div className="max-w-site mx-auto px-5 md:px-8 py-8 md:py-10">
        <div className="flex justify-between items-start flex-wrap gap-8">
          {/* Brand */}
          <div className="max-w-xs">
            <div className="mb-3">
              <Logo size={20} color="text-neutral-light" />
            </div>
            <p className="text-neutral-400 text-[13px] leading-relaxed">
              Des outils digitaux professionnels pour les entreprises africaines.
            </p>
          </div>

          <div className="flex gap-12 flex-wrap">
            {/* Products column */}
            <div>
              <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-3">Produits</div>
              {[
                { to: "/applications", label: "Tous les produits" },
                { to: "/tarifs", label: "Tarifs" },
                { to: "/portal", label: "Essai gratuit" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-neutral-400 text-[13px] mb-2 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Company column */}
            <div>
              <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-3">Entreprise</div>
              {[
                { to: "/a-propos", label: "À propos" },
                { to: "/contact", label: "Contact" },
                { to: "/faq", label: "FAQ" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-neutral-400 text-[13px] mb-2 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Legal column */}
            <div>
              <div className="text-neutral-500 text-[11px] font-bold uppercase tracking-wider mb-3">Légal</div>
              {[
                { to: "/mentions-legales", label: "Mentions légales" },
                { to: "/cgu", label: "CGU" },
                { to: "/confidentialite", label: "Confidentialité" },
              ].map((l) => (
                <Link key={l.to} to={l.to} className="block text-neutral-400 text-[13px] mb-2 hover:text-gold transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-5 flex justify-between flex-wrap gap-4">
          <p className="text-neutral-500 text-xs">&copy; 2026 Atlas Studio. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="text-neutral-700 hover:text-neutral-500 transition-colors" title="Administration">
              <Shield size={13} strokeWidth={1.5} />
            </Link>
            <p className="text-neutral-500 text-xs flex items-center gap-1">
              Conçu avec <Heart size={12} strokeWidth={1.5} className="text-gold" /> à Abidjan
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
