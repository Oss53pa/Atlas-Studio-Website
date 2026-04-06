import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users, Repeat, DollarSign, Loader2, AlertTriangle,
  ArrowRight, FileText, MessageSquare, Receipt, Mail,
  CreditCard, ClipboardList, Brain, Activity, Flag,
  Bell, Tag, Rocket, BookOpen, BarChart3, KeyRound,
  Send, ShieldCheck, Settings, Layers, Wallet,
  TrendingUp, TrendingDown, Eye, MousePointerClick,
  type LucideIcon,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "../../lib/supabase";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";

/* ─── Types ─── */
interface DashboardStats {
  total_users: number;
  active_subscriptions: number;
  popular_apps: { app_id: string; sub_count: number }[] | null;
}
interface RevenueSummary { monthly_revenue: number; total_revenue: number; pending_payments: number; }
interface MonthlyRevenue { label: string; amount: number; }
interface TopClient { full_name: string; email: string; total: number; }
interface PendingInvoice { id: string; invoice_number: string; amount: number; currency: string; created_at: string; profiles?: { full_name: string } | null; }

type Tab = "overview" | "revenue" | "clients" | "operations" | "content";

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: "overview", label: "Vue d'ensemble", icon: Eye },
  { key: "revenue", label: "Revenus & Paiements", icon: Wallet },
  { key: "clients", label: "Clients & Licences", icon: Users },
  { key: "operations", label: "Opérations", icon: Activity },
  { key: "content", label: "Contenu & Marketing", icon: Mail },
];

