import { useState, useEffect, useRef } from "react";
import { Search, Download, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminModal } from "../components/AdminModal";
import { useToast } from "../contexts/ToastContext";
import { SkeletonTableRow } from "../components/AdminSkeleton";
import type { ActivityLog } from "../../lib/database.types";

/* ─── Action labels & categories ─── */
const ACTION_LABELS: Record<string, string> = {
  subscription_created: "Abonnement créé",
  subscription_cancelled: "Abonnement annulé",
  subscription_suspended: "Abonnement suspendu",
  subscription_reactivated: "Abonnement réactivé",
  invoice_created: "Facture créée",
  invoice_paid: "Facture payée",
  invoice_failed: "Paiement échoué",
  payment_completed: "Paiement reçu",
  payment_failed: "Paiement échoué",
  client_created: "Client créé",
  client_updated: "Client modifié",
  client_suspended: "Client suspendu",
  admin_create_client: "Client créé (admin)",
  admin_delete_client: "Client supprimé (admin)",
  account_deleted: "Compte supprimé",
  password_reset: "Mot de passe réinitialisé",
  test_access_granted: "Accès test accordé",
  login: "Connexion",
  logout: "Déconnexion",
  app_created: "Application créée",
  app_updated: "Application modifiée",
  content_updated: "Contenu mis à jour",
};

type ActionCategory = "success" | "danger" | "warning" | "info";

const ACTION_CATEGORY: Record<string, ActionCategory> = {
  subscription_created: "success", subscription_reactivated: "success",
  invoice_paid: "success", payment_completed: "success",
  client_created: "success", admin_create_client: "success",
  test_access_granted: "success", login: "info", logout: "info",
  app_created: "info", app_updated: "info", content_updated: "info",
  client_updated: "info", password_reset: "warning",
  subscription_suspended: "warning", client_suspended: "warning",
  invoice_failed: "danger", payment_failed: "danger",
  subscription_cancelled: "danger", admin_delete_client: "danger",
  account_deleted: "danger", invoice_created: "info",
};

