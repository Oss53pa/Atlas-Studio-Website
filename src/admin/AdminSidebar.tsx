import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Repeat, Receipt,
  ClipboardList, MessageSquare, Mail, BarChart3, ArrowLeft, LogOut,
  CreditCard, Megaphone, Layers, Search, Brain, Activity, Sun, Moon, Menu, Flag, Bell, Tag, Rocket, BookOpen, KeyRound, Settings, ShieldCheck, Send, ListChecks, Database, AlertTriangle,
  ChevronDown, ChevronRight, Crown, Home, Package, Wrench, PanelLeftClose, PanelLeftOpen,
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

const RECENT_KEY = "atlas_admin_recent_pages";
const SECONDARY_OPEN_KEY = "atlas_admin_secondary_open";
const EXPANDED_GROUPS_KEY = "atlas_admin_expanded_groups";

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isSuperAdmin } = useAuth();
  const { selectedApp, setSelectedApp } = useAppFilter();
  const { toggleTheme, isDark } = useTheme();
  const { appList } = useAppCatalog();
  const [mobileOpen, setMobileOpen] = useState(false);

  // ─── Secondary panel retract state ──────────────────────────────────────
  const [secondaryOpen, setSecondaryOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(SECONDARY_OPEN_KEY);
      return saved === null ? true : saved === "true";
    } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem(SECONDARY_OPEN_KEY, String(secondaryOpen)); } catch { /* ignore */ }
  }, [secondaryOpen]);

  // ─── Expanded groups (tree) ─────────────────────────────────────────────
  const sectionFromUrl = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.items.some(it => location.pathname === it.to || (it.to !== "/admin" && location.pathname.startsWith(it.to + "/")))) {
        return g.id;
      }
    }
    if (location.pathname === "/admin") return "overview";
    return null;
  }, [location.pathname]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(EXPANDED_GROUPS_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return { overview: true };
  });

  useEffect(() => {
    try { localStorage.setItem(EXPANDED_GROUPS_KEY, JSON.stringify(expandedGroups)); } catch { /* ignore */ }
  }, [expandedGroups]);

  // Auto-expand the group containing the current page
  useEffect(() => {
    if (sectionFromUrl) {
      setExpandedGroups(prev => prev[sectionFromUrl] ? prev : { ...prev, [sectionFromUrl]: true });
    }
  }, [sectionFromUrl]);

  const toggleGroup = (id: string) => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Recent pages tracking ──────────────────────────────────────────────
  const allItems = useMemo(() => {
    const map: Record<string, NavItem> = {};
    for (const g of NAV_GROUPS) for (const it of g.items) map[it.to] = it;
    return map;
  }, []);

  const [recentPaths, setRecentPaths] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
    catch { return []; }
  });

  useEffect(() => {
    if (allItems[location.pathname]) {
      setRecentPaths(prev => {
        const next = [location.pathname, ...prev.filter(p => p !== location.pathname)].slice(0, 5);
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
        return next;
      });
    }
  }, [location.pathname, allItems]);

  const recentItems = recentPaths.map(p => allItems[p]).filter(Boolean);

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname === to || location.pathname.startsWith(to + "/");

  // ─── PRIMARY SIDEBAR (tree navigation, w-60) ───────────────────────────
  const primarySidebar = (
    <div className="w-60 min-h-screen bg-onyx border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={18} color="text-neutral-light" />
            <span className="text-neutral-light text-[13px] font-semibold">Menu</span>
          </Link>
          <NotificationCenter />
        </div>
        <div className="text-admin-accent text-[9px] font-bold uppercase tracking-widest mt-1">Admin Console</div>
      </div>

      {/* Navigation tree */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        {NAV_GROUPS.map(group => {
          const isExpanded = !!expandedGroups[group.id];
          const isCurrentSection = sectionFromUrl === group.id;
          return (
            <div key={group.id} className="mb-1">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] transition-all ${
                  isCurrentSection
                    ? "bg-onyx-light text-neutral-light font-semibold ring-1 ring-white/10"
                    : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
                }`}
              >
                <group.icon size={15} strokeWidth={1.75} />
                <span className="flex-1 text-left">{group.label}</span>
                {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {/* Sub-items (tree style with vertical guide line) */}
              {isExpanded && (
                <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5">
                  {group.items.map(item => {
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-all ${
                          active
                            ? "bg-white/10 text-neutral-light font-medium"
                            : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
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

      {/* Footer: theme + retract */}
      <div className="border-t border-white/5 px-2 py-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          {isDark ? <Sun size={13} /> : <Moon size={13} />}
          {isDark ? "Mode clair" : "Mode sombre"}
        </button>
        <button
          onClick={() => setSecondaryOpen(v => !v)}
          className="hidden md:flex w-full items-center gap-2 px-3 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-neutral-300 hover:bg-white/5 transition-all"
        >
          {secondaryOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
          {secondaryOpen ? "Réduire panneau" : "Afficher panneau"}
        </button>
      </div>
    </div>
  );

  // ─── SECONDARY SIDEBAR (extras: search, pinned, recent, w-56) ──────────
  const secondarySidebar = (
    <div className="w-56 min-h-screen bg-onyx/95 border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Search + app filter */}
      <div className="px-3 pt-4 pb-3 border-b border-white/5 space-y-2">
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

      {/* Pinned + Recent */}
      <div className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin space-y-4">
        {/* Épinglés */}
        <div>
          <div className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-600">Épinglés</div>
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
                  <item.icon size={13} strokeWidth={1.5} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent */}
        {recentItems.length > 0 && (
          <div>
            <div className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-600">
              Récents ({recentItems.length})
            </div>
            <div className="space-y-0.5">
              {recentItems.map(item => {
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[12px] transition-all ${
                      active
                        ? "bg-white/10 text-neutral-light font-medium"
                        : "text-neutral-500 hover:bg-white/5 hover:text-neutral-300"
                    }`}
                  >
                    <item.icon size={13} strokeWidth={1.5} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer: super admin + back to site + user + logout */}
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

        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${isSuperAdmin ? "bg-purple-500 text-white" : "bg-admin-accent text-onyx"}`}>
            {(profile?.full_name || "A").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-neutral-light text-[11px] font-medium truncate">{profile?.full_name || "Admin"}</div>
            <div className={`text-[9px] flex items-center gap-1 ${isSuperAdmin ? "text-purple-400" : "text-admin-accent"}`}>
              {isSuperAdmin && <Crown size={9} />}
              {isSuperAdmin ? "Super Admin" : "Admin"}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-neutral-500 text-[11px] hover:text-red-400 hover:bg-white/5 transition-all"
        >
          <LogOut size={12} />
          Déconnexion
        </button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex">
      {primarySidebar}
      {secondaryOpen && secondarySidebar}
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
