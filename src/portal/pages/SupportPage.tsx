import { useState, useEffect } from "react";
import { Plus, Send, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Ticket, TicketMessage } from "../../lib/database.types";

interface SupportPageProps {
  userId: string | undefined;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Ouvert", color: "bg-blue-50 text-blue-600 border-blue-200" },
  in_progress: { label: "En cours", color: "bg-amber-50 text-amber-600 border-amber-200" },
  resolved: { label: "Résolu", color: "bg-green-50 text-green-600 border-green-200" },
  closed: { label: "Fermé", color: "bg-neutral-100 text-neutral-500 border-neutral-200" },
};

export function SupportPage({ userId }: SupportPageProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");
  const [creating, setCreating] = useState(false);

  // Conversation view
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setTickets(data as Ticket[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [userId]);

  const handleCreate = async () => {
    if (!userId || !subject || !message) return;
    setCreating(true);
    const { data: ticket } = await supabase
      .from("tickets")
      .insert({ user_id: userId, subject, priority: priority as any })
      .select()
      .single();

    if (ticket) {
      await supabase.from("ticket_messages").insert({
        ticket_id: ticket.id,
        user_id: userId,
        message,
        is_admin: false,
      });
    }
    setSubject("");
    setMessage("");
    setShowNew(false);
    setCreating(false);
    fetchTickets();
  };

  const openTicket = async (ticket: Ticket) => {
    setActiveTicket(ticket);
    const { data } = await supabase
      .from("ticket_messages")
      .select("*")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });
    setMessages(data as TicketMessage[] || []);
  };

  const handleReply = async () => {
    if (!userId || !activeTicket || !reply.trim()) return;
    setSending(true);
    await supabase.from("ticket_messages").insert({
      ticket_id: activeTicket.id,
      user_id: userId,
      message: reply,
      is_admin: false,
    });
    setReply("");
    setSending(false);
    openTicket(activeTicket);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  // Conversation view
  if (activeTicket) {
    const status = statusLabels[activeTicket.status] || statusLabels.open;
    return (
      <div>
        <button onClick={() => setActiveTicket(null)} className="flex items-center gap-2 text-neutral-muted text-sm mb-4 hover:text-gold transition-colors">
          <ArrowLeft size={14} /> Retour aux tickets
        </button>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-neutral-text text-xl font-bold">{activeTicket.subject}</h1>
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.color}`}>{status.label}</span>
        </div>

        <div className="bg-white border border-warm-border rounded-2xl p-6 mb-4 space-y-4 max-h-[500px] overflow-y-auto">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.is_admin ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] p-4 rounded-2xl ${m.is_admin ? "bg-warm-bg border border-warm-border" : "bg-gold/10 border border-gold/20"}`}>
                <div className="text-[11px] font-semibold mb-1 text-neutral-muted">
                  {m.is_admin ? "Support Atlas" : "Vous"} &middot; {new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="text-neutral-text text-[13px] whitespace-pre-wrap">{m.message}</div>
              </div>
            </div>
          ))}
        </div>

        {activeTicket.status !== "closed" && (
          <div className="flex gap-3">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleReply()}
              placeholder="Écrire une réponse..."
              className="flex-1 px-4 py-3 bg-white border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
            />
            <button onClick={handleReply} disabled={sending || !reply.trim()} className={`btn-gold !py-3 !px-5 ${sending || !reply.trim() ? "opacity-50" : ""}`}>
              <Send size={16} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Support</h1>
          <p className="text-neutral-muted text-sm">Besoin d'aide ? Ouvrez un ticket.</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-gold !py-2.5 !text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouveau ticket
        </button>
      </div>

      {/* New ticket form */}
      {showNew && (
        <div className="bg-white border border-warm-border rounded-2xl p-6 mb-6">
          <h3 className="text-neutral-text text-base font-bold mb-4">Nouveau ticket</h3>
          <div className="space-y-3">
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Sujet du ticket"
              className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
            />
            <div className="flex gap-2">
              {["low", "medium", "high"].map(p => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    priority === p ? "border-gold bg-gold/10 text-gold" : "border-warm-border text-neutral-muted"
                  }`}
                >
                  {p === "low" ? "Basse" : p === "medium" ? "Moyenne" : "Haute"}
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Décrivez votre problème en détail..."
              rows={4}
              className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors resize-y"
            />
            <div className="flex gap-3">
              <button onClick={handleCreate} disabled={creating || !subject || !message} className={`btn-gold !py-2.5 !text-[13px] ${creating || !subject || !message ? "opacity-50" : ""}`}>
                {creating ? "Envoi..." : "Créer le ticket"}
              </button>
              <button onClick={() => setShowNew(false)} className="px-5 py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] hover:bg-warm-bg transition-colors">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tickets list */}
      {tickets.length === 0 ? (
        <div className="bg-white border border-warm-border rounded-2xl p-12 text-center">
          <p className="text-neutral-muted text-sm">Aucun ticket. Tout va bien !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => {
            const status = statusLabels[t.status] || statusLabels.open;
            return (
              <div
                key={t.id}
                onClick={() => openTicket(t)}
                className="bg-white border border-warm-border rounded-2xl p-5 cursor-pointer card-hover flex items-center justify-between"
              >
                <div>
                  <div className="text-neutral-text text-sm font-semibold">{t.subject}</div>
                  <div className="text-neutral-muted text-[11px] mt-1">
                    {new Date(t.created_at).toLocaleDateString("fr-FR")} &middot; Priorité {t.priority === "low" ? "basse" : t.priority === "medium" ? "moyenne" : "haute"}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.color}`}>{status.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
