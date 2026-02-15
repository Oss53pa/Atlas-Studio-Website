import { Link } from "react-router-dom";
import { Zap, ShoppingCart, CreditCard, Settings, type LucideIcon } from "lucide-react";
import { Logo } from "../components/ui/Logo";
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
  { id: "billing", icon: CreditCard, label: "Facturation" },
  { id: "settings", icon: Settings, label: "Paramètres" },
];

export function Sidebar({ page, setPage, profile, onLogout }: SidebarProps) {
  const displayName = profile?.full_name || "Utilisateur";
  const companyName = profile?.company_name || "";
  const initials = displayName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="w-64 min-h-screen bg-onyx border-r border-white/10 p-6 flex flex-col flex-shrink-0">
      <div className="flex items-center gap-2.5 px-2 mb-8">
        <Link to="/">
          <Logo size={22} color="text-neutral-light" />
        </Link>
      </div>

      <nav className="flex-1">
        {nav.map(n => (
          <div
            key={n.id}
            onClick={() => setPage(n.id)}
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
          <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center text-onyx text-[12px] font-bold">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-light text-[13px] font-medium truncate">{displayName}</div>
            {companyName && <div className="text-neutral-500 text-[11px]">{companyName}</div>}
          </div>
        </div>
        <div
          onClick={onLogout}
          className="mt-3 px-3 py-2 rounded-lg cursor-pointer text-neutral-500 text-[13px] text-center hover:text-red-400 hover:bg-white/5 transition-all duration-200"
        >
          Déconnexion
        </div>
      </div>
    </div>
  );
}
