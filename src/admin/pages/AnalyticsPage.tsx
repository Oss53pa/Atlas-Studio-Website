import { useState, useEffect, useMemo } from "react";
import { Loader2, Download, TrendingUp, Users, ArrowDownRight, DollarSign, Filter } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { exportToCSV } from "../../lib/csvExport";
import { AfricaMap } from "../components/AfricaMap";

/* ─── Types ─── */
interface MonthData {
  label: string;
  revenue: number;
  newClients: number;
  cancelled: number;
  subs: number;
}

interface AppRevenue {
  app_id: string;
  name: string;
  total: number;
  count: number;
  color: string;
}

interface TopClient {
  full_name: string;
  email: string;
  total: number;
}

interface InvoiceRow {
  app_id: string | null;
  amount: number;
  created_at: string;
  user_id: string | null;
  profiles?: { full_name: string; email: string } | null;
}

interface SubRow {
  app_id: string;
  status: string;
  price_at_subscription: number;
  created_at: string;
  cancelled_at: string | null;
}

/* ─── KPI Card ─── */
function KpiCard({ label, value, sub, icon: Icon }: {
  label: string; value: string | number; sub?: string; icon: React.ComponentType<any>;
}) {
  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider">{label}</div>
        <Icon size={18} className="text-neutral-muted dark:text-admin-muted/60" strokeWidth={1.5} />
      </div>
      <div className="text-gold dark:text-admin-accent text-2xl font-semibold">{value}</div>
      {sub && <div className="text-neutral-muted dark:text-admin-muted text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Bar Chart ─── */
function BarChart({ data, color = "bg-gold dark:bg-admin-accent/80", height = 140 }: {
  data: { label: string; value: number }[]; color?: string; height?: number;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  const fmt = (n: number) => n.toLocaleString("fr-FR");
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map(d => {
        const pct = Math.max((d.value / max) * 100, 2);
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] text-neutral-muted dark:text-admin-muted">{d.value > 0 ? fmt(d.value) : ""}</span>
            <div className="w-full bg-white dark:bg-admin-surface-alt rounded-t-md overflow-hidden" style={{ height: height - 30 }}>
              <div className={`w-full ${color} rounded-t-md transition-all`} style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
            </div>
            <span className="text-[10px] text-neutral-muted dark:text-admin-muted capitalize">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function AnalyticsPage() {
  const { appMap, appList } = useAppCatalog();
  const { selectedApp, setSelectedApp } = useAppFilter();
  const [loading, setLoading] = useState(true);

  // Raw data
  const [allInvoices, setAllInvoices] = useState<InvoiceRow[]>([]);
  const [allSubs, setAllSubs] = useState<SubRow[]>([]);
  const [totalClients, setTotalClients] = useState(0);

  useEffect(() => {
    async function load() {
      const [invRes, subsRes, clientsRes] = await Promise.all([
        supabase.from("invoices").select("app_id, amount, created_at, user_id, profiles(full_name, email)").eq("status", "paid"),
        supabase.from("subscriptions").select("app_id, status, price_at_subscription, created_at, cancelled_at"),
        supabase.from("profiles").select("id, created_at"),
      ]);

      if (invRes.data) setAllInvoices(invRes.data as InvoiceRow[]);
      if (subsRes.data) setAllSubs(subsRes.data as SubRow[]);
      setTotalClients(clientsRes.data?.length || 0);
      setLoading(false);
    }
    load();
  }, []);

  // ─── Filtered data ───
  const invoices = useMemo(() =>
    selectedApp === "all" ? allInvoices : allInvoices.filter(i => i.app_id === selectedApp),
    [allInvoices, selectedApp]
  );

  const subs = useMemo(() =>
    selectedApp === "all" ? allSubs : allSubs.filter(s => s.app_id === selectedApp),
    [allSubs, selectedApp]
  );

  // ─── KPIs ───
  const mrr = useMemo(() =>
    subs.filter(s => s.status === "active" || s.status === "trial")
      .reduce((sum, s) => sum + (Number(s.price_at_subscription) || 0), 0),
    [subs]
  );

  const arr = mrr * 12;

  const activeSubs = useMemo(() =>
    subs.filter(s => s.status === "active" || s.status === "trial").length,
    [subs]
  );

  const totalRevenue = useMemo(() =>
    invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    [invoices]
  );

  // ─── Monthly data (12 months) ───
  const monthlyData = useMemo(() => {
    const months: MonthData[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

      const monthInvoices = invoices.filter(inv => {
        const dt = new Date(inv.created_at);
        return dt.getFullYear() === year && dt.getMonth() === month;
      });
      const revenue = monthInvoices.reduce((s, r) => s + (Number(r.amount) || 0), 0);

      const newSubs = subs.filter(s => {
        const dt = new Date(s.created_at);
        return dt.getFullYear() === year && dt.getMonth() === month;
      }).length;

      const cancelled = subs.filter(s => {
        if (!s.cancelled_at) return false;
        const dt = new Date(s.cancelled_at);
        return dt.getFullYear() === year && dt.getMonth() === month;
      }).length;

      months.push({ label, revenue, newClients: newSubs, cancelled, subs: newSubs });
    }
    return months;
  }, [invoices, subs]);

  // ─── Revenue by app ───
  const appRevenues = useMemo(() => {
    if (selectedApp !== "all") return [];
    const byApp: Record<string, { total: number; count: number }> = {};
    allInvoices.forEach(inv => {
      const id = inv.app_id || "unknown";
      if (!byApp[id]) byApp[id] = { total: 0, count: 0 };
      byApp[id].total += Number(inv.amount) || 0;
      byApp[id].count++;
    });
    const colors = ["#EF4444", "#0891B2", "#059669", "#8B5CF6", "#F59E0B", "#EC4899"];
    return Object.entries(byApp)
      .map(([app_id, d], i) => ({
        app_id,
        name: appMap[app_id]?.name || app_id,
        color: (appMap[app_id] as any)?.color || colors[i % colors.length],
        ...d,
      }))
      .sort((a, b) => b.total - a.total);
  }, [allInvoices, appMap, selectedApp]);

  // ─── Top clients ───
  const topClients = useMemo(() => {
    const byClient: Record<string, TopClient> = {};
    invoices.forEach(inv => {
      const uid = inv.user_id;
      if (!uid) return;
      if (!byClient[uid]) byClient[uid] = {
        full_name: (inv.profiles as any)?.full_name || "—",
        email: (inv.profiles as any)?.email || "",
        total: 0,
      };
      byClient[uid].total += Number(inv.amount) || 0;
    });
    return Object.values(byClient).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [invoices]);

  // ─── Avg churn ───
  const avgChurn = useMemo(() => {
    const last6 = monthlyData.slice(-6);
    const total = last6.reduce((s, m) => s + m.cancelled, 0);
    return last6.length > 0 ? Math.round(total / last6.length) : 0;
  }, [monthlyData]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const handleExport = () => {
    exportToCSV(monthlyData, [
      { key: "label", label: "Mois" },
      { key: "revenue", label: "Revenus" },
      { key: "newClients", label: "Nouveaux abonnements" },
      { key: "cancelled", label: "Annulations" },
    ], `analytics${selectedApp !== "all" ? `-${selectedApp}` : ""}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" /></div>;
  }

  const totalAppRevenue = appRevenues.reduce((s, a) => s + a.total, 0) || 1;
  const selectedAppName = selectedApp === "all" ? "Toutes les applications" : (appMap[selectedApp]?.name || selectedApp);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Analytics</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">
            {selectedApp === "all" ? "Vue consolidée — toutes les applications" : `Métriques de ${selectedAppName}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* App selector */}
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted pointer-events-none" />
            <select
              value={selectedApp}
              onChange={e => setSelectedApp(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors appearance-none cursor-pointer min-w-[220px]"
            >
              <option value="all">Consolidé — Toutes les apps</option>
              {appList.map(app => (
                <option key={app.id} value={app.id}>{app.name}</option>
              ))}
            </select>
          </div>
          <button onClick={handleExport} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-semibold text-neutral-text dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* App pills (quick switch) */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setSelectedApp("all")}
          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
            selectedApp === "all" ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-text dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40"
          }`}
        >
          Consolidé
        </button>
        {appList.map(app => (
          <button
            key={app.id}
            onClick={() => setSelectedApp(app.id)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
              selectedApp === app.id ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-text dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40"
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: (app as any).color || "#C8A960" }} />
            {app.name}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard label="MRR" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
        <KpiCard label="ARR" value={`${fmt(arr)} FCFA`} icon={TrendingUp} />
        <KpiCard label="Abonnements actifs" value={activeSubs} icon={Users} sub={`Revenu total: ${fmt(totalRevenue)} FCFA`} />
        <KpiCard label="Churn moyen/mois" value={avgChurn} icon={ArrowDownRight} sub={`sur les 6 derniers mois`} />
      </div>

      {/* Revenue chart */}
      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6 mb-6">
        <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">
          Revenus mensuels — {selectedAppName}
        </h2>
        <BarChart data={monthlyData.map(m => ({ label: m.label, value: m.revenue }))} color="bg-gold dark:bg-admin-accent/80" height={160} />
      </div>

      {/* Abonnements chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">Nouveaux abonnements par mois</h2>
          <BarChart data={monthlyData.map(m => ({ label: m.label, value: m.newClients }))} color="bg-emerald-400/70" height={130} />
        </div>
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">Annulations par mois</h2>
          <BarChart data={monthlyData.map(m => ({ label: m.label, value: m.cancelled }))} color="bg-red-400/70" height={130} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by app (only in consolidated view) */}
        {selectedApp === "all" && (
          <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6">
            <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">Répartition par application</h2>
            {appRevenues.length > 0 ? (
              <div className="space-y-3">
                {appRevenues.map(app => {
                  const pct = Math.round((app.total / totalAppRevenue) * 100);
                  return (
                    <button key={app.app_id} onClick={() => setSelectedApp(app.app_id)} className="w-full text-left hover:bg-white dark:bg-admin-surface-alt rounded-lg p-1 -m-1 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: app.color }} />
                          <span className="text-neutral-text dark:text-admin-text text-sm font-medium">{app.name}</span>
                        </div>
                        <span className="text-gold dark:text-admin-accent text-sm font-mono font-semibold">{fmt(app.total)} FCFA ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-white dark:bg-admin-surface-alt rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: app.color }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-neutral-muted dark:text-admin-muted text-sm">Aucune donnée</p>
            )}
          </div>
        )}

        {/* Africa Map — only in consolidated view */}
        {selectedApp === "all" && (
          <AfricaMap
            data={topClients.slice(0, 20).map((c, i) => ({
              country: c.full_name,
              code: "",
              value: Math.round(c.total / 1000),
              label: c.full_name,
            }))}
            title="Répartition géographique (clients)"
            valueLabel="K FCFA"
          />
        )}

        {/* Top clients */}
        <div className={`bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6 ${selectedApp === "all" ? "" : "lg:col-span-2"}`}>
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">
            Top 10 clients {selectedApp !== "all" ? `— ${selectedAppName}` : ""}
          </h2>
          {topClients.length > 0 ? (
            <div className="space-y-3">
              {topClients.map((c, i) => (
                <div key={c.email} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-gold/10 dark:bg-admin-accent/10 flex items-center justify-center text-gold dark:text-admin-accent text-[11px] font-bold">{i + 1}</div>
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
    </div>
  );
}
