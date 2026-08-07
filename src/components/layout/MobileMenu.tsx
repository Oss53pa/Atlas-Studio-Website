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
  { to: "/blog", label: "Blog" },
  { to: "/a-propos", label: "À propos" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[80vw] max-w-80 z-50 animate-slide-in-right border-l border-white/[0.06]"
        style={{
          background:
            "linear-gradient(180deg, var(--c-surface) 0%, var(--c-bg) 100%)",
        }}
      >
        {/* Subtle gold accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.4) 50%, transparent 100%)" }}
        />

        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <Logo size={22} color="text-neutral-light" />
          <button onClick={onClose} className="text-neutral-400 hover:text-gold transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <X size={22} />
          </button>
        </div>

        <nav className="p-6 flex flex-col gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="text-neutral-300 hover:text-gold text-[15px] font-medium py-3 px-3 rounded-lg hover:bg-white/[0.04] transition-all duration-200"
            >
              {l.label}
            </Link>
          ))}

          <div className="mt-6 pt-6 border-t border-white/[0.06]">
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
