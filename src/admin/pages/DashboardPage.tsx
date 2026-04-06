import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Repeat, DollarSign, TrendingUp, Loader2, AlertTriangle,
  UserPlus, BarChart3, ArrowDownRight, ArrowRight, FileText,
  MessageSquare, Receipt, Mail, CreditCard, ClipboardList, Megaphone,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";

/* ─── Types ─── */
interface DashboardStats {
  total_users: number;
  active_subscriptions: number;
  popular_apps: { app_id: string; sub_count: number }[] | null;
}

interface RevenueSummary {
  monthly_revenue: number;
  total_revenue: number;
  pending_payments: number;
}

interface MonthlyRevenue {
  month: string;
  label: string;
  amount: number;
}

interface TopClient {
  full_name: string;
  email: string;
  total: number;
}

interface PendingInvoice {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

/* ─── Quick Access Module Card ─── */
function ModuleCard({ to, icon: Icon, label, description, stat, color }: {
  to: string; icon: LucideIcon; label: string; description: string; stat?: string | number; color: string;
}) {
  return (
    <Link to={to} className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5 hover:border-gold/30 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={20} strokeWidth={1.5} />
        </div>
        <ArrowRight size={14} className="text-neutral-300 group-hover:text-gold dark:text-admin-accent group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
      <div className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-0.5">{label}</div>
      <div className="text-neutral-muted dark:text-admin-muted text-[12px] font-light leading-relaxed">{description}</div>
      {stat !== undefined && (
        <div className="text-gold dark:text-admin-accent text-lg font-semibold mt-2">{stat}</div>
      )}
    </Link>
  );
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, icon: Icon, trend }: {
  label: string; value: string | number; icon: LucideIcon; trend?: string;
}) {
  return (
    <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider">{label}</div>
        <Icon size={18} className="text-neutral-muted dark:text-admin-muted/60" strokeWidth={1.5} />
      </div>
      <div className="text-gold dark:text-admin-accent text-2xl font-semibold">{value}</div>
      {trend && <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-0.5">{trend}</div>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { appMap } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [monthlyRevenues, setMonthlyRevenues] = useState<MonthlyRevenue[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [mrr, setMrr] = useState(0);
  const [newClientsMonth, setNewClientsMonth] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, revenueRes] = await Promise.all([
        supabase.rpc('admin_dashboard_stats'),
        supabase.rpc('admin_revenue_summary'),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (revenueRes.data) setRevenue(revenueRes.data as unknown as RevenueSummary);

      // MRR
      let subsQuery = supabase.from("subscriptions").select("price_at_subscription").in("status", ["active", "trial"]);
      if (selectedApp !== "all") subsQuery = subsQuery.eq("app_id", selectedApp);
      const { data: activeSubs } = await subsQuery;
      if (activeSubs) {
        setMrr(activeSubs.reduce((sum, s) => sum + (Number(s.price_at_subscription) || 0), 0));
      }

      // New clients this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count: newCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString());
      setNewClientsMonth(newCount || 0);

      // Open tickets
      let ticketQuery = supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
      if (selectedApp !== "all") ticketQuery = ticketQuery.eq("app_id", selectedApp);
      const { count: ticketCount } = await ticketQuery;
      setOpenTickets(ticketCount || 0);

      // Churn rate
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      let cancelledQuery = supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("cancelled_at", thirtyDaysAgo);
      let activeQuery = supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]);
      if (selectedApp !== "all") { cancelledQuery = cancelledQuery.eq("app_id", selectedApp); activeQuery = activeQuery.eq("app_id", selectedApp); }
      const [cancelledRes, totalActiveRes] = await Promise.all([cancelledQuery, activeQuery]);
      const cancelled = cancelledRes.count || 0;
      const totalActive = totalActiveRes.count || 0;
      setChurnRate(totalActive > 0 ? Math.round((cancelled / (totalActive + cancelled)) * 100) : 0);

      // Monthly revenues (last 6 months)
      const months: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const label = d.toLocaleDateString("fr-FR", { month: "short" });
        let invQuery = supabase.from("invoices").select("amount").eq("status", "paid").gte("created_at", start).lte("created_at", end);
        if (selectedApp !== "all") invQuery = invQuery.eq("app_id", selectedApp);
        const { data: inv } = await invQuery;
        months.push({ month: start, label, amount: inv ? inv.reduce((s, r) => s + (Number(r.amount) || 0), 0) : 0 });
      }
      setMonthlyRevenues(months);

      // Top clients
      let topQuery = supabase.from("invoices").select("user_id, amount, profiles(full_name, email)").eq("status", "paid");
      if (selectedApp !== "all") topQuery = topQuery.eq("app_id", selectedApp);
      const { data: topData } = await topQuery;
      if (topData) {
        const byClient: Record<string, TopClient> = {};
        topData.forEach((inv: any) => {
          const uid = inv.user_id;
          if (!uid) return;
          if (!byClient[uid]) byClient[uid] = { full_name: inv.profiles?.full_name || "—", email: inv.profiles?.email || "", total: 0 };
          byClient[uid].total += Number(inv.amount) || 0;
        });
        setTopClients(Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 5));
      }

      // Pending invoices
      let pendingQuery = supabase.from("invoices").select("id, invoice_number, amount, currency, created_at, profiles(full_name, email)").eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      if (selectedApp !== "all") pendingQuery = pendingQuery.eq("app_id", selectedApp);
      const { data: pending } = await pendingQuery;
      if (pending) setPendingInvoices(pending as PendingInvoice[]);

      setLoading(false);
    }
    load();
  }, [selectedApp]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" />
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyRevenues.map(m => m.amount), 1);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Console Atlas Studio</h1>
        <p className="text-neutral-muted dark:text-admin-muted text-sm">
          {selectedApp === "all"
            ? "Centre de commande unifié — vue d'ensemble de la plateforme"
            : `Filtré par : ${appMap[selectedApp]?.name || selectedApp}`}
        </p>
      </div>

      {/* 4 KPI principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="Utilisateurs" value={stats?.total_users || 0} icon={Users} trend={`+${newClientsMonth} ce mois`} />
        <KpiCard label="Abonnements actifs" value={stats?.active_subscriptions || 0} icon={Repeat} trend={`Churn ${churnRate}%`} />
        <KpiCard label="MRR" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
        <KpiCard label="Tickets ouverts" value={openTickets} icon={MessageSquare} />
      </div>

      {/* Alerte paiements en attente */}
      {revenue && revenue.pending_payments > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <span className="text-amber-700 text-sm font-semibold">
            {fmt(revenue.pending_payments)} FCFA de paiements en attente
          </span>
          <Link to="/admin/invoices" className="ml-auto text-amber-700 text-[12px] font-semibold hover:underline">
            Voir les factures →
          </Link>
        </div>
      )}

      {/* Modules en accès rapide */}
      <div className="mb-8">
        <h2 className="text-neutral-text dark:text-admin-text text-base font-semibold mb-4">Accès rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ModuleCard to="/admin/clients" icon={Users} label="Utilisateurs" description="Comptes, rôles, accès" stat={stats?.total_users || 0} color="bg-blue-50 text-blue-600" />
          <ModuleCard to="/admin/subscriptions" icon={Repeat} label="Abonnements" description="Actifs, essais, résiliés" stat={stats?.active_subscriptions || 0} color="bg-emerald-50 text-emerald-600" />
          <ModuleCard to="/admin/invoices" icon={Receipt} label="Facturation" description="Factures, paiements" stat={`${fmt(revenue?.monthly_revenue || 0)} FCFA`} color="bg-amber-50 text-amber-600" />
          <ModuleCard to="/admin/tickets" icon={MessageSquare} label="Support" description="Tickets, demandes" stat={openTickets} color="bg-purple-50 text-purple-600" />
          <ModuleCard to="/admin/content" icon={FileText} label="Landing Page" description="Contenu, images, couleurs" color="bg-pink-50 text-pink-600" />
          <ModuleCard to="/admin/apps" icon={CreditCard} label="Grille Tarifaire" description="Apps, plans, pricing" color="bg-cyan-50 text-cyan-600" />
          <ModuleCard to="/admin/analytics" icon={BarChart3} label="Analytics" description="Revenus, tendances" color="bg-indigo-50 text-indigo-600" />
          <ModuleCard to="/admin/newsletter" icon={Mail} label="Newsletter" description="Abonnés, campagnes" color="bg-orange-50 text-orange-600" />
          <ModuleCard to="/admin/emails" icon={Megaphone} label="Templates Email" description="Modèles de notifications" color="bg-teal-50 text-teal-600" />
          <ModuleCard to="/admin/activity" icon={ClipboardList} label="Logs & Audit" description="Événements, historique" color="bg-slate-50 text-slate-600" />
        </div>
      </div>

      {/* Revenue chart + Top clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold">Revenus (6 derniers mois)</h2>
            <Link to="/admin/analytics" className="text-gold dark:text-admin-accent text-[12px] font-medium hover:underline">Détails →</Link>
          </div>
          <div className="flex items-end gap-3 h-40">
            {monthlyRevenues.map(m => {
              const pct = Math.max((m.amount / maxMonthly) * 100, 2);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-neutral-muted dark:text-admin-muted">{m.amount > 0 ? fmt(m.amount) : ""}</span>
                  <div className="w-full bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt rounded-t-md overflow-hidden" style={{ height: "120px" }}>
                    <div className="w-full bg-gold dark:bg-admin-accent/80 rounded-t-md transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                  </div>
                  <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-medium capitalize">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold">Top clients par revenu</h2>
          </div>
          {topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold dark:bg-admin-accent/10 flex items-center justify-center text-gold dark:text-admin-accent text-[11px] font-bold">{i + 1}</div>
                    <div>
                      <span className="text-neutral-text dark:text-admin-text text-sm font-medium">{c.full_name}</span>
                      <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{c.email}</div>
                    </div>
                  </div>
                  <span className="text-gold dark:text-admin-accent text-sm font-mono font-semibold">{fmt(c.total)} FCFA</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucune donnée</p>
          )}
        </div>
      </div>

      {/* Apps populaires + Factures en attente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">Apps populaires</h2>
          {stats?.popular_apps && stats.popular_apps.length > 0 ? (
            <div className="space-y-3">
              {stats.popular_apps.map((app, i) => (
                <div key={app.app_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold dark:bg-admin-accent/10 flex items-center justify-center text-gold dark:text-admin-accent text-[11px] font-bold">{i + 1}</div>
                    <span className="text-neutral-text dark:text-admin-text text-sm font-medium">{appMap[app.app_id]?.name || app.app_id}</span>
                  </div>
                  <span className="text-neutral-muted dark:text-admin-muted text-sm">{app.sub_count} abonnés</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucune donnée</p>
          )}
        </div>

        <div className="bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold">Factures en attente</h2>
            <Link to="/admin/invoices" className="text-gold dark:text-admin-accent text-[12px] font-medium hover:underline">Tout voir →</Link>
          </div>
          {pendingInvoices.length > 0 ? (
            <div className="space-y-3">
              {pendingInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-neutral-text dark:text-admin-text text-sm font-medium">{inv.invoice_number}</span>
                    <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{(inv.profiles as any)?.full_name || "—"}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-600 text-sm font-mono font-semibold">{fmt(Number(inv.amount))} {inv.currency || "FCFA"}</span>
                    <div className="text-neutral-muted dark:text-admin-muted/60 text-[10px]">{new Date(inv.created_at).toLocaleDateString("fr-FR")}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucune facture en attente</p>
          )}
        </div>
      </div>
    </div>
  );
}
