import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, X, Bot, User, Zap } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  model_used?: string;
  citations?: { tool: string; hits: unknown }[];
  confidence?: number;
  message_id?: string;
  created_at: string;
}

const QUICK_COMMANDS = [
  { label: "Rapport du jour", prompt: "Donne-moi le rapport complet du jour : MRR, nouveaux clients, tickets ouverts et alertes actives." },
  { label: "Tenants à risque", prompt: "Liste tous les clients avec un score santé faible et explique les risques." },
  { label: "Impayés", prompt: "Quelles sont toutes les factures en retard ? Donne le total et les actions recommandées." },
  { label: "Tickets urgents", prompt: "Montre-moi tous les tickets critiques et haute priorité non résolus." },
  { label: "Performance", prompt: "Compare la performance de ce mois vs le mois précédent : revenus, clients, churn." },
];

export function Proph3tChat({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Welcome message
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Bonjour Pamela. Je suis **Proph3t**, connecté en temps réel à toutes vos données Atlas Studio.\n\nJe peux analyser vos KPIs, détecter les anomalies, relancer les impayés, ou répondre à vos questions sur SYSCOHADA et OHADA.\n\nComment puis-je vous aider ?",
        created_at: new Date().toISOString(),
      }]);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const sendFeedback = async (messageId: string, rating: "up" | "down" | "correction", correctionText?: string) => {
    try {
      await supabase.functions.invoke("proph3t-feedback", {
        body: { message_id: messageId, rating, correction_text: correctionText },
      });
    } catch (e) {
      console.warn("[proph3t-chat] feedback failed", e);
    }
  };

  const promptCorrection = (messageId: string) => {
    const correction = window.prompt("Quelle est la bonne réponse ? PROPH3T va apprendre de votre correction.");
    if (correction && correction.trim()) {
      sendFeedback(messageId, "correction", correction.trim());
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() && !attachment) return;
    setIsLoading(true);
    setInput("");

    const userMsg: Message = { id: Date.now().toString(), role: "user", content, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    // ID stable du message assistant - on le crée vide tout de suite et on le remplit par stream
    const assistantId = Date.now().toString() + "_r";
    setMessages(prev => [...prev, {
      id: assistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    }]);

    try {
      // Récupérer le JWT user pour l'auth header
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session?.access_token) {
        // Tenter un refresh
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (!refreshed?.session?.access_token) throw new Error("Session expirée — reconnectez-vous");
      }
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      // Appel SSE via fetch (pas EventSource car POST + body)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/proph3t-ask-stream`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        body: JSON.stringify({ message: content, conversation_id: conversationId, product: "admin" }),
      });

      if (!res.ok || !res.body) {
        // Tenter de lire le body JSON d'erreur
        let errMsg = `HTTP ${res.status}`;
        try { const j = await res.json(); if (j?.error) errMsg = j.error; } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      // Lire le stream SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const event of events) {
          if (!event.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(event.slice(6));
            switch (data.type) {
              case "start":
                if (data.conversation_id) setConversationId(data.conversation_id);
                break;
              case "status":
                // Mise à jour du placeholder italique tant qu'il n'y a pas de contenu réel
                setMessages(prev => prev.map(m =>
                  m.id === assistantId && (m.content === "" || (m.content.startsWith("_") && m.content.endsWith("_")))
                    ? { ...m, content: `_${data.msg}_` }
                    : m
                ));
                break;
              case "rag":
                // Reset le placeholder pour préparer le tool_call ou delta
                setMessages(prev => prev.map(m =>
                  m.id === assistantId && m.content.startsWith("_")
                    ? { ...m, content: "" }
                    : m
                ));
                break;
              case "tool_call":
                setMessages(prev => prev.map(m =>
                  m.id === assistantId && (m.content === "" || (m.content.startsWith("_") && m.content.endsWith("_")))
                    ? { ...m, content: `_🔧 Calcul : **${data.name}**..._` }
                    : m
                ));
                break;
              case "tool_result":
                // Pas de reset ici - le status "Generation reponse..." va prendre le relais
                break;
              case "delta":
                streamedContent += data.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? { ...m, content: streamedContent } : m
                ));
                break;
              case "done":
                setMessages(prev => prev.map(m =>
                  m.id === assistantId ? {
                    ...m,
                    message_id: data.message_id,
                    model_used: data.model_used,
                    citations: data.citations,
                    confidence: data.confidence,
                  } : m
                ));
                break;
              case "error":
                throw new Error(data.error || "Erreur stream");
            }
          } catch (e) {
            // Continuer sur erreur de parsing isolée, sauf si c'est notre type=error
            if ((e as Error).message && !(e instanceof SyntaxError)) throw e;
          }
        }
      }
    } catch (err) {
      const errMessage = (err as Error)?.message || "Erreur inconnue";
      console.error("[proph3t-chat] stream failed:", err, errMessage);
      const fallback = await generateLocalInsight(content);
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? {
          ...m,
          content: fallback + `\n\n_⚠️ Mode dégradé : Edge function **proph3t-ask-stream** indisponible — ${errMessage}_`,
          model_used: "local-fallback",
        } : m
      ));
    }

    setAttachment(null);
    setIsLoading(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-onyx shadow-2xl h-full flex flex-col animate-slide-in-right">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center">
              <Zap size={18} className="text-onyx" />
            </div>
            <div>
              <div className="text-neutral-light text-sm font-semibold flex items-center gap-2">
                <span className="font-logo text-gold text-lg">Proph3t</span>
              </div>
              <div className="text-neutral-500 text-[11px]">Assistant IA — Atlas Studio</div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Quick commands */}
        <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-white/5 flex-shrink-0">
          {QUICK_COMMANDS.map(cmd => (
            <button key={cmd.label} onClick={() => sendMessage(cmd.prompt)}
              className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-full bg-white/5 text-neutral-400 hover:bg-gold hover:text-onyx transition-colors whitespace-nowrap">
              {cmd.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === "user" ? "bg-white/10" : "bg-gold"
              }`}>
                {msg.role === "user" ? <User size={14} className="text-neutral-light" /> : <Bot size={14} className="text-onyx" />}
              </div>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-white/10 text-neutral-light"
                  : "bg-white/5 text-neutral-light border border-white/10"
              }`}>
                <div className="text-[13px] leading-relaxed whitespace-pre-wrap">
                  {msg.content === "" && msg.role === "assistant" ? (
                    <div className="flex gap-1.5 py-1">
                      <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                      part.startsWith("**") && part.endsWith("**")
                        ? <strong key={i} className="text-gold font-semibold">{part.slice(2, -2)}</strong>
                        : <span key={i}>{part}</span>
                    )
                  )}
                </div>
                {/* Citations + confidence badge (CDC v2 garde-fous) */}
                {msg.role === "assistant" && (msg.confidence !== undefined || (msg.citations && msg.citations.length > 0)) && (
                  <div className="mt-2 flex items-center gap-2 flex-wrap text-[10px]">
                    {msg.confidence !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full font-mono ${msg.confidence >= 70 ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
                        confiance {msg.confidence}
                      </span>
                    )}
                    {msg.citations && msg.citations.length > 0 && (
                      <span className="text-neutral-500">{msg.citations.length} source(s)</span>
                    )}
                  </div>
                )}
                {/* Feedback buttons for assistant messages with a real message_id */}
                {msg.role === "assistant" && msg.message_id && (
                  <div className="mt-2 flex items-center gap-1 text-[11px]">
                    <button
                      onClick={() => sendFeedback(msg.message_id!, "up")}
                      className="px-2 py-1 rounded hover:bg-emerald-500/10 text-neutral-500 hover:text-emerald-400 transition-colors"
                      title="Bonne réponse"
                    >👍</button>
                    <button
                      onClick={() => sendFeedback(msg.message_id!, "down")}
                      className="px-2 py-1 rounded hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Mauvaise réponse"
                    >👎</button>
                    <button
                      onClick={() => promptCorrection(msg.message_id!)}
                      className="px-2 py-1 rounded hover:bg-amber-500/10 text-neutral-500 hover:text-amber-400 transition-colors"
                      title="Corriger"
                    >✏️</button>
                  </div>
                )}
                {msg.model_used && (
                  <div className="text-[10px] text-neutral-600 mt-2">
                    via {msg.model_used === "local" ? "analyse locale" : msg.model_used}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loader désormais intégré au bubble assistant vide pendant le streaming */}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-3 border-t border-white/10 flex-shrink-0">
          {attachment && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg">
              <Paperclip size={12} className="text-gold" />
              <span className="text-[11px] text-neutral-light flex-1 truncate">{attachment.name}</span>
              <button onClick={() => setAttachment(null)} className="text-neutral-500 hover:text-red-400 text-[11px]">x</button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
              onChange={e => setAttachment(e.target.files?.[0] || null)} />
            <button onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-neutral-500 hover:text-gold transition-colors flex-shrink-0">
              <Paperclip size={16} />
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder="Posez votre question..."
              rows={1}
              className="flex-1 bg-white/5 text-neutral-light placeholder-neutral-600 rounded-xl px-4 py-3 text-[13px] resize-none outline-none focus:ring-1 focus:ring-gold/50 border border-white/10 transition-colors"
            />
            <button onClick={() => sendMessage(input)} disabled={isLoading || (!input.trim() && !attachment)}
              className="p-2.5 bg-gold text-onyx rounded-xl hover:bg-gold/80 disabled:opacity-40 transition-colors flex-shrink-0">
              <Send size={16} />
            </button>
          </div>
          <div className="text-center mt-2 text-[10px] text-neutral-600">
            Shift+Enter pour retour à la ligne · Enter pour envoyer
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Local fallback: generate insights from Supabase data ─── */
async function generateLocalInsight(query: string): Promise<string> {
  const q = query.toLowerCase();

  try {
    if (q.includes("rapport") || q.includes("jour") || q.includes("résumé")) {
      const [subsRes, invRes, ticketsRes, profilesRes] = await Promise.all([
        supabase.from("subscriptions").select("status, price_at_subscription"),
        supabase.from("invoices").select("status, amount"),
        supabase.from("tickets").select("status"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      const subs = subsRes.data || [];
      const active = subs.filter(s => s.status === "active" || s.status === "trial");
      const mrr = active.reduce((s, r) => s + Number(r.price_at_subscription || 0), 0);
      const invoices = invRes.data || [];
      const pending = invoices.filter(i => i.status === "pending");
      const tickets = ticketsRes.data || [];
      const openT = tickets.filter(t => t.status === "open" || t.status === "in_progress");

      return `**Rapport du jour — Atlas Studio**\n\n` +
        `**MRR :** ${mrr.toLocaleString("fr-FR")} FCFA\n` +
        `**Abonnements actifs :** ${active.length}\n` +
        `**Clients totaux :** ${profilesRes.count || 0}\n` +
        `**Factures en attente :** ${pending.length} (${pending.reduce((s, i) => s + Number(i.amount || 0), 0).toLocaleString("fr-FR")} FCFA)\n` +
        `**Tickets ouverts :** ${openT.length}\n\n` +
        (pending.length > 3 ? "⚠️ **Attention :** Nombre élevé de factures en attente. Considérez une relance groupée.\n" : "") +
        (openT.length > 5 ? "⚠️ **Attention :** Tickets en accumulation. Priorisez les plus anciens.\n" : "") +
        `\n_Données en temps réel depuis Supabase._`;
    }

    if (q.includes("impayé") || q.includes("retard") || q.includes("facture")) {
      const { data } = await supabase.from("invoices").select("*, profiles(full_name, email)").eq("status", "pending").order("created_at") as { data: any[] | null };
      if (!data || data.length === 0) return "Aucune facture en attente. Tout est en ordre.";
      const total = data.reduce((s, i) => s + Number(i.amount || 0), 0);
      return `**${data.length} facture(s) en attente** — Total : **${total.toLocaleString("fr-FR")} FCFA**\n\n` +
        data.slice(0, 5).map((i: any) => `- ${i.invoice_number} · ${(i.profiles as any)?.full_name || "—"} · ${Number(i.amount).toLocaleString("fr-FR")} FCFA · ${new Date(i.created_at).toLocaleDateString("fr-FR")}`).join("\n") +
        (data.length > 5 ? `\n\n_...et ${data.length - 5} autres._` : "") +
        `\n\n**Action recommandée :** Relancez les factures de plus de 15 jours via la page Facturation.`;
    }

    if (q.includes("ticket") || q.includes("support") || q.includes("urgent")) {
      const { data } = await supabase.from("tickets").select("*, profiles(full_name)").in("status", ["open", "in_progress"]).order("created_at") as { data: any[] | null };
      if (!data || data.length === 0) return "Aucun ticket ouvert. Le support est à jour.";
      const critical = data.filter((t: any) => t.priority === "high");
      return `**${data.length} ticket(s) ouvert(s)** dont **${critical.length} haute priorité**\n\n` +
        data.slice(0, 5).map((t: any) => `- [${t.priority?.toUpperCase()}] ${t.subject} — ${(t.profiles as any)?.full_name || "—"}`).join("\n") +
        `\n\n**Recommandation :** Traitez les tickets haute priorité en premier pour respecter le SLA.`;
    }

    if (q.includes("client") || q.includes("risque") || q.includes("churn")) {
      const { data } = await supabase.from("subscriptions").select("*, profiles!subscriptions_user_id_fkey(full_name, email)").eq("status", "trial") as { data: any[] | null };
      const expiring = (data || []).filter((s: any) => s.trial_ends_at && new Date(s.trial_ends_at).getTime() < Date.now() + 3 * 86400000);
      if (expiring.length === 0) return "Aucun essai n'expire dans les 72 prochaines heures. Situation stable.";
      return `**${expiring.length} essai(s) expirent dans 72h :**\n\n` +
        expiring.map((s: any) => `- ${(s.profiles as any)?.full_name || "—"} (${(s.profiles as any)?.email || "—"}) — expire le ${new Date(s.trial_ends_at).toLocaleDateString("fr-FR")}`).join("\n") +
        `\n\n**Action :** Contactez-les avec une offre de conversion personnalisée.`;
    }

    return "Je comprends votre question, mais je suis en mode degradé local. Pour le moment, je peux répondre aux questions sur :\n\n" +
      "- **Rapport du jour** (MRR, clients, tickets)\n" +
      "- **Factures en attente** (impayés, relances)\n" +
      "- **Tickets ouverts** (support, urgences)\n" +
      "- **Risque churn** (essais expirants)\n\n" +
      "Posez l'une de ces questions ou utilisez les commandes rapides ci-dessus.\n\n" +
      "_Si l'IA répond systématiquement en mode dégradé : vérifier que vous avez configuré une clé Anthropic/Gemini, ou que GROQ_API_KEY est défini côté serveur._";

  } catch (err) {
    return "Erreur lors de l'analyse des données. Vérifiez votre connexion à Supabase.";
  }
}
