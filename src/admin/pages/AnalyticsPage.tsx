import { useState, useEffect } from "react";
import { Loader2, Download, TrendingUp, Users, ArrowDownRight, DollarSign } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminCard } from "../components/AdminCard";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { exportToCSV } from "../../lib/csvExport";

interface MonthData {
  label: string;
  revenue: number;
  newClients: number;
  cancelled: number;
  churn: number;
}

interface AppRevenue {
  app_id: string;
  name: string;
  total: number;
  count: number;
}

interface TopClient {
  full_name: string;
  email: string;
  total: number;
}

export default function AnalyticsPage() {
  const { appMap } = useAppCatalog();
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<MonthData[]>([]);
  const [appRevenues, setAppRevenues] = useState<AppRevenue[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [mrr, setMrr] = useState(0);
  const [arr, setArr] = useState(0);
  const [totalClients, setTotalClients] = useState(0);
  const [avgChurn, setAvgChurn] = useState(0);

  useEffect(() => {
    async function load() {
      // Monthly data (last 12 months)
      const months: MonthData[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

        const [revRes, clientsRes, cancelledRes] = await Promise.all([
          supabase.from("invoices").select("amount").eq("status", "paid").gte("created_at", start).lte("created_at", end),
          supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
          supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("cancelled_at", start).lte("cancelled_at", end),
        ]);

        const revenue = revRes.data ? revRes.data.reduce((s, r) => s + (Number(r.amount) || 0), 0) : 0;
        const newClients = clientsRes.count || 0;
        const cancelled = cancelledRes.count || 0;
        months.push({ label, revenue, newClients, cancelled, churn: 0 });
      }
      setMonthlyData(months);

      // MRR
      const { data: activeSubs } = await supabase.from("subscriptions").select("price_at_subscription").in("status", ["active", "trial"]);
      const mrrVal = activeSubs ? activeSubs.reduce((s, r) => s + (Number(r.price_at_subscription) || 0), 0) : 0;
      setMrr(mrrVal);
      setArr(mrrVal * 12);

      // Total clients
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      setTotalClients(count || 0);

      // Avg churn (last 6 months)
      const churnVals = months.slice(-6).map(m => m.cancelled);
      setAvgChurn(churnVals.length > 0 ? Math.round(churnVals.reduce((a, b) => a + b, 0) / churnVals.length) : 0);

      // Revenue by app
      const { data: invByApp } = await supabase.from("invoices").select("app_id, amount").eq("status", "paid");
      if (invByApp) {
        const byApp: Record<string, { total: number; count: number }> = {};
        invByApp.forEach((inv: any) => {
          const id = inv.app_id || "unknown";
          if (!byApp[id]) byApp[id] = { total: 0, count: 0 };
          byApp[id].total += Number(inv.amount) || 0;
          byApp[id].count++;
        });
        const sorted = Object.entries(byApp)
          .map(([app_id, d]) => ({ app_id, name: appMap[app_id]?.name || app_id, ...d }))
          .sort((a, b) => b.total - a.total);
        setAppRevenues(sorted);
      }

      // Top clients
      const { data: topData } = await supabase.from("invoices").select("user_id, amount, profiles(full_name, email)").eq("status", "paid");
      if (topData) {
        const byClient: Record<string, TopClient> = {};
        topData.forEach((inv: any) => {
          const uid = inv.user_id;
          if (!uid) return;
          if (!byClient[uid]) byClient[uid] = { full_name: inv.profiles?.full_name || "—", email: inv.profiles?.email || "", total: 0 };
          byClient[uid].total += Number(inv.amount) || 0;
        });
        setTopClients(Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 10));
      }

      setLoading(false);
    }
    load();
  }, [appMap]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const handleExport = () => {
    exportToCSV(monthlyData, [
      { key: "label", label: "Mois" },
      { key: "revenue", label: "Revenus" },
      { key: "newClients", label: "Nouveaux clients" },
      { key: "cancelled", label: "Annulations" },
    ], "analytics");
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gold" /></div>;
  }

  const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);
  const maxClients = Math.max(...monthlyData.map(m => m.newClients), 1);
  const totalAppRevenue = appRevenues.reduce((s, a) => s + a.total, 0) || 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-neutral-muted text-sm">Metriques et tendances de la plateforme</p>
        </div>
        <button onClick={handleExport} className="px-4 py-2.5 border border-warm-border rounded-lg text-[13px] font-semibold text-neutral-body hover:border-gold/40 transition-colors flex items-center gap-2">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminCard label="MRR" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
        <AdminCard label="ARR" value={`${fmt(arr)} FCFA`} icon={TrendingUp} />
        <AdminCard label="Clients totaux" value={totalClients} icon={Users} />
        <AdminCard label="Churn moyen/mois" value={avgChurn} icon={ArrowDownRight} />
      </div>

      {/* Revenue chart (12 months) */}
      <div className="bg-white border border-warm-border rounded-2xl p-6 mb-6">
        <h2 className="text-neutral-text text-base font-bold mb-4">Revenus mensuels (12 mois)</h2>
        <div className="flex items-end gap-2 h-44">
          {monthlyData.map(m => {
            const pct = Math.max((m.revenue / maxRevenue) * 100, 2);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-neutral-muted">{m.revenue > 0 ? fmt(m.revenue) : ""}</span>
                <div className="w-full bg-warm-bg rounded-t-md overflow-hidden" style={{ height: "140px" }}>
                  <div className="w-full bg-gold/80 rounded-t-md transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                </div>
                <span className="text-[10px] text-neutral-muted capitalize">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* New clients chart */}
      <div className="bg-white border border-warm-border rounded-2xl p-6 mb-6">
        <h2 className="text-neutral-text text-base font-bold mb-4">Nouveaux clients par mois</h2>
        <div className="flex items-end gap-2 h-32">
          {monthlyData.map(m => {
            const pct = Math.max((m.newClients / maxClients) * 100, 3);
            return (
              <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-neutral-muted">{m.newClients > 0 ? m.newClients : ""}</span>
                <div className="w-full bg-warm-bg rounded-t-md overflow-hidden" style={{ height: "100px" }}>
                  <div className="w-full bg-blue-400/70 rounded-t-md transition-all" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                </div>
                <span className="text-[10px] text-neutral-muted capitalize">{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by app */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Revenus par application</h2>
          {appRevenues.length > 0 ? (
            <div className="space-y-3">
              {appRevenues.map(app => {
                const pct = Math.round((app.total / totalAppRevenue) * 100);
                return (
                  <div key={app.app_id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-neutral-text text-sm font-medium">{app.name}</span>
                      <span className="text-gold text-sm font-semibold">{fmt(app.total)} FCFA ({pct}%)</span>
                    </div>
                    <div className="w-full h-2 bg-warm-bg rounded-full overflow-hidden">
                      <div className="h-full bg-gold rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-neutral-muted text-sm">Aucune donnee</p>
          )}
        </div>

        {/* Top clients */}
        <div className="bg-white border border-warm-border rounded-2xl p-6">
          <h2 className="text-neutral-text text-base font-bold mb-4">Top 10 clients par revenu</h2>
          {topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold/10 flex items-center justify-center text-gold text-[11px] font-bold">{i + 1}</div>
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
      </div>
    </div>
  );
}
