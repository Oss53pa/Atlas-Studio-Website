import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Repeat, Receipt,
  ClipboardList, MessageSquare, Mail, BarChart3, ArrowLeft, LogOut,
  CreditCard, Megaphone, Layers, Search, Brain, Activity, Sun, Moon, Menu, Flag, Bell, Tag, Rocket, BookOpen, KeyRound, Settings, ShieldCheck, Send, ListChecks, Database, AlertTriangle,
  Crown, Home, Package, Wrench,
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
  { to: "/admin/clients", icon: Users, label: "Clients" },
  { to: "/admin/invoices", icon: Receipt, label: "Facturation" },
];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Vue d'ensemble",
    icon: Home,
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
      { to: "/admin/stats", icon: BarChart3, label: "Statistiques" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analytics" },
    ],
  },
  {
    id: "catalog",
    label: "Catalogue",
    icon: Package,
    items: [
      { to: "/admin/apps", icon: Layers, label: "Applications" },
      { to: "/admin/plans", icon: Layers, label: "Plans & Tarifs" },
      { to: "/admin/promo-codes", icon: Tag, label: "Codes Promo" },
      { to: "/admin/landing-pages", icon: FileText, label: "Landing Pages" },
    ],
  },
  {
    id: "clients",
    label: "Clients & Comptes",
    icon: Users,
    items: [
      { to: "/admin/clients", icon: Users, label: "Clients" },
      { to: "/admin/subscriptions", icon: Repeat, label: "Abonnements" },
      { to: "/admin/licences", icon: KeyRound, label: "Licences" },
      { to: "/admin/roles", icon: ShieldCheck, label: "Rôles" },
    ],
  },
  {
    id: "billing",
    label: "Facturation",
    icon: CreditCard,
    items: [
      { to: "/admin/invoices", icon: Receipt, label: "Factures" },
      { to: "/admin/payments", icon: CreditCard, label: "Paiements" },
    ],
  },
  {
    id: "communication",
    label: "Communication",
    icon: Mail,
    items: [
      { to: "/admin/content", icon: FileText, label: "Site Atlas Studio" },
      { to: "/admin/newsletter", icon: Mail, label: "Newsletter" },
      { to: "/admin/campaigns", icon: Send, label: "Campagnes" },
      { to: "/admin/emails", icon: Megaphone, label: "Templates Email" },
      { to: "/admin/tickets", icon: MessageSquare, label: "Support" },
    ],
  },
  {
    id: "ai",
    label: "Proph3t IA",
    icon: Brain,
    items: [
      { to: "/admin/proph3t", icon: Brain, label: "Console Proph3t" },
      { to: "/admin/proph3t-memory", icon: Database, label: "Mémoires" },
      { to: "/admin/proph3t-plans", icon: ListChecks, label: "Plans d'action" },
      { to: "/admin/proph3t-knowledge", icon: BookOpen, label: "Base RAG" },
    ],
  },
  {
    id: "system",
    label: "Système",
    icon: Wrench,
    items: [
      { to: "/admin/system", icon: Activity, label: "Santé système" },
      { to: "/admin/alerts", icon: Bell, label: "Alertes" },
      { to: "/admin/error-monitor", icon: AlertTriangle, label: "Error Monitor" },
      { to: "/admin/feature-flags", icon: Flag, label: "Feature Flags" },
      { to: "/admin/deployments", icon: Rocket, label: "Déploiements" },
      { to: "/admin/activity", icon: ClipboardList, label: "Logs & Audit" },
      { to: "/admin/knowledge-base", icon: BookOpen, label: "Base de connaissances" },
      { to: "/admin/settings", icon: Settings, label: "Paramètres" },
    ],
  },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isSuperAdmin } = useAuth();
  const { selectedApp, setSelectedApp } = useAppFilter();
  const { toggleTheme, isDark } = useTheme();
  const { appList } = useAppCatalog();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Active section derived from URL (auto-tracks navigation), but
  // can be overriden by user click on a primary icon.
  const sectionFromUrl = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.items.some(it => location.pathname === it.to || (it.to !== "/admin" && location.pathname.startsWith(it.to + "/")))) {
        return g.id;
      }
      if (location.pathname === "/admin" && g.id === "overview") return g.id;
    }
    return "overview";
  }, [location.pathname]);

  const [activeSection, setActiveSection] = useState<string>(sectionFromUrl);

  // Sync activeSection when URL changes (unless user just manually clicked a primary icon)
  useEffect(() => {
    setActiveSection(sectionFromUrl);
  }, [sectionFromUrl]);

  const activeGroup = NAV_GROUPS.find(g => g.id === activeSection) ?? NAV_GROUPS[0];

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname === to || location.pathname.startsWith(to + "/");

  // ─── PRIMARY RAIL (icon-only column, w-16) ────────────────────────────
  const primaryRail = (
    <div className="w-16 min-h-screen bg-onyx border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Logo */}
      <Link to="/" className="h-14 flex items-center justify-center border-b border-white/5">
        <Logo size={18} color="text-neutral-light" />
      </Link>

      {/* Notification + theme toggle row */}
      <div className="flex items-center justify-center py-2 border-b border-white/5">
        <NotificationCenter />
      </div>

      {/* Pinned icons */}
      <div className="py-2 flex flex-col items-center gap-1">
        {PINNED.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              title={item.label}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                active
                  ? "bg-admin-accent/20 text-admin-accent"
                  : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
              }`}
            >
              <item.icon size={16} strokeWidth={1.75} />
            </Link>
          );
        })}
      </div>

      <div className="h-px bg-white/10 mx-3 my-1" />

      {/* Section icons */}
      <nav className="flex-1 py-2 flex flex-col items-center gap-1 overflow-y-auto scrollbar-thin">
        {NAV_GROUPS.map(group => {
          const active = activeSection === group.id;
          const hasActiveItem = group.items.some(it => isActive(it.to));
          return (
            <button
              key={group.id}
              onClick={() => setActiveSection(group.id)}
              title={group.label}
              className={`relative w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                active || hasActiveItem
                  ? "bg-admin-accent/15 text-admin-accent"
                  : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
              }`}
            >
              <group.icon size={17} strokeWidth={1.75} />
              {hasActiveItem && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-admin-accent rounded-r" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: theme + avatar + logout */}
      <div className="border-t border-white/5 py-2 flex flex-col items-center gap-1">
        <button
          onClick={toggleTheme}
          title={isDark ? "Mode clair" : "Mode sombre"}
          className="w-10 h-10 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-white/5 hover:text-neutral-300 transition-all"
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <div
          title={`${profile?.full_name || "Admin"} • ${isSuperAdmin ? "Super Admin" : "Admin"}`}
          className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold ${
            isSuperAdmin ? "bg-purple-500 text-white" : "bg-admin-accent text-onyx"
          }`}
        >
          {(profile?.full_name || "A").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          title="Déconnexion"
          className="w-10 h-10 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-white/5 hover:text-red-400 transition-all"
        >
          <LogOut size={14} />
        </button>
      </div>
    </div>
  );

  // ─── SECONDARY PANEL (active section's items, w-56) ───────────────────
  const secondaryPanel = (
    <div className="w-56 min-h-screen bg-onyx/95 border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Header: section name */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <activeGroup.icon size={14} className="text-admin-accent" strokeWidth={1.75} />
          <span className="text-neutral-light text-[12px] font-semibold tracking-wide">{activeGroup.label}</span>
        </div>
        <span className="text-admin-accent text-[8px] font-bold uppercase tracking-widest">Admin</span>
      </div>

      {/* Search + app filter */}
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-white/5">
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}
          className="w-full px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-md flex items-center gap-2 text-neutral-500 text-[11px] hover:border-gold/30 hover:text-neutral-400 transition-colors"
        >
          <Search size={11} />
          <span className="flex-1 text-left">Rechercher...</span>
          <kbd className="text-[9px] font-mono bg-white/5 px-1 py-0.5 rounded">⌘K</kbd>
        </button>
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

      {/* Items list */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-thin">
        <div className="space-y-0.5">
          {activeGroup.items.map(item => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[12px] transition-all ${
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
      </nav>

      {/* Footer: super admin link + back to site */}
      <div className="border-t border-white/5 px-2 py-2 space-y-0.5">
        {isSuperAdmin && (
          <Link
            to="/admin/admins"
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] transition-all ${
              isActive("/admin/admins")
                ? "bg-purple-500/15 text-purple-400 font-medium"
                : "text-neutral-500 hover:text-purple-400 hover:bg-white/5"
            }`}
          >
            <Crown size={12} />
            Gérer les Admins
          </Link>
        )}
        <Link
          to="/"
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={12} />
          Retour au site
        </Link>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex">
      {primaryRail}
      {secondaryPanel}
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
