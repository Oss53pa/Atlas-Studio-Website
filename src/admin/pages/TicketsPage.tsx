import { useState, useEffect } from "react";
import { Search, Send, Download, Clock, MessageSquare } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { useToast } from "../contexts/ToastContext";
import { useAppFilter } from "../contexts/AppFilterContext";
import { exportToCSV } from "../../lib/csvExport";
import type { Ticket, TicketMessage } from "../../lib/database.types";

interface TicketWithProfile extends Ticket {
  profiles?: { full_name: string; email: string } | null;
}

const statusOptions = ["open", "in_progress", "resolved", "closed"] as const;
const STATUS_LABELS: Record<string, string> = { open: "Ouvert", in_progress: "En cours", resolved: "Résolu", closed: "Fermé" };

function timeAgo(date: string): { text: string; color: string } {
  const ms = Date.now() - new Date(date).getTime();
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(hours / 24);
  const text = days > 0 ? `${days}j ${hours % 24}h` : `${hours}h`;
  const color = hours < 24 ? "text-emerald-600 bg-emerald-50" : hours < 48 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  return { text, color };
}

export default function TicketsPage() {
  const { user } = useAuth();
  const { success: toastSuccess } = useToast();
  const { selectedApp } = useAppFilter();
  const [tickets, setTickets] = useState<TicketWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [activeTicket, setActiveTicket] = useState<TicketWithProfile | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    const { data } = await supabase.from("tickets").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
    setTickets(data as TicketWithProfile[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  // ─── Filters ───
  const filtered = tickets.filter(t => {
    if (filter !== "all" && t.status !== filter) return false;
    if (selectedApp !== "all" && (t as any).app_id !== selectedApp) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.subject.toLowerCase().includes(q) && !(t.profiles?.full_name || "").toLowerCase().includes(q) && !(t.profiles?.email || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === "open").length,
    in_progress: tickets.filter(t => t.status === "in_progress").length,
    resolved: tickets.filter(t => t.status === "resolved").length,
    closed: tickets.filter(t => t.status === "closed").length,
  };

  // ─── Actions ───
  const updateStatus = async (ticket: TicketWithProfile, status: string) => {
    await supabase.from("tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticket.id);
    fetchTickets();
    if (activeTicket?.id === ticket.id) setActiveTicket({ ...activeTicket, status: status as any });
    toastSuccess(`Ticket ${STATUS_LABELS[status] || status}`);
  };

  const openTicket = async (ticket: TicketWithProfile) => {
    setActiveTicket(ticket);
    const { data } = await supabase.from("ticket_messages").select("*").eq("ticket_id", ticket.id).order("created_at", { ascending: true });
    setMessages(data as TicketMessage[] || []);
  };

  const handleReply = async (andClose = false) => {
    if (!user || !activeTicket || !reply.trim()) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({ ticket_id: activeTicket.id, user_id: user.id, message: reply, is_admin: true });
    const newStatus = andClose ? "closed" : activeTicket.status === "open" ? "in_progress" : activeTicket.status;
    if (newStatus !== activeTicket.status) {
      await supabase.from("tickets").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", activeTicket.id);
    }
    setReply("");
    setSending(false);
    fetchTickets();
    openTicket({ ...activeTicket, status: newStatus as any });
    toastSuccess(andClose ? "Réponse envoyée et ticket fermé" : "Réponse envoyée");
  };

  const bulkClose = async (ids: string[]) => {
    await supabase.from("tickets").update({ status: "closed", updated_at: new Date().toISOString() }).in("id", ids);
    fetchTickets();
    toastSuccess(`${ids.length} ticket(s) fermé(s)`);
  };

  const bulkResolve = async (ids: string[]) => {
    await supabase.from("tickets").update({ status: "resolved", updated_at: new Date().toISOString() }).in("id", ids);
    fetchTickets();
    toastSuccess(`${ids.length} ticket(s) résolu(s)`);
  };

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "subject", label: "Sujet" },
      { key: "client", label: "Client", render: (r: any) => r.profiles?.full_name || "—" },
      { key: "email", label: "Email", render: (r: any) => r.profiles?.email || "—" },
      { key: "priority", label: "Priorité" },
      { key: "status", label: "Statut", render: (r: any) => STATUS_LABELS[r.status] || r.status },
      { key: "created_at", label: "Date", render: (r: any) => new Date(r.created_at).toLocaleDateString("fr-FR") },
    ], "tickets");
    toastSuccess("Export CSV téléchargé");
  };

  // ─── Last admin reply time ───
  const getLastAdminReply = (msgs: TicketMessage[]): string | null => {
    const adminMsgs = msgs.filter(m => m.is_admin);
    return adminMsgs.length > 0 ? adminMsgs[adminMsgs.length - 1].created_at : null;
  };

  const statusFilters = [
    { label: "Tous", value: "all", count: counts.all },
    { label: "Ouverts", value: "open", count: counts.open },
    { label: "En cours", value: "in_progress", count: counts.in_progress },
    { label: "Résolus", value: "resolved", count: counts.resolved },
    { label: "Fermés", value: "closed", count: counts.closed },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-admin-text text-2xl font-bold mb-1">Tickets Support</h1>
          <p className="text-admin-muted text-sm">{tickets.length} tickets — {counts.open + counts.in_progress} en attente</p>
        </div>
        <button onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2.5 border border-admin-surface-alt rounded-lg bg-admin-surface text-admin-text/80 text-[13px] font-medium hover:border-admin-accent/40 transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f.value ? "bg-admin-accent text-onyx" : "bg-admin-surface border border-admin-surface-alt text-admin-text/80 hover:border-admin-accent/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher sujet, client..."
            className="w-full pl-9 pr-4 py-2.5 bg-admin-surface border border-admin-surface-alt rounded-lg text-sm text-admin-text outline-none focus:border-admin-accent transition-colors" />
        </div>
      </div>

      {/* Table */}
      <AdminTable
        keyExtractor={(r: TicketWithProfile) => r.id}
        loading={loading}
        selectable
        bulkActions={[
          { label: "Résoudre", onClick: bulkResolve },
          { label: "Fermer", onClick: bulkClose, variant: "danger" },
        ]}
        emptyMessage="Aucun ticket"
        emptyIcon={<MessageSquare size={32} />}
        onRowClick={openTicket}
        columns={[
          { key: "subject", label: "Sujet", render: (r: TicketWithProfile) => (
            <span className="font-medium text-admin-text">{r.subject}</span>
          )},
          { key: "user", label: "Client", render: (r: TicketWithProfile) => (
            <div>
              <div className="text-admin-text text-[13px]">{r.profiles?.full_name || "—"}</div>
              <div className="text-admin-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "priority", label: "Priorité", render: (r: TicketWithProfile) => (
            <AdminBadge
              status={r.priority === "high" ? "suspended" : r.priority === "low" ? "expired" : "trial"}
              label={r.priority === "low" ? "Basse" : r.priority === "medium" ? "Moyenne" : "Haute"}
            />
          )},
          { key: "sla", label: "Depuis", render: (r: TicketWithProfile) => {
            const t = timeAgo(r.created_at);
            return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${t.color}`}><Clock size={10} />{t.text}</span>;
          }},
          { key: "status", label: "Statut", render: (r: TicketWithProfile) => (
            <select value={r.status} onClick={e => e.stopPropagation()} onChange={e => updateStatus(r, e.target.value)}
              className="px-2 py-1 border border-admin-surface-alt rounded text-[11px] bg-admin-surface outline-none cursor-pointer">
              {statusOptions.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          )},
          { key: "created_at", label: "Date", sortable: true, render: (r: TicketWithProfile) =>
            <span className="text-[12px] text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
          },
        ]}
        data={filtered}
      />

      {/* Detail modal */}
      <AdminModal open={!!activeTicket} onClose={() => setActiveTicket(null)} title={activeTicket?.subject || "Ticket"} size="lg"
        subtitle={activeTicket ? `${activeTicket.profiles?.full_name || "—"} · ${activeTicket.profiles?.email || "—"} · ${new Date(activeTicket.created_at).toLocaleDateString("fr-FR")}` : undefined}
        footer={
          activeTicket && activeTicket.status !== "closed" ? (
            <>
              <button onClick={() => handleReply(false)} disabled={sending || !reply.trim()}
                className={`bg-admin-accent text-black font-semibold rounded-lg hover:bg-admin-accent-dark transition-colors !py-2.5 !px-5 !text-[13px] flex items-center gap-2 ${sending || !reply.trim() ? "opacity-50" : ""}`}>
                <Send size={14} /> Répondre
              </button>
              <button onClick={() => handleReply(true)} disabled={sending || !reply.trim()}
                className={`px-5 py-2.5 border border-admin-surface-alt rounded-lg text-[13px] font-medium text-admin-text/80 hover:border-admin-accent/40 transition-colors ${sending || !reply.trim() ? "opacity-50" : ""}`}>
                Répondre et fermer
              </button>
            </>
          ) : undefined
        }
      >
        {activeTicket && (
          <div className="flex flex-col h-full">
            {/* Messages timeline */}
            <div className="flex-1 space-y-4 overflow-y-auto mb-4 min-h-[300px] max-h-[calc(100vh-380px)]">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.is_admin ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl ${m.is_admin ? "bg-admin-accent/5 border border-gold/10 rounded-br-md" : "bg-admin-surface-alt border border-admin-surface-alt rounded-bl-md"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-admin-muted">
                        {m.is_admin ? "Admin" : activeTicket.profiles?.full_name || "Client"}
                      </span>
                      <span className="text-[10px] text-admin-muted/60">
                        {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="text-admin-text text-[13px] whitespace-pre-wrap leading-relaxed">{m.message}</div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-admin-muted text-sm py-8">Aucun message</div>
              )}
            </div>

            {/* Reply textarea */}
            {activeTicket.status !== "closed" && (
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleReply(); }}
                placeholder="Répondre... (Ctrl+Enter pour envoyer)"
                rows={3}
                className="w-full px-4 py-3 bg-admin-surface-alt border border-admin-surface-alt rounded-lg text-admin-text text-sm outline-none focus:border-admin-accent transition-colors resize-y"
              />
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
