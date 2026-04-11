import { useState } from "react";
import { Link } from "react-router-dom";
import { Zap, ShoppingCart, CreditCard, Settings, LifeBuoy, Users, KeyRound, Menu, X, type LucideIcon } from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { NotificationBell } from "../components/ui/NotificationBell";
import type { Profile } from "../lib/database.types";

interface SidebarProps {
  page: string;
  setPage: (p: string) => void;
  profile: Profile | null;
  onLogout: () => void;
}

const nav: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "apps", icon: Zap, label: "Mes Applications" },
  { id: "catalog", icon: ShoppingCart, label: "Catalogue" },
  { id: "team", icon: Users, label: "Licences & Équipe" },
  { id: "billing", icon: CreditCard, label: "Facturation" },
  { id: "support", icon: LifeBuoy, label: "Support" },
  { id: "activate", icon: KeyRound, label: "Activer une licence" },
  { id: "settings", icon: Settings, label: "Paramètres" },
];

export function Sidebar({ page, setPage, profile, onLogout }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = profile?.full_name || "Utilisateur";
  const companyName = profile?.company_name || "";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleNavClick = (id: string) => {
    setPage(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-2 mb-8">
        <Link to="/">
          <Logo size={22} color="text-neutral-light" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell userId={profile?.id} />
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-neutral-400 hover:text-neutral-light p-1"
            aria-label="Fermer le menu"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {nav.map(n => (
          <div
            key={n.id}
            onClick={() => handleNavClick(n.id)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-all duration-200 ${
              page === n.id
                ? "bg-white/10 text-gold"
                : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
            }`}
          >
            <n.icon size={16} strokeWidth={1.5} />
            <span className={`text-sm ${page === n.id ? "font-semibold" : "font-normal"}`}>
              {n.label}
            </span>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-onyx text-[12px] font-bold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-light text-[13px] font-medium truncate">{displayName}</div>
            {companyName && <div className="text-neutral-500 text-[11px] truncate">{companyName}</div>}
          </div>
        </div>
        <div
          onClick={onLogout}
          className="mt-3 px-3 py-2 rounded-lg cursor-pointer text-neutral-500 text-[13px] text-center hover:text-red-400 hover:bg-white/5 transition-all duration-200"
        >
          Déconnexion
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-onyx border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <Link to="/">
          <Logo size={20} color="text-neutral-light" />
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell userId={profile?.id} />
          <button
            onClick={() => setMobileOpen(true)}
            className="text-neutral-light p-1.5 rounded-lg hover:bg-white/5"
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar (desktop static + mobile drawer) */}
      <div
        className={`fixed lg:sticky top-0 left-0 z-50 w-64 h-screen bg-onyx border-r border-white/10 p-6 flex flex-col flex-shrink-0 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {sidebarContent}
      </div>
    </>
  );
}
