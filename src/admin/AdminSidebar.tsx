import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Repeat, Receipt,
  ClipboardList, MessageSquare, Mail, BarChart3, ArrowLeft, LogOut,
  CreditCard, Megaphone, Layers, Search, Brain, Activity, Sun, Moon, Menu, Flag, Bell, Tag, Rocket, BookOpen, KeyRound, Settings, ShieldCheck, Send, ListChecks, Database, AlertTriangle,
  ChevronDown, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { Logo } from "../components/ui/Logo";
import { useAuth } from "../lib/auth";
import { useAppFilter } from "./contexts/AppFilterContext";
import { useTheme } from "./contexts/ThemeContext";
import { useAppCatalog } from "../hooks/useAppCatalog";
import { NotificationCenter } from "./components/NotificationCenter";

interface NavItem { to: string; icon: LucideIcon; label: string; }
interface NavGroup { id: string; label: string; icon: LucideIcon; items: NavItem[]; }

const PINNED: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/proph3t", icon: Brain, label: "Proph3t IA" },
  { to: "/admin/clients", icon: Users, label: "Utilisateurs" },
  { to: "/admin/invoices", icon: Receipt, label: "Facturation" },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "clients",
    label: "Clients & Comptes",
    icon: Users,
    items: [
      { to: "/admin/clients", icon: Users, label: "Utilisateurs" },
      { to: "/admin/subscriptions", icon: Repeat, label: "Abonnements" },
      { to: "/admin/licences", icon: KeyRound, label: "Licences" },
      { to: "/admin/tickets", icon: MessageSquare, label: "Support" },
    ],
  },
  {
    id: "revenue",
    label: "Revenus",
    icon: CreditCard,
    items: [
      { to: "/admin/invoices", icon: Receipt, label: "Facturation" },
      { to: "/admin/payments", icon: CreditCard, label: "Paiements" },
      { to: "/admin/plans", icon: Layers, label: "Plans & Tarifs" },
      { to: "/admin/apps", icon: CreditCard, label: "Apps" },
      { to: "/admin/promo-codes", icon: Tag, label: "Codes Promo" },
    ],
  },
  {
    id: "content",
    label: "Contenu & Marketing",
    icon: FileText,
    items: [
      { to: "/admin/content", icon: FileText, label: "Site Atlas Studio" },
      { to: "/admin/landing-pages", icon: Layers, label: "Landing Pages Apps" },
      { to: "/admin/newsletter", icon: Mail, label: "Newsletter" },
      { to: "/admin/campaigns", icon: Send, label: "Campagnes" },
      { to: "/admin/emails", icon: Megaphone, label: "Templates Email" },
      { to: "/admin/knowledge-base", icon: BookOpen, label: "Base de connaissances" },
    ],
  },
  {
    id: "ai",
    label: "Proph3t IA",
    icon: Brain,
    items: [
      { to: "/admin/proph3t", icon: Brain, label: "Console Proph3t" },
      { to: "/admin/proph3t-memory", icon: Brain, label: "Mémoires" },
      { to: "/admin/proph3t-plans", icon: ListChecks, label: "Plans d'action" },
      { to: "/admin/proph3t-knowledge", icon: Database, label: "Base RAG" },
    ],
  },
  {
    id: "ops",
    label: "Plateforme & Ops",
    icon: Activity,
    items: [
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
      { to: "/admin/system", icon: Activity, label: "Santé système" },
      { to: "/admin/alerts", icon: Bell, label: "Alertes" },
      { to: "/admin/error-monitor", icon: AlertTriangle, label: "Error Monitor" },
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
  const { toggleTheme, isDark } = useTheme();
  const { appList } = useAppCatalog();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist open groups across navigation
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem("atlas_sidebar_open_groups");
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { clients: true, revenue: false, content: false, ai: false, ops: false };
  });

  useEffect(() => {
    try { localStorage.setItem("atlas_sidebar_open_groups", JSON.stringify(openGroups)); } catch { /* ignore */ }
  }, [openGroups]);

  // Auto-open the group containing the current page
  useEffect(() => {
    for (const group of NAV_GROUPS) {
      if (group.items.some(item => location.pathname.startsWith(item.to))) {
        setOpenGroups(prev => (prev[group.id] ? prev : { ...prev, [group.id]: true }));
        break;
      }
    }
  }, [location.pathname]);

  const toggleGroup = (id: string) => setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(to);

  const sidebarContent = (
    <div className="w-60 min-h-screen bg-onyx border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <Link to="/"><Logo size={20} color="text-neutral-light" /></Link>
          <NotificationCenter />
        </div>
        <div className="text-admin-accent text-[9px] font-bold uppercase tracking-widest mt-1">Admin</div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center gap-2 text-neutral-500 text-[11px] hover:border-gold/30 hover:text-neutral-400 transition-colors"
        >
          <Search size={11} />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="text-[9px] font-mono bg-white/5 px-1 py-0.5 rounded">⌘K</kbd>
        </button>
      </div>

      {/* App filter */}
      <div className="px-3 pb-3">
        <select
          value={selectedApp}
          onChange={e => setSelectedApp(e.target.value)}
          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md text-[11px] text-neutral-light outline-none focus:border-gold/50 appearance-none cursor-pointer"
        >
          <option value="all" className="bg-onyx">Toutes les apps</option>
          {appList.map(app => (
            <option key={app.id} value={app.id} className="bg-onyx">{app.name}</option>
          ))}
        </select>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {/* Pinned items */}
        <div className="mb-2">
          <div className="px-2 mb-1 text-[9px] font-bold uppercase tracking-widest text-neutral-600">Épinglés</div>
          <div className="space-y-0.5">
            {PINNED.map(item => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-all ${
                    active
                      ? "bg-admin-accent/15 text-admin-accent font-medium"
                      : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
                  }`}
                >
                  <item.icon size={14} strokeWidth={1.5} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="h-px bg-white/5 my-2" />

        {/* Collapsible groups */}
        {NAV_GROUPS.map(group => {
          const isOpen = openGroups[group.id];
          const hasActive = group.items.some(item => isActive(item.to));
          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                  hasActive ? "text-admin-accent" : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <group.icon size={12} strokeWidth={2} />
                <span className="flex-1 text-left">{group.label}</span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5 pl-2">
                  {group.items.map(item => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-all ${
                          active
                            ? "bg-admin-accent/15 text-admin-accent font-medium"
                            : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
                        }`}
                      >
                        <item.icon size={13} strokeWidth={1.5} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-2.5 space-y-1">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          {isDark ? <Sun size={12} /> : <Moon size={12} />}
          {isDark ? "Mode clair" : "Mode sombre"}
        </button>

        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-admin-accent flex items-center justify-center text-onyx text-[10px] font-bold">
            {(profile?.full_name || "A").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-light text-[11px] font-medium truncate">{profile?.full_name || "Admin"}</div>
            <div className="text-admin-accent text-[9px]">Super Admin</div>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={12} />
          Retour au site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-red-400 hover:bg-white/5 transition-all"
        >
          <LogOut size={12} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden w-10 h-10 rounded-lg bg-onyx border border-white/10 flex items-center justify-center text-neutral-400"
      >
        <Menu size={20} />
      </button>

      <div className="hidden md:block">{sidebarContent}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="relative">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
