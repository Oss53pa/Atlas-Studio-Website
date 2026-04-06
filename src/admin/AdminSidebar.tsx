import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Repeat, Receipt,
  ClipboardList, MessageSquare, Mail, BarChart3, ArrowLeft, LogOut,
  CreditCard, Megaphone, Layers, Search, Brain, Activity, Sun, Moon, Menu, X, Flag, Bell, Tag, Rocket, BookOpen, KeyRound, Settings, ShieldCheck, Send, ListChecks, Database,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../lib/auth";
import { useAppFilter } from "./contexts/AppFilterContext";
import { useTheme } from "./contexts/ThemeContext";
import { useAppCatalog } from "../hooks/useAppCatalog";
import { NotificationCenter } from "./components/NotificationCenter";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/proph3t", icon: Brain, label: "Proph3t IA" },
      { to: "/admin/proph3t-memory", icon: Brain, label: "Mémoires IA" },
      { to: "/admin/proph3t-plans", icon: ListChecks, label: "Plans d'action" },
      { to: "/admin/proph3t-knowledge", icon: Database, label: "Base RAG" },
    ],
  },
  {
    label: "Clients & Comptes",
    items: [
      { to: "/admin/clients", icon: Users, label: "Utilisateurs" },
      { to: "/admin/subscriptions", icon: Repeat, label: "Abonnements" },
      { to: "/admin/licences", icon: KeyRound, label: "Licences" },
      { to: "/admin/tickets", icon: MessageSquare, label: "Support Client" },
    ],
  },
  {
    label: "Revenus & Facturation",
    items: [
      { to: "/admin/invoices", icon: Receipt, label: "Facturation" },
      { to: "/admin/payments", icon: CreditCard, label: "Paiements" },
      { to: "/admin/payments", icon: CreditCard, label: "Paiements" },
      { to: "/admin/plans", icon: Layers, label: "Plans & Tarifs" },
      { to: "/admin/apps", icon: CreditCard, label: "Grille Tarifaire" },
      { to: "/admin/promo-codes", icon: Tag, label: "Codes Promo" },
    ],
  },
  {
    label: "Contenu & Marketing",
    items: [
      { to: "/admin/content", icon: FileText, label: "Landing Page" },
      { to: "/admin/newsletter", icon: Mail, label: "Newsletter" },
      { to: "/admin/campaigns", icon: Send, label: "Campagnes" },
      { to: "/admin/emails", icon: Megaphone, label: "Templates Email" },
      { to: "/admin/knowledge-base", icon: BookOpen, label: "Base de connaissances" },
    ],
  },
  {
    label: "Plateforme & Ops",
    items: [
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/admin/system", icon: Activity, label: "Santé système" },
      { to: "/admin/alerts", icon: Bell, label: "Alertes" },
      { to: "/admin/feature-flags", icon: Flag, label: "Feature Flags" },
      { to: "/admin/deployments", icon: Rocket, label: "Déploiements" },
      { to: "/admin/roles", icon: ShieldCheck, label: "Rôles & Permissions" },
      { to: "/admin/activity", icon: ClipboardList, label: "Logs & Audit" },
      { to: "/admin/settings", icon: Settings, label: "Paramètres" },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const { selectedApp, setSelectedApp } = useAppFilter();
  const { theme, toggleTheme, isDark } = useTheme();
  const { appList } = useAppCatalog();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  // Close mobile sidebar on navigation
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (to: string) =>
    to === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(to);

  const sidebarContent = (
    <div className="w-64 min-h-screen bg-onyx border-r border-white/10 p-6 flex flex-col flex-shrink-0">
      <div className="px-2 mb-6">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo size={22} color="text-neutral-light" /></Link>
          <NotificationCenter />
        </div>
        <div className="text-admin-accent text-[10px] font-bold uppercase tracking-widest mt-1.5">Administration</div>
      </div>

      {/* Quick search hint */}
      <button onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
        className="w-full mb-4 px-3 py-2 bg-white/5 border border-white/10 rounded-lg flex items-center gap-2 text-neutral-500 text-[12px] hover:border-gold/30 hover:text-neutral-400 transition-colors">
        <Search size={13} />
        <span className="flex-1 text-left">Rechercher...</span>
        <kbd className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">⌘K</kbd>
      </button>

      {/* App selector */}
      <div className="mb-6 px-1">
        <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-2 px-2">Application</div>
        <div className="relative">
          <Layers size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-accent pointer-events-none" />
          <select
            value={selectedApp}
            onChange={e => setSelectedApp(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-[13px] text-neutral-light outline-none focus:border-gold/50 transition-colors appearance-none cursor-pointer"
          >
            <option value="all" className="bg-onyx">Toutes les apps</option>
            {appList.map(app => (
              <option key={app.id} value={app.id} className="bg-onyx">{app.name}</option>
            ))}
          </select>
        </div>
        {selectedApp !== "all" && (
          <button onClick={() => setSelectedApp("all")} className="text-[11px] text-neutral-500 hover:text-admin-accent mt-1.5 px-2 transition-colors">
            ← Revenir à la vue consolidée
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-5" : ""}>
            {group.label && (
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-neutral-600">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(n => {
                const active = isActive(n.to);
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      active
                        ? "bg-white/10 text-admin-accent"
                        : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
                    }`}
                  >
                    <n.icon size={16} strokeWidth={1.5} />
                    <span className={`text-sm ${active ? "font-semibold" : "font-normal"}`}>
                      {n.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 pt-4 space-y-2">
        {/* Theme toggle */}
        <button onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-neutral-500 text-[13px] hover:text-neutral-300 hover:bg-white/5 transition-all">
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
          {isDark ? "Mode clair" : "Mode sombre"}
        </button>

        <div className="flex items-center gap-2.5 px-2">
          <div className="w-8 h-8 rounded-full bg-admin-accent flex items-center justify-center text-onyx text-[12px] font-bold">
            {(profile?.full_name || "A").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-light text-[13px] font-medium truncate">{profile?.full_name || "Admin"}</div>
            <div className="text-admin-accent text-[11px]">Super Admin</div>
          </div>
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-500 text-[13px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={14} />
          Retour au site
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-neutral-500 text-[13px] hover:text-red-400 hover:bg-white/5 transition-all w-full"
        >
          <LogOut size={14} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-onyx border border-white/10 flex items-center justify-center text-neutral-400">
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:block">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