/* ─── Small Components ─── */
function KpiCard({ label, value, icon: Icon, trend, trendDown }: {
  label: string; value: string | number; icon: LucideIcon; trend?: string; trendDown?: boolean;
}) {
  return (
    <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#888] text-[11px] font-semibold uppercase tracking-wider">{label}</span>
        <Icon size={16} className="text-[#888]/60" strokeWidth={1.5} />
      </div>
      <div className="text-[#EF9F27] text-2xl font-semibold">{value}</div>
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-[11px] ${trendDown ? "text-red-400" : "text-emerald-400"}`}>
          {trendDown ? <TrendingDown size={11} /> : <TrendingUp size={11} />}
          {trend}
        </div>
      )}
    </div>
  );
}

function QuickLink({ to, icon: Icon, label, desc, stat, color }: {
  to: string; icon: LucideIcon; label: string; desc: string; stat?: string | number; color: string;
}) {
  return (
    <Link to={to} className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-4 hover:border-[#EF9F27]/30 transition-all group">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon size={17} strokeWidth={1.5} /></div>
        <ArrowRight size={12} className="text-[#888]/40 group-hover:text-[#EF9F27] transition-all mt-1" />
      </div>
      <div className="text-[#F5F5F5] text-[13px] font-semibold">{label}</div>
      <div className="text-[#888] text-[11px] mt-0.5">{desc}</div>
      {stat !== undefined && <div className="text-[#EF9F27] text-lg font-semibold font-mono mt-1.5">{stat}</div>}
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function DashboardPage() {
  const { appMap } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [monthlyRevenues, setMonthlyRevenues] = useState<MonthlyRevenue[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [mrr, setMrr] = useState(0);
  const [newClientsMonth, setNewClientsMonth] = useState(0);
  const [churnRate, setChurnRate] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [licenceCount, setLicenceCount] = useState({ total: 0, active: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [statsRes, revenueRes] = await Promise.all([
        supabase.rpc("admin_dashboard_stats"),
        supabase.rpc("admin_revenue_summary"),
      ]);
      if (statsRes.data) setStats(statsRes.data as unknown as DashboardStats);
      if (revenueRes.data) setRevenue(revenueRes.data as unknown as RevenueSummary);

      let subsQ = supabase.from("subscriptions").select("price_at_subscription").in("status", ["active", "trial"]);
      if (selectedApp !== "all") subsQ = subsQ.eq("app_id", selectedApp);
      const { data: activeSubs } = await subsQ;
      if (activeSubs) setMrr(activeSubs.reduce((s, r) => s + (Number(r.price_at_subscription) || 0), 0));

      const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
      const { count: nc } = await supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", monthStart.toISOString());
      setNewClientsMonth(nc || 0);

      let tQ = supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
      if (selectedApp !== "all") tQ = tQ.eq("app_id", selectedApp);
      const { count: tc } = await tQ;
      setOpenTickets(tc || 0);

      const thirtyAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const [cRes, aRes] = await Promise.all([
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "cancelled").gte("cancelled_at", thirtyAgo),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trial"]),
      ]);
      const can = cRes.count || 0; const act = aRes.count || 0;
      setChurnRate(act > 0 ? Math.round((can / (act + can)) * 100) : 0);

      const months: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
        let iQ = supabase.from("invoices").select("amount").eq("status", "paid").gte("created_at", start).lte("created_at", end);
        if (selectedApp !== "all") iQ = iQ.eq("app_id", selectedApp);
        const { data: inv } = await iQ;
        months.push({ label: d.toLocaleDateString("fr-FR", { month: "short" }), amount: inv ? inv.reduce((s, r) => s + (Number(r.amount) || 0), 0) : 0 });
      }
      setMonthlyRevenues(months);

      const { data: topData } = await supabase.from("invoices").select("user_id, amount, profiles(full_name, email)").eq("status", "paid").limit(100);
      if (topData) {
        const byC: Record<string, TopClient> = {};
        topData.forEach((inv: any) => { const u = inv.user_id; if (!u) return; if (!byC[u]) byC[u] = { full_name: inv.profiles?.full_name || "—", email: inv.profiles?.email || "", total: 0 }; byC[u].total += Number(inv.amount) || 0; });
        setTopClients(Object.values(byC).sort((a, b) => b.total - a.total).slice(0, 5));
      }

      const { data: pending } = await supabase.from("invoices").select("id, invoice_number, amount, currency, created_at, profiles(full_name)").eq("status", "pending").order("created_at", { ascending: false }).limit(5);
      if (pending) setPendingInvoices(pending as PendingInvoice[]);

      // Licences
      const { count: lt } = await supabase.from("licences").select("id", { count: "exact", head: true });
      const { count: la } = await supabase.from("licences").select("id", { count: "exact", head: true }).eq("status", "active");
      const { count: lp } = await supabase.from("licences").select("id", { count: "exact", head: true }).eq("status", "pending");
      setLicenceCount({ total: lt || 0, active: la || 0, pending: lp || 0 });

      setLoading(false);
    }
    load();
  }, [selectedApp]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-[#EF9F27]" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[#F5F5F5] text-2xl font-bold mb-1">Console Atlas Studio</h1>
        <p className="text-[#888] text-sm">{selectedApp === "all" ? "Centre de commande unifié" : `Filtré par : ${appMap[selectedApp]?.name || selectedApp}`}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2A2A3A] overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === key ? "text-[#EF9F27] border-[#EF9F27]" : "text-[#888] border-transparent hover:text-[#F5F5F5]"}`}>
            <Icon size={15} />{label}
          </button>
        ))}
      </div>

      {/* Alert */}
      {revenue && revenue.pending_payments > 0 && tab === "overview" && (
        <div className="mb-6 px-5 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-400" />
          <span className="text-amber-300 text-sm font-medium">{fmt(revenue.pending_payments)} FCFA en attente</span>
          <Link to="/admin/invoices" className="ml-auto text-amber-400 text-xs hover:underline">Voir →</Link>
        </div>
      )}

      {/* ═══ TAB: Vue d'ensemble ═══ */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Utilisateurs" value={stats?.total_users || 0} icon={Users} trend={`+${newClientsMonth} ce mois`} />
            <KpiCard label="Abonnements" value={stats?.active_subscriptions || 0} icon={Repeat} trend={`Churn ${churnRate}%`} trendDown={churnRate > 5} />
            <KpiCard label="MRR" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
            <KpiCard label="Licences actives" value={licenceCount.active} icon={KeyRound} trend={`${licenceCount.pending} en attente`} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            <QuickLink to="/admin/proph3t" icon={Brain} label="Proph3t IA" desc="Insights & recommandations" color="bg-amber-500/10 text-amber-400" />
            <QuickLink to="/admin/clients" icon={Users} label="Utilisateurs" desc="Comptes & accès" stat={stats?.total_users || 0} color="bg-blue-500/10 text-blue-400" />
            <QuickLink to="/admin/licences" icon={KeyRound} label="Licences" desc="Clés, sièges, activation" stat={licenceCount.total} color="bg-emerald-500/10 text-emerald-400" />
            <QuickLink to="/admin/payments" icon={Wallet} label="Paiements" desc="Transactions & virements" color="bg-yellow-500/10 text-yellow-400" />
            <QuickLink to="/admin/tickets" icon={MessageSquare} label="Support" desc="Tickets ouverts" stat={openTickets} color="bg-purple-500/10 text-purple-400" />
            <QuickLink to="/admin/plans" icon={Layers} label="Plans & Tarifs" desc="Starter / Pro / Enterprise" color="bg-cyan-500/10 text-cyan-400" />
          </div>
          {/* Revenue chart */}
          <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-6">
            <h2 className="text-[#F5F5F5] text-sm font-semibold mb-4">Revenus (6 derniers mois)</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={monthlyRevenues}>
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={50} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <Tooltip contentStyle={{ background: "#1E1E2E", border: "1px solid #2A2A3A", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`${fmt(v)} FCFA`, "Revenus"]} />
                <Bar dataKey="amount" fill="#EF9F27" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ═══ TAB: Revenus & Paiements ═══ */}
      {tab === "revenue" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="MRR" value={`${fmt(mrr)} FCFA`} icon={DollarSign} />
            <KpiCard label="Revenus ce mois" value={`${fmt(revenue?.monthly_revenue || 0)} FCFA`} icon={TrendingUp} />
            <KpiCard label="En attente" value={`${fmt(revenue?.pending_payments || 0)} FCFA`} icon={AlertTriangle} />
            <KpiCard label="Total encaissé" value={`${fmt(revenue?.total_revenue || 0)} FCFA`} icon={Wallet} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-6">
              <h3 className="text-[#F5F5F5] text-sm font-semibold mb-4">Évolution des revenus</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyRevenues}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={50} tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                  <Tooltip contentStyle={{ background: "#1E1E2E", border: "1px solid #2A2A3A", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="amount" fill="#EF9F27" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[#F5F5F5] text-sm font-semibold">Factures en attente</h3>
                <Link to="/admin/invoices" className="text-[#EF9F27] text-xs hover:underline">Tout voir →</Link>
              </div>
              {pendingInvoices.length > 0 ? pendingInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-[#2A2A3A]/50 last:border-0">
                  <div><div className="text-[#F5F5F5] text-sm">{inv.invoice_number}</div><div className="text-[#888] text-[11px]">{(inv.profiles as any)?.full_name || "—"}</div></div>
                  <span className="text-amber-400 text-sm font-mono font-semibold">{fmt(Number(inv.amount))} FCFA</span>
                </div>
              )) : <p className="text-[#888] text-sm">Aucune facture en attente</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <QuickLink to="/admin/payments" icon={Wallet} label="Paiements" desc="Transactions, virements" color="bg-yellow-500/10 text-yellow-400" />
            <QuickLink to="/admin/invoices" icon={Receipt} label="Facturation" desc="Factures & avoir" color="bg-emerald-500/10 text-emerald-400" />
            <QuickLink to="/admin/promo-codes" icon={Tag} label="Codes Promo" desc="Réductions, coupons" color="bg-rose-500/10 text-rose-400" />
          </div>
        </>
      )}

      {/* ═══ TAB: Clients & Licences ═══ */}
      {tab === "clients" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Utilisateurs" value={stats?.total_users || 0} icon={Users} trend={`+${newClientsMonth} ce mois`} />
            <KpiCard label="Abonnements actifs" value={stats?.active_subscriptions || 0} icon={Repeat} />
            <KpiCard label="Licences actives" value={licenceCount.active} icon={KeyRound} />
            <KpiCard label="Tickets ouverts" value={openTickets} icon={MessageSquare} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-6">
              <h3 className="text-[#F5F5F5] text-sm font-semibold mb-4">Top clients par revenu</h3>
              {topClients.length > 0 ? topClients.map((c, i) => (
                <div key={c.email} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-[#EF9F27]/10 flex items-center justify-center text-[#EF9F27] text-[11px] font-bold">{i + 1}</div>
                    <div><div className="text-[#F5F5F5] text-sm">{c.full_name}</div><div className="text-[#888] text-[11px]">{c.email}</div></div>
                  </div>
                  <span className="text-[#EF9F27] text-sm font-mono font-semibold">{fmt(c.total)} FCFA</span>
                </div>
              )) : <p className="text-[#888] text-sm">Aucune donnée</p>}
            </div>
            <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-6">
              <h3 className="text-[#F5F5F5] text-sm font-semibold mb-4">Apps populaires</h3>
              {stats?.popular_apps && stats.popular_apps.length > 0 ? stats.popular_apps.map((app, i) => (
                <div key={app.app_id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-[#EF9F27]/10 flex items-center justify-center text-[#EF9F27] text-[11px] font-bold">{i + 1}</div>
                    <span className="text-[#F5F5F5] text-sm">{appMap[app.app_id]?.name || app.app_id}</span>
                  </div>
                  <span className="text-[#888] text-sm">{app.sub_count} abonnés</span>
                </div>
              )) : <p className="text-[#888] text-sm">Aucune donnée</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickLink to="/admin/clients" icon={Users} label="Utilisateurs" desc="Comptes & rôles" color="bg-blue-500/10 text-blue-400" />
            <QuickLink to="/admin/subscriptions" icon={Repeat} label="Abonnements" desc="Actifs, essais" color="bg-emerald-500/10 text-emerald-400" />
            <QuickLink to="/admin/licences" icon={KeyRound} label="Licences" desc="Clés & sièges" color="bg-amber-500/10 text-amber-400" />
            <QuickLink to="/admin/tickets" icon={MessageSquare} label="Support" desc="Tickets clients" color="bg-purple-500/10 text-purple-400" />
          </div>
        </>
      )}

      {/* ═══ TAB: Opérations ═══ */}
      {tab === "operations" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Churn rate" value={`${churnRate}%`} icon={TrendingDown} trendDown={churnRate > 5} />
            <KpiCard label="Tickets ouverts" value={openTickets} icon={MessageSquare} />
            <KpiCard label="Licences pending" value={licenceCount.pending} icon={KeyRound} />
            <KpiCard label="Abonnements" value={stats?.active_subscriptions || 0} icon={Repeat} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <QuickLink to="/admin/system" icon={Activity} label="Santé système" desc="Monitoring, uptime" color="bg-green-500/10 text-green-400" />
            <QuickLink to="/admin/alerts" icon={Bell} label="Alertes" desc="Anomalies, incidents" color="bg-red-500/10 text-red-400" />
            <QuickLink to="/admin/feature-flags" icon={Flag} label="Feature Flags" desc="Toggles, rollout" color="bg-violet-500/10 text-violet-400" />
            <QuickLink to="/admin/deployments" icon={Rocket} label="Déploiements" desc="Versions, releases" color="bg-sky-500/10 text-sky-400" />
            <QuickLink to="/admin/roles" icon={ShieldCheck} label="Rôles & Permissions" desc="RBAC, accès" color="bg-indigo-500/10 text-indigo-400" />
            <QuickLink to="/admin/activity" icon={ClipboardList} label="Logs & Audit" desc="Événements, historique" color="bg-slate-500/10 text-slate-400" />
            <QuickLink to="/admin/analytics" icon={BarChart3} label="Analytics" desc="Revenus, tendances" color="bg-cyan-500/10 text-cyan-400" />
            <QuickLink to="/admin/settings" icon={Settings} label="Paramètres" desc="Configuration système" color="bg-gray-500/10 text-gray-400" />
          </div>
        </>
      )}

      {/* ═══ TAB: Contenu & Marketing ═══ */}
      {tab === "content" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickLink to="/admin/content" icon={FileText} label="Landing Page" desc="Contenu, images, couleurs" color="bg-pink-500/10 text-pink-400" />
          <QuickLink to="/admin/newsletter" icon={Mail} label="Newsletter" desc="Éditeur, campagnes" color="bg-orange-500/10 text-orange-400" />
          <QuickLink to="/admin/campaigns" icon={Send} label="Campagnes" desc="Email marketing" color="bg-teal-500/10 text-teal-400" />
          <QuickLink to="/admin/emails" icon={Mail} label="Templates Email" desc="Modèles transactionnels" color="bg-blue-500/10 text-blue-400" />
          <QuickLink to="/admin/knowledge-base" icon={BookOpen} label="Base de connaissances" desc="Articles, FAQ" color="bg-lime-500/10 text-lime-400" />
          <QuickLink to="/admin/apps" icon={CreditCard} label="Grille Tarifaire" desc="Apps, plans, pricing" color="bg-amber-500/10 text-amber-400" />
        </div>
      )}
    </div>
  );
}
