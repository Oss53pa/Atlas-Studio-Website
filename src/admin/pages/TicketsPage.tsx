import { useState, useEffect } from "react";
import { Loader2, Check, Send } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import type { Ticket, TicketMessage } from "../../lib/database.types";

interface TicketWithProfile extends Ticket {
  profiles?: { full_name: string; email: string } | null;
}

const statusOptions = ["open", "in_progress", "resolved", "closed"] as const;

export default function TicketsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  // Detail modal
  const [activeTicket, setActiveTicket] = useState<TicketWithProfile | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    setTickets(data as TicketWithProfile[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, []);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);

  const updateStatus = async (ticket: TicketWithProfile, status: string) => {
    await supabase.from("tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", ticket.id);
    fetchTickets();
    if (activeTicket?.id === ticket.id) setActiveTicket({ ...activeTicket, status: status as any });
    showToast(`Ticket ${status === "resolved" ? "résolu" : status === "closed" ? "fermé" : "mis à jour"}`);
  };

  const openTicket = async (ticket: TicketWithProfile) => {
    setActiveTicket(ticket);
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data as TicketMessage[] || []);
  };

  const handleReply = async () => {
    if (!user || !activeTicket || !reply.trim()) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({
      ticket_id: activeTicket.id,
      user_id: user.id,
      message: reply,
      is_admin: true,
    });
    // Auto-update status to in_progress if open
    if (activeTicket.status === "open") {
      await supabase.from("tickets").update({ status: "in_progress", updated_at: new Date().toISOString() }).eq("id", activeTicket.id);
      fetchTickets();
    }
    setReply("");
    setSending(false);
    openTicket(activeTicket);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Tickets Support</h1>
      <p className="text-neutral-muted text-sm mb-7">{tickets.length} tickets</p>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { label: "Tous", value: "all" },
          { label: "Ouverts", value: "open" },
          { label: "En cours", value: "in_progress" },
          { label: "Résolus", value: "resolved" },
          { label: "Fermés", value: "closed" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              filter === f.value ? "bg-gold text-onyx" : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[11px] opacity-70">
              {f.value === "all" ? tickets.length : tickets.filter(t => t.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      <AdminTable
        keyExtractor={(r: TicketWithProfile) => r.id}
        columns={[
          { key: "subject", label: "Sujet", render: (r: TicketWithProfile) => (
            <span className="font-medium text-neutral-text">{r.subject}</span>
          )},
          { key: "user", label: "Client", render: (r: TicketWithProfile) => (
            <div>
              <span className="text-neutral-text text-[13px]">{r.profiles?.full_name || "—"}</span>
              <div className="text-neutral-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "priority", label: "Priorité", render: (r: TicketWithProfile) => (
            <AdminBadge
              status={r.priority === "high" ? "suspended" : r.priority === "low" ? "expired" : "trial"}
              label={r.priority === "low" ? "Basse" : r.priority === "medium" ? "Moyenne" : "Haute"}
            />
          )},
          { key: "status", label: "Statut", render: (r: TicketWithProfile) => (
            <select
              value={r.status}
              onClick={e => e.stopPropagation()}
              onChange={e => updateStatus(r, e.target.value)}
              className="px-2 py-1 border border-warm-border rounded text-[11px] bg-white outline-none cursor-pointer"
            >
              {statusOptions.map(s => <option key={s} value={s}>{s === "open" ? "Ouvert" : s === "in_progress" ? "En cours" : s === "resolved" ? "Résolu" : "Fermé"}</option>)}
            </select>
          )},
          { key: "created_at", label: "Date", sortable: true, render: (r: TicketWithProfile) => new Date(r.created_at).toLocaleDateString("fr-FR") },
        ]}
        data={filtered}
        onRowClick={openTicket}
      />

      {/* Ticket detail + reply modal */}
      <AdminModal open={!!activeTicket} onClose={() => setActiveTicket(null)} title={activeTicket?.subject || "Ticket"}>
        {activeTicket && (
          <div>
            <div className="text-neutral-muted text-[11px] mb-4">
              {activeTicket.profiles?.full_name} ({activeTicket.profiles?.email}) &middot; {new Date(activeTicket.created_at).toLocaleDateString("fr-FR")}
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {messages.map(m => (
                <div key={m.id} className={`p-3 rounded-xl ${m.is_admin ? "bg-gold/5 border border-gold/10" : "bg-warm-bg border border-warm-border"}`}>
                  <div className="text-[10px] font-semibold text-neutral-muted mb-1">
                    {m.is_admin ? "Vous (Admin)" : activeTicket.profiles?.full_name || "Client"} &middot; {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  <div className="text-neutral-text text-[13px] whitespace-pre-wrap">{m.message}</div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReply()}
                placeholder="Répondre..."
                className="flex-1 px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
              />
              <button onClick={handleReply} disabled={sending || !reply.trim()} className={`btn-gold !py-3 !px-4 ${sending || !reply.trim() ? "opacity-50" : ""}`}>
                <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
