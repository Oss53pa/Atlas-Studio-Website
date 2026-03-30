import { useEffect, useState } from "react";
import { Users, Repeat, DollarSign, TrendingUp, Loader2, Eye, AlertTriangle, UserPlus, BarChart3, ArrowDownRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminCard } from "../components/AdminCard";
import { AdminBadge } from "../components/AdminBadge";
import { useAppCatalog } from "../../hooks/useAppCatalog";

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

interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
  user_id: string | null;
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

export default function DashboardPage() {
  const { appMap } = useAppCatalog();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [monthlyRevenues, setMonthlyRevenues] = useState<MonthlyRevenue[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [mrr, setMrr] = useState(0);
  const [newClientsMonth, setNewClientsMonth] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, revenueRes, activityRes] = await Promise.all([
        supabase.rpc('admin_dashboard_stats'),
        supabase.rpc('admin_revenue_summary'),
        supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (revenueRes.data) setRevenue(revenueRes.data as unknown as RevenueSummary);
      if (activityRes.data) setActivity(activityRes.data as ActivityItem[]);

      // MRR: sum of price_at_subscription for active subscriptions
      const { data: activeSubs } = await supabase
        .from("subscriptions")
        .select("price_at_subscription")
        .in("status", ["active", "trial"]);
      if (activeSubs) {
        const total = activeSubs.reduce((sum, s) => sum + (Number(s.price_at_subscription) || 0), 0);
        setMrr(total);
      }

      // New clients this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStart.toISOString());
      setNewClientsMonth(count || 0);

      // Churn rate: cancelled last 30 days / total active
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [cancelledRes, totalActiveRes] = await Promise.all([
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .eq("status", "cancelled").gte("cancelled_at", thirtyDaysAgo),
        supabase.from("subscriptions").select("id", { count: "exact", head: true })
          .in("status", ["active", "trial"]),
      ]);
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
        const { data: inv } = await supabase
          .from("invoices")
          .select("amount")
          .eq("status", "paid")
          .gte("created_at", start)
          .lte("created_at", end);
        const amount = inv ? inv.reduce((s, r) => s + (Number(r.amount) || 0), 0) : 0;
        months.push({ month: start, label, amount });
      }
      setMonthlyRevenues(months);

      // Top 5 clients by revenue
      const { data: topData } = await supabase
        .from("invoices")
        .select("user_id, amount, profiles(full_name, email)")
        .eq("status", "paid");
      if (topData) {
        const byClient: Record<string, TopClient> = {};
        topData.forEach((inv: any) => {
          const uid = inv.user_id;
          if (!uid) return;
          if (!byClient[uid]) {
            byClient[uid] = {
              full_name: inv.profiles?.full_name || "—",
              email: inv.profiles?.email || "",
              total: 0,
            };
          }
          byClient[uid].total += Number(inv.amount) || 0;
        });
        const sorted = Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 5);
        setTopClients(sorted);
      }

      // Pending invoices
      const { data: pending } = await supabase
        .from("invoices")
        .select("id, invoice_number, amount, currency, created_at, profiles(full_name, email)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      if (pending) setPendingInvoices(pending as PendingInvoice[]);

      setLoading(false);
    }
    load();
  }, []);

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  const maxMonthly = Math.max(...monthlyRevenues.map(m => m.amount), 1);

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Dashboard</h1>
      <p className="text-neutral-muted text-sm mb-7">Vue d'ensemble de votre plateforme</p>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <AdminCard label="MRR (Revenus recurrents)" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
        <AdminCard label="Revenus du mois" value={`${fmt(revenue?.monthly_revenue || 0)} FCFA`} icon={TrendingUp} />
        <AdminCard label="Clients" value={stats?.total_users || 0} icon={Users} />
        <AdminCard label="Abonnements actifs" value={stats?.active_subscriptions || 0} icon={Repeat} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <AdminCard label="Nouveaux clients (ce mois)" value={newClientsMonth} icon={UserPlus} />
        <AdminCard label="Taux de churn (30j)" value={`${churnRate}%`} icon={ArrowDownRight} />
        <AdminCard label="Revenus totaux" value={`${fmt(revenue?.total_revenue || 0)} FCFA`} icon={BarChart3} />
      </div>

      {revenue && revenue.pending_payments > 0 && (
        <div className="mb-6 px-5 py-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600" />
          <span className="text-amber-700 text-sm font-semibold">
            {fmt(revenue.pending_payments)} FCFA de paiements en attente
          </span>
        </div>
      )}

      {/* Revenue chart + Popular apps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Revenue bar chart */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Revenus (6 derniers mois)</h2>
          <div className="flex items-end gap-3 h-40">
            {monthlyRevenues.map(m => {
              const pct = Math.max((m.amount / maxMonthly) * 100, 2);
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-neutral-muted">{m.amount > 0 ? fmt(m.amount) : ""}</span>
                  <div className="w-full bg-warm-bg rounded-t-md overflow-hidden" style={{ height: "120px" }}>
                    <div
                      className="w-full bg-gold/80 rounded-t-md transition-all"
                      style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-neutral-muted font-medium capitalize">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Popular apps */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Apps populaires</h2>
          {stats?.popular_apps && stats.popular_apps.length > 0 ? (
            <div className="space-y-3">
              {stats.popular_apps.map((app, i) => (
                <div key={app.app_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center text-gold text-[11px] font-bold">
                      {i + 1}
                    </div>
                    <span className="text-neutral-text text-sm font-medium">
                      {appMap[app.app_id]?.name || app.app_id}
                    </span>
                  </div>
                  <span className="text-neutral-muted text-sm">{app.sub_count} abonnes</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted text-sm">Aucune donnee disponible</p>
          )}
        </div>
      </div>

      {/* Top clients + Pending invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top clients by revenue */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Top clients par revenu</h2>
          {topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center text-gold text-[11px] font-bold">
                      {i + 1}
                    </div>
                    <div>
                      <span className="text-neutral-text text-sm font-medium">{c.full_name}</span>
                      <div className="text-neutral-muted text-[11px]">{c.email}</div>
                    </div>
                  </div>
                  <span className="text-gold text-sm font-semibold">{fmt(c.total)} FCFA</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted text-sm">Aucune donnee</p>
          )}
        </div>

        {/* Pending invoices */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Factures en attente</h2>
          {pendingInvoices.length > 0 ? (
            <div className="space-y-3">
              {pendingInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-1">
                  <div>
                    <span className="text-neutral-text text-sm font-medium">{inv.invoice_number}</span>
                    <div className="text-neutral-muted text-[11px]">
                      {(inv.profiles as any)?.full_name || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-amber-600 text-sm font-semibold">{fmt(Number(inv.amount))} {inv.currency || "FCFA"}</span>
                    <div className="text-neutral-placeholder text-[10px]">
                      {new Date(inv.created_at).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-muted text-sm">Aucune facture en attente</p>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white border border-warm-border rounded-2xl p-6">
        <h2 className="text-neutral-text text-base font-bold mb-4">Activite recente</h2>
        {activity.length > 0 ? (
          <div className="space-y-3">
            {activity.map(a => (
              <div key={a.id} className="flex items-center justify-between py-1">
                <span className="text-neutral-body text-[13px]">{a.action}</span>
                <span className="text-neutral-placeholder text-[11px]">
                  {new Date(a.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-neutral-muted text-sm">Aucune activite recente</p>
        )}
      </div>
    </div>
  );
}
