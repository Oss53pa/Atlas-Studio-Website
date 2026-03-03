import { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import type { ActivityLog } from "../../lib/database.types";

const ACTION_LABELS: Record<string, string> = {
  subscription_created: "Abonnement créé",
  payment_completed: "Paiement reçu",
  payment_failed: "Paiement échoué",
  admin_create_client: "Client créé (admin)",
  admin_delete_client: "Client supprimé (admin)",
  account_deleted: "Compte supprimé",
};

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchLogs = async () => {
    let query = supabase
      .from("activity_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (actionFilter !== "all") query = query.eq("action", actionFilter);

    const { data } = await query;
    setLogs(data as ActivityLog[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter]);

  const filtered = search
    ? logs.filter(l => l.action.includes(search) || JSON.stringify(l.metadata).toLowerCase().includes(search.toLowerCase()))
    : logs;

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Journal d'activité</h1>
      <p className="text-neutral-muted text-sm mb-7">Historique des actions sur la plateforme</p>

      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-placeholder" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
          />
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(0); }}
          className="px-4 py-3 bg-white border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
        >
          <option value="all">Toutes les actions</option>
          {uniqueActions.map(a => <option key={a} value={a}>{ACTION_LABELS[a] || a}</option>)}
        </select>
      </div>

      <AdminTable
        keyExtractor={(r: ActivityLog) => r.id}
        columns={[
          { key: "created_at", label: "Date", sortable: true, render: (r: ActivityLog) =>
            new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
          },
          { key: "action", label: "Action", render: (r: ActivityLog) => (
            <span className="text-neutral-text font-medium">{ACTION_LABELS[r.action] || r.action}</span>
          )},
          { key: "user_id", label: "Utilisateur", render: (r: ActivityLog) => (
            <span className="text-neutral-muted text-[11px] font-mono">{r.user_id?.slice(0, 8) || "—"}</span>
          )},
          { key: "metadata", label: "Détails", render: (r: ActivityLog) => (
            <span className="text-neutral-muted text-[11px]">
              {Object.entries(r.metadata || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "—"}
            </span>
          )},
        ]}
        data={filtered}
      />

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage(p => Math.max(0, p - 1))}
          disabled={page === 0}
          className="px-4 py-2 border border-warm-border rounded-lg text-sm text-neutral-body disabled:opacity-30"
        >
          Précédent
        </button>
        <span className="text-neutral-muted text-sm">Page {page + 1}</span>
        <button
          onClick={() => setPage(p => p + 1)}
          disabled={logs.length < pageSize}
          className="px-4 py-2 border border-warm-border rounded-lg text-sm text-neutral-body disabled:opacity-30"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
