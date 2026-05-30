import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Logo } from "../ui/Logo";
import { LanguageToggle } from "../ui/LanguageToggle";
import { MobileMenu } from "./MobileMenu";

const links = [
  { to: "/applications", label: "Applications" },
  { to: "/tarifs",       label: "Tarifs" },
  { to: "/blog",         label: "Blog" },
  { to: "/a-propos",     label: "À propos" },
  { to: "/faq",          label: "FAQ" },
  { to: "/contact",      label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-onyx/80 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        {/* hairline olive au scroll */}
        <div
          className={`absolute top-0 left-0 right-0 h-px transition-opacity duration-500 ${scrolled ? "opacity-100" : "opacity-0"}`}
          style={{ background: "linear-gradient(90deg, transparent 0%, rgba(169,181,126,0.45) 50%, transparent 100%)" }}
        />

        <div className="max-w-[1280px] mx-auto px-5 md:px-10 lg:px-16 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0 group inline-flex items-baseline gap-3">
            <Logo size={24} color="text-neutral-light group-hover:text-[#A9B57E] transition-colors duration-300" />
          </Link>

          {/* nav editoriale — mono uppercase tracked */}
          <div className="hidden lg:flex items-baseline gap-7">
            {links.map((l, i) => {
              const active = location.pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  className={`group inline-flex items-baseline gap-2 meta-mono text-[11px] tracking-[0.18em] uppercase transition-colors ${
                    active ? "text-[#A9B57E]" : "text-neutral-light/65 hover:text-neutral-light"
                  }`}
                >
                  <span className={`tabular-nums text-[9px] ${active ? "opacity-100" : "opacity-40 group-hover:opacity-70"} transition-opacity`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{l.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-4">
            <LanguageToggle />
            <Link to="/portal" className="hidden lg:inline-flex cta-arrow cta-arrow--primary !text-[12px] !py-2 !px-4">
              Espace Client
            </Link>

            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-neutral-300 hover:text-[#A9B57E] transition-colors p-2 rounded-lg hover:bg-white/5"
              aria-label="Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      <MobileMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