const CATEGORY_COLORS: Record<ActionCategory, { dot: string; bg: string; text: string }> = {
  success: { dot: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
  danger: { dot: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  warning: { dot: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
  info: { dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
};

const DATE_FILTERS = [
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7" },
  { label: "30 jours", value: "30" },
  { label: "Tout", value: "all" },
];

export default function ActivityLogPage() {
  const { success: toastSuccess } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("30");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [detailLog, setDetailLog] = useState<ActivityLog | null>(null);
  const pageSize = 50;

  // ─── User name cache ───
  const userCache = useRef<Record<string, { name: string; email: string }>>({});
  const [userMap, setUserMap] = useState<Record<string, { name: string; email: string }>>({});

  const fetchUsers = async (userIds: string[]) => {
    const uncached = userIds.filter(id => id && !userCache.current[id]);
    if (uncached.length === 0) return;
    const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", uncached);
    if (data) {
      data.forEach((p: any) => { userCache.current[p.id] = { name: p.full_name || "—", email: p.email || "" }; });
      setUserMap({ ...userCache.current });
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("activity_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (actionFilter !== "all") query = query.eq("action", actionFilter);

    if (dateFilter !== "all") {
      const d = new Date();
      if (dateFilter === "today") { d.setHours(0, 0, 0, 0); }
      else { d.setDate(d.getDate() - Number(dateFilter)); }
      query = query.gte("created_at", d.toISOString());
    }

    const { data, count } = await query;
    const items = (data as ActivityLog[]) || [];
    setLogs(items);
    setTotalCount(count || 0);
    setLoading(false);

    // Fetch user names
    const userIds = [...new Set(items.map(l => l.user_id).filter(Boolean))] as string[];
    fetchUsers(userIds);
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter, dateFilter]);

  const filtered = search
    ? logs.filter(l =>
        (ACTION_LABELS[l.action] || l.action).toLowerCase().includes(search.toLowerCase()) ||
        JSON.stringify(l.metadata).toLowerCase().includes(search.toLowerCase()) ||
        (userMap[l.user_id!]?.name || "").toLowerCase().includes(search.toLowerCase()) ||
        (userMap[l.user_id!]?.email || "").toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  const totalPages = Math.ceil(totalCount / pageSize);

  // ─── Export CSV ───
  const handleExport = () => {
    const rows = filtered.map(l => ({
      date: new Date(l.created_at).toLocaleString("fr-FR"),
      action: ACTION_LABELS[l.action] || l.action,
      user: userMap[l.user_id!]?.name || l.user_id || "Système",
      email: userMap[l.user_id!]?.email || "",
      metadata: JSON.stringify(l.metadata || {}),
    }));
    const csvHeader = "Date,Action,Utilisateur,Email,Metadata\n";
    const csvBody = rows.map(r => `"${r.date}","${r.action}","${r.user}","${r.email}","${r.metadata.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob(["\uFEFF" + csvHeader + csvBody], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "activity-log.csv"; a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Export CSV téléchargé");
  };

  const getActionBadge = (action: string) => {
    const cat = ACTION_CATEGORY[action] || "info";
    const colors = CATEGORY_COLORS[cat];
    const label = ACTION_LABELS[action] || action;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colors.bg} ${colors.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
        {label}
      </span>
    );
  };

  const getUserDisplay = (userId: string | null) => {
    if (!userId) return <span className="text-admin-muted text-[12px]">Système</span>;
    const user = userMap[userId];
    if (!user) return <span className="text-admin-muted text-[11px] font-mono">{userId.slice(0, 8)}...</span>;
    return (
      <div>
        <div className="text-admin-text text-[13px] font-medium">{user.name}</div>
        <div className="text-admin-muted text-[11px]">{user.email}</div>
      </div>
    );
  };

  // ─── All known action types for filter ───
  const allActions = Object.entries(ACTION_LABELS).sort((a, b) => a[1].localeCompare(b[1]));

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-admin-text text-2xl font-bold mb-1">Journal d'activité</h1>
          <p className="text-admin-muted text-sm">Historique des actions sur la plateforme — {totalCount} événements</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 border border-admin-surface-alt rounded-lg bg-admin-surface text-admin-text/80 text-[13px] font-medium hover:border-admin-accent/40 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2.5 bg-admin-surface border border-admin-surface-alt rounded-lg text-sm text-admin-text outline-none focus:border-admin-accent transition-colors" />
        </div>
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted pointer-events-none" />
          <select value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(0); }}
            className="pl-9 pr-4 py-2.5 bg-admin-surface border border-admin-surface-alt rounded-lg text-sm text-admin-text outline-none focus:border-admin-accent transition-colors appearance-none cursor-pointer">
            {DATE_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
          className="px-4 py-2.5 bg-admin-surface border border-admin-surface-alt rounded-lg text-sm text-admin-text outline-none focus:border-admin-accent transition-colors appearance-none cursor-pointer">
          <option value="all">Toutes les actions</option>
          {allActions.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-admin-surface border border-admin-surface-alt rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-admin-surface-alt bg-admin-surface-alt/30">
                <th className="text-admin-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left">Date</th>
                <th className="text-admin-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left">Action</th>
                <th className="text-admin-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left">Utilisateur</th>
                <th className="text-admin-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left">Détails</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonTableRow key={i} cols={4} />)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-admin-muted text-sm">Aucun événement</td></tr>
              ) : filtered.map(log => (
                <tr key={log.id} onClick={() => setDetailLog(log)}
                  className="border-b border-warm-bg last:border-b-0 hover:bg-admin-surface-alt/50 transition-colors cursor-pointer">
                  <td className="p-4 text-admin-text/80 text-[13px] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-4">{getActionBadge(log.action)}</td>
                  <td className="p-4">{getUserDisplay(log.user_id)}</td>
                  <td className="p-4 text-admin-muted text-[11px] max-w-[300px] truncate">
                    {Object.entries(log.metadata || {}).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(" · ") || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-admin-surface-alt">
          <span className="text-admin-muted text-[12px]">
            {totalCount === 0 ? "0 résultats" : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, totalCount)} sur ${totalCount}`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-1.5 rounded hover:bg-admin-surface-alt disabled:opacity-30 transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-[12px] text-admin-muted px-2">{page + 1} / {Math.max(totalPages, 1)}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              className="p-1.5 rounded hover:bg-admin-surface-alt disabled:opacity-30 transition-colors"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      <AdminModal open={!!detailLog} onClose={() => setDetailLog(null)} title="Détail de l'événement" size="md">
        {detailLog && (
          <div className="space-y-5">
            <div>
              <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Date</div>
              <div className="text-admin-text text-sm">
                {new Date(detailLog.created_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "medium" })}
              </div>
            </div>
            <div>
              <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Action</div>
              {getActionBadge(detailLog.action)}
            </div>
            <div>
              <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Utilisateur</div>
              {getUserDisplay(detailLog.user_id)}
              {detailLog.user_id && (
                <div className="text-admin-muted text-[10px] font-mono mt-1">{detailLog.user_id}</div>
              )}
            </div>
            <div>
              <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Metadata</div>
              <pre className="bg-admin-surface-alt rounded-lg p-4 text-[12px] text-admin-text font-mono overflow-auto max-h-[300px] whitespace-pre-wrap">
                {JSON.stringify(detailLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
