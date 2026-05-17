import { useState, useEffect, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, FileText, Users, Repeat, Receipt,
  ClipboardList, MessageSquare, Mail, BarChart3, ArrowLeft, LogOut,
  CreditCard, Megaphone, Layers, Search, Brain, Activity, Sun, Moon, Menu, Flag, Bell, Tag, Rocket, BookOpen, KeyRound, Settings, ShieldCheck, Send, ListChecks, Database, AlertTriangle,
  Crown, Home, Package, Wrench, PanelLeftClose, PanelLeftOpen,
  Bot, Inbox, ScrollText, Power, SlidersHorizontal, LifeBuoy, UserCheck, Calendar, Target, Wallet,
  Workflow, Shield, Plug, History, CheckSquare, Files,
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
    id: "asvc",
    label: "ASVC — Virtual Company",
    icon: Bot,
    items: [
      { to: "/admin/asvc", icon: Inbox, label: "Brief & Inbox" },
      { to: "/admin/asvc/arbitrations", icon: ListChecks, label: "Arbitrages" },
      { to: "/admin/asvc/pipeline", icon: Workflow, label: "Pipeline Produit" },
      { to: "/admin/asvc/agents", icon: Bot, label: "Agents" },
      { to: "/admin/asvc/tickets", icon: LifeBuoy, label: "Tickets SAV" },
      { to: "/admin/asvc/customers", icon: UserCheck, label: "Customer Lifecycle" },
      { to: "/admin/asvc/content", icon: Calendar, label: "Content Calendar" },
      { to: "/admin/asvc/leads", icon: Target, label: "Pipeline Ventes" },
      { to: "/admin/asvc/finance", icon: Wallet, label: "Finance" },
      { to: "/admin/asvc/health", icon: Shield, label: "Health & Audit" },
      { to: "/admin/asvc/tests", icon: CheckSquare, label: "Tests Readiness" },
      { to: "/admin/asvc/tech-debt", icon: Wrench, label: "Tech Debt" },
      { to: "/admin/asvc/briefs", icon: History, label: "Historique briefs" },
      { to: "/admin/asvc/connectors", icon: Plug, label: "Connecteurs" },
      { to: "/admin/asvc/templates", icon: Files, label: "Templates" },
      { to: "/admin/asvc/settings", icon: Settings, label: "Préférences CEO" },
      { to: "/admin/asvc/agent-prompts", icon: BookOpen, label: "System prompts" },
      { to: "/admin/asvc/actions", icon: ScrollText, label: "Journal actions" },
      { to: "/admin/asvc/kill-switch", icon: Power, label: "Kill Switch" },
      { to: "/admin/asvc/config", icon: SlidersHorizontal, label: "Configuration" },
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

const SECONDARY_OPEN_KEY = "atlas_admin_secondary_open";

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

  // ─── Active section: derived from URL, can be overriden by user click
  const sectionFromUrl = useMemo(() => {
    for (const g of NAV_GROUPS) {
      if (g.items.some(it => location.pathname === it.to || (it.to !== "/admin" && location.pathname.startsWith(it.to + "/")))) {
        return g.id;
      }
    }
    return "overview";
  }, [location.pathname]);

  const [activeSection, setActiveSection] = useState<string>(sectionFromUrl);

  useEffect(() => { setActiveSection(sectionFromUrl); }, [sectionFromUrl]);

  const activeGroup = NAV_GROUPS.find(g => g.id === activeSection) ?? NAV_GROUPS[0];

  const handleLogout = async () => {
    await signOut();
    navigate("/admin/login");
  };

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  const isActive = (to: string) =>
    to === "/admin" ? location.pathname === "/admin" : location.pathname === to || location.pathname.startsWith(to + "/");

  // ─── PRIMARY SIDEBAR — sections only (no items inline), w-56 ─────────
  const primarySidebar = (
    <div className="w-56 min-h-screen bg-onyx border-r border-white/10 flex flex-col flex-shrink-0">
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

      {/* Pinned shortcuts at the very top */}
      <div className="px-2 pt-3 pb-2 border-b border-white/5">
        <div className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-600">Épinglés</div>
        <div className="space-y-0.5">
          {PINNED.map(item => {
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[12px] transition-all ${
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

      {/* Sections list — avec petit trait vertical entre les icones */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 scrollbar-thin">
        <div className="px-2 mb-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-600">Sections</div>
        <div>
          {NAV_GROUPS.map((group, idx) => {
            const isActiveSection = activeSection === group.id;
            const hasActivePage = group.items.some(it => isActive(it.to));
            return (
              <div key={group.id}>
                {idx > 0 && (
                  // Petit trait vertical entre les icones (aligne sur la colonne icone)
                  <div className="h-2.5 w-px bg-white/15 ml-[19.5px] my-0.5" aria-hidden="true" />
                )}
                <button
                  onClick={() => { setActiveSection(group.id); if (!secondaryOpen) setSecondaryOpen(true); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] transition-all ${
                    isActiveSection
                      ? "bg-onyx-light text-neutral-light font-semibold ring-1 ring-white/10"
                      : hasActivePage
                        ? "text-admin-accent hover:bg-white/5"
                        : "text-neutral-400 hover:bg-white/5 hover:text-neutral-light"
                  }`}
                >
                  <group.icon size={15} strokeWidth={1.75} />
                  <span className="flex-1 text-left">{group.label}</span>
                  {hasActivePage && <span className="w-1.5 h-1.5 rounded-full bg-admin-accent" />}
                </button>
              </div>
            );
          })}
        </div>
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

  // ─── SECONDARY SIDEBAR — items of active section, w-56 ──────────────
  const secondarySidebar = (
    <div className="w-56 min-h-screen bg-onyx/95 border-r border-white/10 flex flex-col flex-shrink-0">
      {/* Header: active section name */}
      <div className="h-14 px-4 flex items-center gap-2 border-b border-white/5">
        <activeGroup.icon size={15} className="text-admin-accent" strokeWidth={1.75} />
        <span className="text-neutral-light text-[13px] font-semibold tracking-wide">{activeGroup.label}</span>
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

      {/* Items list — avec ligne verticale guide a gauche (style arbre) */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
        <div className="ml-2 pl-3 border-l border-white/10 space-y-0.5">
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

      {/* Footer */}
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
