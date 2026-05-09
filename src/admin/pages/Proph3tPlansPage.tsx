import { useState, useEffect } from "react";
import { MessageSquare, Trash2, RefreshCw, ThumbsUp, ThumbsDown, Edit3, Bell } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilterPills } from "../components/AdminFilterPills";
import { AdminButton } from "../components/AdminButton";
import { AdminModal } from "../components/AdminModal";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

// Cette page remplace l'ancienne "Plans agents" (v1) par une vue "Activité PROPH3T v2".
// L'orchestrateur ReAct n'écrit plus de plans persistés (déplacé inline dans proph3t-ask),
// donc cette page expose désormais 2 vues : conversations récentes et alertes proactives.

type Tab = "conversations" | "alerts";

interface Conversation {
  id: string;
  user_id: string;
  product: string;
  society_id: string | null;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
  message_count: number;
  total_tokens: number;
}

interface Alert {
  id: string;
  society_id: string;
  product: string;
  severity: "P0" | "P1" | "P2";
  alert_type: string;
  title: string;
  message: string;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

interface MessageWithFb {
  id: string;
  role: string;
  content: string;
  citations: unknown;
  confidence_score: number | null;
  latency_ms: number | null;
  created_at: string;
  feedback: { rating: string; correction_text: string | null }[];
}

const SEVERITY_COLORS: Record<string, string> = {
  P0: "bg-red-500/20 text-red-400 border-red-500/30",
  P1: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  P2: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

export default function Proph3tPlansPage() {
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("conversations");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailConv, setDetailConv] = useState<Conversation | null>(null);
  const [convMessages, setConvMessages] = useState<MessageWithFb[]>([]);

  const fetchAll = async () => {
    setLoading(true);
    const [convRes, alertsRes] = await Promise.all([
      supabase.from("proph3t_conversations").select("*").order("started_at", { ascending: false }).limit(200),
      supabase.from("proph3t_alerts").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setConversations((convRes.data as unknown as Conversation[]) || []);
    setAlerts((alertsRes.data as unknown as Alert[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const openDetail = async (conv: Conversation) => {
    setDetailConv(conv);
    const { data } = await supabase
      .from("proph3t_messages")
      .select("id, role, content, citations, confidence_score, latency_ms, created_at, feedback:proph3t_feedback(rating, correction_text)")
      .eq("conversation_id", conv.id)
      .order("created_at");
    setConvMessages((data as MessageWithFb[]) || []);
  };

  const ackAlert = async (a: Alert) => {
    const { error } = await supabase.from("proph3t_alerts").update({
      acknowledged: true, acknowledged_at: new Date().toISOString(),
    }).eq("id", a.id);
    if (error) showError(formatSupabaseError(error));
    else { success("Alerte accusée"); fetchAll(); }
  };

  const resolveAlert = async (a: Alert) => {
    const { error } = await supabase.from("proph3t_alerts").update({
      resolved: true, resolved_at: new Date().toISOString(),
    }).eq("id", a.id);
    if (error) showError(formatSupabaseError(error));
    else { success("Alerte résolue"); fetchAll(); }
  };

  const filteredConv = conversations.filter(c => !search || (c.summary || "").toLowerCase().includes(search.toLowerCase()) || c.product.toLowerCase().includes(search.toLowerCase()));
  const filteredAlerts = alerts.filter(a => {
    if (statusFilter === "open" && (a.acknowledged || a.resolved)) return false;
    if (statusFilter === "ack" && !a.acknowledged) return false;
    if (statusFilter === "resolved" && !a.resolved) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !a.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const tabs = [
    { id: "conversations", label: "Conversations", count: conversations.length, icon: MessageSquare },
    { id: "alerts", label: "Alertes proactives", count: alerts.filter(a => !a.resolved).length, icon: Bell },
  ];

  return (
    <div>
      <AdminPageHeader title="Activité PROPH3T" subtitle="Conversations utilisateurs et alertes proactives générées par le monitoring continu">
        <AdminButton icon={RefreshCw} variant="secondary" onClick={fetchAll}>Rafraîchir</AdminButton>
      </AdminPageHeader>

      <AdminFilterPills
        filters={tabs.map(t => ({ label: t.label, value: t.id, count: t.count }))}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      <div className="flex items-center gap-4 mb-6 mt-4 flex-wrap">
        {tab === "alerts" && (
          <AdminFilterPills
            filters={[
              { label: "Toutes", value: "all", count: alerts.length },
              { label: "Ouvertes", value: "open", count: alerts.filter(a => !a.acknowledged && !a.resolved).length },
              { label: "Accusées", value: "ack", count: alerts.filter(a => a.acknowledged && !a.resolved).length },
              { label: "Résolues", value: "resolved", count: alerts.filter(a => a.resolved).length },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        )}
        <AdminSearch value={search} onChange={setSearch} placeholder={`Rechercher dans ${tab === "conversations" ? "les conversations" : "les alertes"}…`} />
      </div>

      {tab === "conversations" && (
        <AdminTable
          keyExtractor={(r: Conversation) => r.id}
          loading={loading}
          emptyMessage="Aucune conversation"
          emptyIcon={<MessageSquare size={32} />}
          onRowClick={openDetail}
          columns={[
            { key: "product", label: "Produit", render: (r: Conversation) => (
              <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-400">{r.product}</span>
            )},
            { key: "summary", label: "Résumé", render: (r: Conversation) => (
              <div className="text-neutral-text dark:text-admin-text text-[13px] truncate max-w-[400px]">{r.summary || <span className="text-neutral-muted dark:text-admin-muted italic">— en cours —</span>}</div>
            )},
            { key: "message_count", label: "Messages", render: (r: Conversation) => <span className="font-mono text-[13px]">{r.message_count}</span> },
            { key: "total_tokens", label: "Tokens", render: (r: Conversation) => <span className="font-mono text-[12px] text-neutral-muted dark:text-admin-muted">{r.total_tokens || 0}</span> },
            { key: "started_at", label: "Démarrée", sortable: true, render: (r: Conversation) => (
              <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.started_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            )},
          ]}
          data={filteredConv}
        />
      )}

      {tab === "alerts" && (
        <AdminTable
          keyExtractor={(r: Alert) => r.id}
          loading={loading}
          emptyMessage="Aucune alerte"
          emptyIcon={<Bell size={32} />}
          columns={[
            { key: "severity", label: "Sévérité", render: (r: Alert) => (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${SEVERITY_COLORS[r.severity]}`}>{r.severity}</span>
            )},
            { key: "title", label: "Alerte", render: (r: Alert) => (
              <div>
                <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium">{r.title}</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px] truncate max-w-[400px]">{r.message}</div>
              </div>
            )},
            { key: "alert_type", label: "Type", render: (r: Alert) => <span className="text-[12px] font-mono">{r.alert_type}</span> },
            { key: "status", label: "Statut", render: (r: Alert) => (
              r.resolved ? <span className="text-emerald-400 text-[11px]">Résolue</span>
              : r.acknowledged ? <span className="text-blue-400 text-[11px]">Accusée</span>
              : <span className="text-amber-400 text-[11px]">Ouverte</span>
            )},
            { key: "created_at", label: "Créée", sortable: true, render: (r: Alert) => (
              <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            )},
            { key: "actions", label: "", render: (r: Alert) => (
              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                {!r.acknowledged && !r.resolved && <button onClick={() => ackAlert(r)} className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors">Accuser</button>}
                {!r.resolved && <button onClick={() => resolveAlert(r)} className="px-2 py-1 rounded text-[11px] font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors">Résoudre</button>}
              </div>
            )},
          ]}
          data={filteredAlerts}
        />
      )}

      {/* Conversation detail */}
      <AdminModal open={!!detailConv} onClose={() => { setDetailConv(null); setConvMessages([]); }} title="Détail conversation" size="xl">
        {detailConv && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-[12px] pb-3 border-b border-warm-border dark:border-admin-surface-alt">
              <div><span className="text-neutral-muted dark:text-admin-muted">Produit:</span> {detailConv.product}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Messages:</span> {detailConv.message_count}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Démarrée:</span> {new Date(detailConv.started_at).toLocaleString("fr-FR")}</div>
            </div>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {convMessages.map(m => (
                <div key={m.id} className={`p-3 rounded-lg ${m.role === "user" ? "bg-blue-500/10 border border-blue-500/20" : m.role === "assistant" ? "bg-warm-bg dark:bg-admin-surface-alt" : "bg-neutral-500/10"}`}>
                  <div className="flex items-center justify-between text-[10px] text-neutral-muted dark:text-admin-muted uppercase font-semibold mb-1">
                    <span>{m.role}</span>
                    <span className="flex items-center gap-2">
                      {m.confidence_score !== null && <span className="font-mono">conf {m.confidence_score}</span>}
                      {m.latency_ms !== null && <span className="font-mono">{m.latency_ms}ms</span>}
                      {(m.feedback || []).map((f, i) => (
                        <span key={i} className="inline-flex items-center">
                          {f.rating === "up" && <ThumbsUp size={10} className="text-emerald-400" />}
                          {f.rating === "down" && <ThumbsDown size={10} className="text-red-400" />}
                          {f.rating === "correction" && <Edit3 size={10} className="text-amber-400" />}
                        </span>
                      ))}
                    </span>
                  </div>
                  <div className="text-[13px] whitespace-pre-wrap">{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminModal>

      <span className="hidden"><Trash2 size={1} /></span>
    </div>
  );
}
