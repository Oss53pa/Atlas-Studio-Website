import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { Logo } from "../ui/Logo";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const links = [
  { to: "/",             label: "Accueil" },
  { to: "/applications", label: "Applications" },
  { to: "/tarifs",       label: "Tarifs" },
  { to: "/blog",         label: "Blog" },
  { to: "/a-propos",     label: "À propos" },
  { to: "/faq",          label: "FAQ" },
  { to: "/contact",      label: "Contact" },
];

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={onClose} />

      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[85vw] max-w-sm z-50 animate-slide-in-right border-l border-white/[0.06]"
        style={{ background: "linear-gradient(180deg, #1c1c20 0%, #17171a 100%)" }}
      >
        {/* hairline olive en haut */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.5) 50%, transparent 100%)" }} />

        <div className="flex items-center justify-between px-6 pt-6 pb-5">
          <Logo size={22} color="text-neutral-light" />
          <button onClick={onClose} className="text-neutral-400 hover:text-[#A9B57E] transition-colors p-1.5 rounded-lg hover:bg-white/5">
            <X size={20} />
          </button>
        </div>

        {/* méta-strip */}
        <div className="px-6 mb-8 meta-mono text-[10px] tracking-[0.22em] uppercase text-neutral-light/45 flex items-baseline gap-3">
          <span className="meta-led" />
          <span>§ Menu — Atlas Studio</span>
        </div>

        <nav className="px-6 flex flex-col">
          {links.map((l, i) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={onClose}
              className="group flex items-baseline gap-4 py-4 border-t border-white/[0.06] last:border-b text-neutral-light/85 hover:text-[#A9B57E] transition-colors"
            >
              <span className="meta-mono text-[10px] tabular-nums tracking-[0.2em] text-[#A9B57E]/70 group-hover:text-[#A9B57E] transition-colors">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="font-display text-[20px] font-medium tracking-tight">
                {l.label}
              </span>
              <span className="ml-auto meta-mono text-[#A9B57E]/0 group-hover:text-[#A9B57E]/80 transition-colors text-[14px]">
                →
              </span>
            </Link>
          ))}
        </nav>

        <div className="px-6 mt-10">
          <Link to="/portal" onClick={onClose} className="cta-arrow cta-arrow--primary w-full justify-between !flex">
            Espace Client
          </Link>
        </div>
      </div>
    </>
  );
}
