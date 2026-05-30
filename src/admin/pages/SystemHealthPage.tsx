import { useState, useEffect } from "react";
import { RefreshCw, Download, Database, Shield, HardDrive, Zap, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { PremiumBarChart, RadialGauge } from "../../components/ui/charts/PremiumCharts";
import { supabase } from "../../lib/supabase";
import { AdminCard } from "../components/AdminCard";
import { useToast } from "../contexts/ToastContext";

interface ServiceStatus {
  name: string;
  icon: React.ReactNode;
  status: "ok" | "degraded" | "down";
  responseTime: number;
  description: string;
}

interface UptimeDay {
  label: string;
  rate: number;
  total: number;
}

const STATUS_COLORS = { ok: "text-emerald-500", degraded: "text-amber-500", down: "text-red-500" };
const STATUS_BG = { ok: "bg-emerald-50 dark:bg-admin-success/15", degraded: "bg-amber-50 dark:bg-admin-warning/15", down: "bg-red-50 dark:bg-admin-error/15" };
const STATUS_LABELS = { ok: "Opérationnel", degraded: "Dégradé", down: "Indisponible" };
const STATUS_ICONS = { ok: <CheckCircle2 size={16} />, degraded: <AlertTriangle size={16} />, down: <XCircle size={16} /> };

export default function SystemHealthPage() {
  const { success: toastSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [uptimeData, setUptimeData] = useState<UptimeDay[]>([]);
  const [metrics, setMetrics] = useState({ profiles: 0, subscriptions: 0, invoices: 0, tickets: 0 });
  const [incidents, setIncidents] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(0);

  const checkServices = async () => {
    setLoading(true);
    const results: ServiceStatus[] = [];

    // Database check
    const dbStart = performance.now();
    try {
      await supabase.from("profiles").select("id", { count: "exact", head: true });
      results.push({ name: "Base de données", icon: <Database size={20} />, status: "ok", responseTime: Math.round(performance.now() - dbStart), description: "PostgreSQL Supabase" });
    } catch {
      results.push({ name: "Base de données", icon: <Database size={20} />, status: "down", responseTime: 0, description: "PostgreSQL Supabase" });
    }

    // Auth check
    const authStart = performance.now();
    try {
      await supabase.auth.getSession();
      results.push({ name: "Authentification", icon: <Shield size={20} />, status: "ok", responseTime: Math.round(performance.now() - authStart), description: "Supabase Auth" });
    } catch {
      results.push({ name: "Authentification", icon: <Shield size={20} />, status: "down", responseTime: 0, description: "Supabase Auth" });
    }

    // Storage check
    const storageStart = performance.now();
    try {
      await supabase.storage.listBuckets();
      results.push({ name: "Stockage", icon: <HardDrive size={20} />, status: "ok", responseTime: Math.round(performance.now() - storageStart), description: "Supabase Storage" });
    } catch {
      results.push({ name: "Stockage", icon: <HardDrive size={20} />, status: "degraded", responseTime: 0, description: "Supabase Storage" });
    }

    // Edge Functions check (ping via a simple call)
    const fnStart = performance.now();
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/`, { method: "OPTIONS" });
      results.push({ name: "Edge Functions", icon: <Zap size={20} />, status: res.ok || res.status === 404 ? "ok" : "degraded", responseTime: Math.round(performance.now() - fnStart), description: "Supabase Functions" });
    } catch {
      results.push({ name: "Edge Functions", icon: <Zap size={20} />, status: "degraded", responseTime: 0, description: "Supabase Functions" });
    }

    setServices(results);

    // Platform metrics
    const [profilesRes, subsRes, invRes, ticketsRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
      supabase.from("tickets").select("id", { count: "exact", head: true }),
    ]);
    setMetrics({
      profiles: profilesRes.count || 0,
      subscriptions: subsRes.count || 0,
      invoices: invRes.count || 0,
      tickets: ticketsRes.count || 0,
    });

    // Uptime data (last 7 days from activity_log)
    const days: UptimeDay[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).toISOString();
      const label = d.toLocaleDateString("fr-FR", { weekday: "short" });

      const { count: total } = await supabase.from("activity_log").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end);
      const { count: errors } = await supabase.from("activity_log").select("id", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end).ilike("action", "%failed%");

      const t = total || 1;
      const e = errors || 0;
      days.push({ label, rate: Math.round(((t - e) / t) * 100), total: t });
    }
    setUptimeData(days);

    // Recent incidents
    const { data: incidentData } = await supabase.from("activity_log").select("*")
      .or("action.ilike.%failed%,action.ilike.%error%")
      .order("created_at", { ascending: false }).limit(5);
    setIncidents(incidentData || []);

    // Health score
    const okCount = results.filter(s => s.status === "ok").length;
    const avgUptime = days.length > 0 ? days.reduce((s, d) => s + d.rate, 0) / days.length : 100;
    setHealthScore(Math.round((okCount / results.length) * 50 + (avgUptime / 100) * 50));

    setLoading(false);
  };

  useEffect(() => { checkServices(); }, []);

  const handleExport = () => {
    const report = { timestamp: new Date().toISOString(), healthScore, services, metrics, uptimeData, incidents };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `system-health-${new Date().toISOString().split("T")[0]}.json`; a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Rapport exporté");
  };

  const healthColor = healthScore >= 90 ? "text-emerald-500" : healthScore >= 70 ? "text-amber-500" : "text-red-500";

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Santé système</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">Monitoring et état des services</p>
        </div>
        <div className="flex gap-2">
          <button onClick={checkServices} className="flex items-center gap-2 px-5 py-2.5 border border-warm-border dark:border-white/10 rounded-full bg-white dark:bg-admin-surface-alt/40 text-neutral-text dark:text-admin-text/80 text-[13px] font-medium shadow-sm dark:shadow-none hover:border-gold/40 dark:hover:border-admin-accent/40 hover:shadow-md transition-all duration-300">
            <RefreshCw size={14} /> Vérifier
          </button>
          <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 border border-warm-border dark:border-white/10 rounded-full bg-white dark:bg-admin-surface-alt/40 text-neutral-text dark:text-admin-text/80 text-[13px] font-medium shadow-sm dark:shadow-none hover:border-gold/40 dark:hover:border-admin-accent/40 hover:shadow-md transition-all duration-300">
            <Download size={14} /> Exporter
          </button>
        </div>
      </div>

      {/* Health score + Services */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8">
        <div className="lg:col-span-1 bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center shadow-sm dark:shadow-premium">
          <div className="mb-3">
            <RadialGauge
              value={healthScore}
              max={100}
              size={96}
              thickness={9}
              accent={healthScore >= 90 ? "#A9B57E" : healthScore >= 70 ? "#8E9A63" : "#C0635C"}
              display={String(healthScore)}
            />
          </div>
          <div className="text-neutral-text dark:text-admin-text text-sm font-semibold">Score global</div>
          <div className={`text-[12px] font-medium ${healthColor}`}>
            {healthScore >= 90 ? "Excellent" : healthScore >= 70 ? "Correct" : "Dégradé"}
          </div>
        </div>

        {services.map(s => (
          <div key={s.name} className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-5 shadow-sm dark:shadow-premium">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${STATUS_BG[s.status]} ${STATUS_COLORS[s.status]}`}>
                {s.icon}
              </div>
              <div>
                <div className="text-neutral-text dark:text-admin-text text-sm font-medium">{s.name}</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{s.description}</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${STATUS_COLORS[s.status]}`}>
                {STATUS_ICONS[s.status]} {STATUS_LABELS[s.status]}
              </span>
              {s.responseTime > 0 && (
                <span className="text-neutral-muted dark:text-admin-muted text-[11px] font-mono">{s.responseTime}ms</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminCard label="Profils" value={metrics.profiles} icon={Database} />
        <AdminCard label="Abonnements" value={metrics.subscriptions} icon={Shield} />
        <AdminCard label="Factures" value={metrics.invoices} icon={HardDrive} />
        <AdminCard label="Tickets" value={metrics.tickets} icon={Zap} />
      </div>

      {/* Uptime chart + Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-premium">
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-5">Uptime (7 derniers jours)</h2>
          <PremiumBarChart data={uptimeData.map(d => ({ label: d.label, value: d.rate }))} height={180} unit="%" valueFormatter={(n) => String(n)} />
        </div>

        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-premium">
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">Incidents récents</h2>
          {incidents.length === 0 ? (
            <div className="flex items-center gap-3 py-6 justify-center">
              <CheckCircle2 size={20} className="text-emerald-500" />
              <span className="text-neutral-muted dark:text-admin-muted text-sm">Aucun incident récent</span>
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map(inc => (
                <div key={inc.id} className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-admin-error/10 border border-red-100 dark:border-admin-error/20 rounded-xl">
                  <XCircle size={14} className="text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-red-700 dark:text-red-300 text-[13px] font-medium">{inc.action.replace(/_/g, " ")}</div>
                    <div className="text-red-600 dark:text-red-400/80 text-[11px]">{new Date(inc.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
