import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import { Logo } from "../ui/Logo";
import { MobileMenu } from "./MobileMenu";

const links = [
  { to: "/applications", label: "Applications" },
  { to: "/tarifs", label: "Tarifs" },
  { to: "/a-propos", label: "À propos" },
  { to: "/faq", label: "FAQ" },
  { to: "/contact", label: "Contact" },
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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-onyx/95 backdrop-blur-xl border-b border-white/10"
            : "bg-onyx"
        }`}
      >
        <div className="max-w-site mx-auto px-5 md:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <Logo size={24} color="text-neutral-light" />
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`nav-link ${
                  location.pathname === l.to ? "!text-gold after:!scale-x-100" : ""
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/portal"
              className="hidden lg:inline-flex btn-gold !px-5 !py-2.5 !text-[13px]"
            >
              Espace Client
            </Link>

            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden text-neutral-300 hover:text-neutral-light transition-colors p-1.5"
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
