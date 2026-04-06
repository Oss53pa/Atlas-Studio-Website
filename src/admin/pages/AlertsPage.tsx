import { useState, useEffect } from "react";
import { Bell, CheckCircle2, Search, Filter, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { useToast } from "../contexts/ToastContext";

interface Alert {
  id: string;
  type: string;
  severity: string;
  title: string;
  message: string | null;
  metadata: Record<string, any>;
  read_at: string | null;
  resolved_at: string | null;
  auto_resolved: boolean;
  created_at: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  low: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const TYPE_LABELS: Record<string, string> = {
  trial_expiring: "Essais expirants",
  payment_overdue: "Impayés",
  sla_risk: "SLA en danger",
  payment_failure_spike: "Échecs paiement",
  churn_spike: "Pic d'annulations",
  churn_risk: "Risque churn",
  mrr_anomaly: "Anomalie MRR",
  api_errors: "Erreurs API",
};

export default function AlertsPage() {
  const { success } = useToast();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detailAlert, setDetailAlert] = useState<Alert | null>(null);

  const fetchAlerts = async () => {
    const { data } = await supabase.from("alerts").select("*").order("created_at", { ascending: false });
    setAlerts(data as Alert[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, []);

  const filtered = alerts.filter(a => {
    if (filter === "active" && a.resolved_at) return false;
    if (filter === "resolved" && !a.resolved_at) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = alerts.filter(a => !a.resolved_at).length;
  const criticalCount = alerts.filter(a => !a.resolved_at && a.severity === "critical").length;

  const resolveAlert = async (alert: Alert) => {
    await supabase.from("alerts").update({ resolved_at: new Date().toISOString() }).eq("id", alert.id);
    fetchAlerts();
    success("Alerte résolue");
  };

  const bulkResolve = async (ids: string[]) => {
    await supabase.from("alerts").update({ resolved_at: new Date().toISOString() }).in("id", ids);
    fetchAlerts();
    success(`${ids.length} alerte(s) résolue(s)`);
  };

  const markRead = async (alert: Alert) => {
    if (!alert.read_at) {
      await supabase.from("alerts").update({ read_at: new Date().toISOString() }).eq("id", alert.id);
      fetchAlerts();
    }
    setDetailAlert(alert);
  };

  const statusFilters = [
    { label: "Toutes", value: "all" as const, count: alerts.length },
    { label: "Actives", value: "active" as const, count: activeCount },
    { label: "Résolues", value: "resolved" as const, count: alerts.length - activeCount },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Alertes</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">
            {activeCount} active{activeCount > 1 ? "s" : ""} {criticalCount > 0 && <span className="text-red-500">— {criticalCount} critique{criticalCount > 1 ? "s" : ""}</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f.value ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] text-neutral-text dark:text-admin-text outline-none cursor-pointer">
          <option value="all">Toutes sévérités</option>
          <option value="critical">Critique</option>
          <option value="high">Haute</option>
          <option value="medium">Moyenne</option>
          <option value="low">Basse</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
        </div>
      </div>

      <AdminTable
        keyExtractor={(r: Alert) => r.id}
        loading={loading}
        selectable
        bulkActions={[{ label: "Résoudre", onClick: bulkResolve }]}
        emptyMessage="Aucune alerte"
        emptyIcon={<Bell size={32} />}
        onRowClick={markRead}
        columns={[
          { key: "severity", label: "Sévérité", render: (r: Alert) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${SEVERITY_COLORS[r.severity] || SEVERITY_COLORS.low}`}>
              {r.severity}
            </span>
          )},
          { key: "title", label: "Alerte", render: (r: Alert) => (
            <div className="flex items-center gap-2">
              {!r.read_at && !r.resolved_at && <span className="w-2 h-2 rounded-full bg-gold dark:bg-admin-accent flex-shrink-0" />}
              <div>
                <div className={`text-[13px] ${r.resolved_at ? "text-neutral-muted dark:text-admin-muted line-through" : "text-neutral-text dark:text-admin-text font-medium"}`}>{r.title}</div>
                <div className="text-[11px] text-neutral-muted dark:text-admin-muted">{TYPE_LABELS[r.type] || r.type}</div>
              </div>
            </div>
          )},
          { key: "created_at", label: "Date", sortable: true, render: (r: Alert) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          )},
          { key: "status", label: "Statut", render: (r: Alert) => (
            r.resolved_at
              ? <span className="inline-flex items-center gap-1 text-[11px] text-green-600 dark:text-green-400"><CheckCircle2 size={12} /> Résolue</span>
              : <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">Active</span>
          )},
          { key: "actions", label: "", render: (r: Alert) => (
            !r.resolved_at ? (
              <button onClick={e => { e.stopPropagation(); resolveAlert(r); }}
                className="px-2.5 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">
                Résoudre
              </button>
            ) : null
          )},
        ]}
        data={filtered}
      />

      {/* Detail modal */}
      <AdminModal open={!!detailAlert} onClose={() => setDetailAlert(null)} title="Détail de l'alerte" size="md">
        {detailAlert && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold uppercase border ${SEVERITY_COLORS[detailAlert.severity] || SEVERITY_COLORS.low}`}>
                {detailAlert.severity}
              </span>
              <span className="text-neutral-muted dark:text-admin-muted text-[12px]">{TYPE_LABELS[detailAlert.type] || detailAlert.type}</span>
            </div>
            <div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Titre</div>
              <div className="text-neutral-text dark:text-admin-text text-sm">{detailAlert.title}</div>
            </div>
            {detailAlert.message && (
              <div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Message</div>
                <div className="text-neutral-text dark:text-admin-text text-sm">{detailAlert.message}</div>
              </div>
            )}
            <div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Date</div>
              <div className="text-neutral-text dark:text-admin-text text-sm">{new Date(detailAlert.created_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "medium" })}</div>
            </div>
            {detailAlert.metadata && Object.keys(detailAlert.metadata).length > 0 && (
              <div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Metadata</div>
                <pre className="bg-warm-bg dark:bg-admin-surface-alt rounded-lg p-4 text-[12px] text-neutral-text dark:text-admin-text font-mono overflow-auto max-h-[200px] whitespace-pre-wrap">
                  {JSON.stringify(detailAlert.metadata, null, 2)}
                </pre>
              </div>
            )}
            {!detailAlert.resolved_at && (
              <button onClick={() => { resolveAlert(detailAlert); setDetailAlert(null); }}
                className="w-full bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center justify-center gap-2">
                <CheckCircle2 size={14} /> Marquer comme résolue
              </button>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
