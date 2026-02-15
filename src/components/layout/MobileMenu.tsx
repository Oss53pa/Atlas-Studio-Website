import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Logo } from "../ui/Logo";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { to: "/", label: "Accueil" },
  { to: "/applications", label: "Applications" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/a-propos", label: "À propos" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-72 bg-onyx z-50 animate-slide-in-right"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <Logo size={22} color="text-neutral-light" />
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-light transition-colors">
            <X size={22} />
          </button>
        </div>

        <nav className="p-6 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="text-neutral-300 hover:text-gold text-[15px] font-medium py-3 px-3 rounded-lg hover:bg-white/5 transition-all duration-200"
            >
              {l.label}
            </Link>
          ))}

          <div className="mt-6 pt-6 border-t border-white/10">
            <Link
              to="/portal"
              onClick={onClose}
              className="btn-gold w-full text-center block"
            >
              Espace Client
            </Link>
          </div>
        </nav>
      </div>
    </>
  );
}
