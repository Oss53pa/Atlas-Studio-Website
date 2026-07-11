import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, Loader2, Calculator, FileText, Receipt, Shield, BarChart3, BookOpen, Zap } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { Proph3tWorkflowStream } from "../components/Proph3tWorkflowStream";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: { tool: string; hits: unknown }[];
  confidence?: number;
  message_id?: string;
  model_used?: string;
  created_at: string;
}

const QUICK_PROMPTS = [
  { label: "Calculer ma TVA", icon: Calculator, prompt: "Aide-moi a calculer la TVA sur une facture de 5 000 000 FCFA HT en Cote d'Ivoire au taux standard." },
  { label: "Analyser un bilan", icon: BarChart3, prompt: "Quels sont les ratios financiers cles a regarder dans un bilan SYSCOHADA et comment les interpreter ?" },
  { label: "Loi de Benford", icon: Shield, prompt: "Explique-moi la loi de Benford et comment l'utiliser pour detecter une fraude comptable." },
  { label: "IRPP cote d'Ivoire", icon: Receipt, prompt: "Calcule mon IRPP en CI sur un revenu imposable de 8 000 000 FCFA, avec 2 parts fiscales." },
  { label: "Rapprochement", icon: FileText, prompt: "Comment faire un rapprochement bancaire ? Explique-moi la methode et les pieges a eviter." },
  { label: "Documentation OHADA", icon: BookOpen, prompt: "Quel est le plan comptable SYSCOHADA et comment classer un investissement immobilier ?" },
  { label: "Note de frais & per diem", icon: FileText, prompt: "Quelles sont les regles de deductibilite d'une note de frais (per diem, transport, mission) en zone UEMOA ?" },
  { label: "Stocks & marge resto", icon: BarChart3, prompt: "Comment suivre mes stocks et calculer ma marge pour un restaurant (CUMP, taux de rotation, food cost) ?" },
];

export function Proph3tPortalPage({ userId }: { userId?: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [activeWorkflow, setActiveWorkflow] = useState<{ name: string; args: Record<string, unknown> } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: "Bonjour. Je suis **Proph3t**, l'assistant IA souverain de toute la suite Atlas Studio.\n\nJe couvre bien plus que la finance :\n- Finance & comptabilite SYSCOHADA (ratios BFR, FR, Z-Score, bilans, etats)\n- Fiscalite OHADA (TVA, IRPP, IS, CNSS, liasse fiscale)\n- RH, paie, notes de frais et missions\n- Tresorerie et previsions de flux\n- Audit bancaire et detection d'anomalies (loi de Benford)\n- Gestion documentaire, signature et workflows\n- Restauration (menus, stocks, encaissement)\n\nPosez-moi votre question ou choisissez un sujet ci-dessous.",
        created_at: new Date().toISOString(),
      }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  const sendFeedback = async (messageId: string, rating: "up" | "down" | "correction", correctionText?: string) => {
    try {
      await supabase.functions.invoke("proph3t-feedback", {
        body: { message_id: messageId, rating, correction_text: correctionText },
      });
    } catch (e) {
      console.warn("[proph3t-portal] feedback failed", e);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setIsLoading(true);
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const { data, error } = await supabase.functions.invoke("proph3t-ask", {
        body: { message: content, conversation_id: conversationId, product: "portal" },
      });

      if (error) throw error;
      if (data?.conversation_id) setConversationId(data.conversation_id);

      setMessages(prev => [...prev, {
        id: Date.now().toString() + "_r",
        message_id: data?.message_id,
        role: "assistant",
        content: data?.answer || "Reponse recue.",
        citations: data?.citations,
        confidence: data?.confidence,
        model_used: data?.model_used,
        created_at: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + "_e",
        role: "assistant",
        content: "Une erreur est survenue. Reformulez ou reessayez dans quelques instants.\n\n_Erreur : " + (err as Error).message + "_",
        created_at: new Date().toISOString(),
      }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-neutral-light text-2xl font-bold flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gold flex items-center justify-center shadow-gold-sm">
              <Sparkles size={18} className="text-onyx" />
            </span>
            <span className="font-logo text-gold text-3xl">Proph3t</span>
            <span className="text-neutral-400 text-sm font-normal">— l'IA souveraine de toute la suite Atlas Studio</span>
          </h1>
          <p className="text-neutral-500 text-[13px] mt-1">
            Finance & SYSCOHADA · Fiscalite OHADA · RH & paie · Tresorerie · Audit bancaire · Documents · Restauration
          </p>
        </div>
      </div>

      {/* Chat container */}
      <div className="surface-raised rounded-3xl shadow-elev-3 flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === "user" ? "bg-white/10" : "bg-gold"
              }`}>
                {msg.role === "user"
                  ? <User size={16} className="text-neutral-light" />
                  : <Bot size={16} className="text-onyx" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-white/10 text-neutral-light"
                  : "bg-white/5 text-neutral-light border border-white/10"
              }`}>
                <div className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                  {msg.content.split(/(\*\*.*?\*\*)/).map((part, i) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={i} className="text-gold font-semibold">{part.slice(2, -2)}</strong>
                      : <span key={i}>{part}</span>
                  )}
                </div>

                {msg.role === "assistant" && (msg.confidence !== undefined || (msg.citations && msg.citations.length > 0)) && (
                  <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[10.5px]">
                    {msg.confidence !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full font-mono ${
                        msg.confidence >= 70
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        confiance {msg.confidence}/100
                      </span>
                    )}
                    {msg.citations && msg.citations.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        {msg.citations.length} source(s)
                      </span>
                    )}
                  </div>
                )}

                {msg.role === "assistant" && msg.message_id && (
                  <div className="mt-2.5 flex items-center gap-1 text-[12px]">
                    <button onClick={() => sendFeedback(msg.message_id!, "up")}
                      className="px-2 py-1 rounded hover:bg-emerald-500/10 text-neutral-500 hover:text-emerald-400 transition-colors"
                      title="Bonne reponse">Utile</button>
                    <button onClick={() => sendFeedback(msg.message_id!, "down")}
                      className="px-2 py-1 rounded hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
                      title="Reponse a ameliorer">A revoir</button>
                  </div>
                )}

                {msg.model_used && (
                  <div className="text-[10px] text-neutral-600 mt-2">via {msg.model_used}</div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                <Loader2 size={16} className="text-onyx animate-spin" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-gold rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompts (cachees apres premier message) */}
        {messages.length <= 1 && (
          <div className="px-6 py-3 border-t border-white/5">
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 font-semibold">Sujets frequents</div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {QUICK_PROMPTS.map(qp => (
                <button key={qp.label} onClick={() => sendMessage(qp.prompt)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/[0.08] text-neutral-300 hover:text-gold text-[12px] text-left transition-all duration-200 border border-white/[0.06] hover:border-gold/30 hover:-translate-y-0.5">
                  <qp.icon size={14} className="flex-shrink-0" />
                  <span className="truncate">{qp.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Workflow shortcuts */}
        {messages.length <= 1 && (
          <div className="px-6 py-3 border-t border-white/5">
            <div className="text-[11px] text-neutral-500 uppercase tracking-wider mb-2 font-semibold flex items-center gap-2">
              <Zap size={12} /> Workflows en 1 clic (streaming live)
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <button onClick={() => setActiveWorkflow({ name: "workflow_audit_complet_societe", args: { raison_sociale: "Demo SA", exercice: "2025", entries: [{ compte: "411000", debit_centimes: "1000000", credit_centimes: "0", date: "2025-01-15", numero_piece: "P001" }, { compte: "701000", debit_centimes: "0", credit_centimes: "1000000", date: "2025-01-15", numero_piece: "P001" }] } })}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gold/10 hover:bg-gold/[0.18] text-gold text-[12px] text-left transition-all duration-200 border border-gold/30 hover:-translate-y-0.5 hover:shadow-gold-sm">
                <Sparkles size={14} className="flex-shrink-0" />
                <span className="truncate">Audit complet societe (demo)</span>
              </button>
              <button onClick={() => setActiveWorkflow({ name: "workflow_simulation_recrutement", args: { poste: "Comptable", salaire_brut_mensuel_centimes: "60000000", pays: "CI", duree_mois: 12 } })}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-gold/10 hover:bg-gold/[0.18] text-gold text-[12px] text-left transition-all duration-200 border border-gold/30 hover:-translate-y-0.5 hover:shadow-gold-sm">
                <Sparkles size={14} className="flex-shrink-0" />
                <span className="truncate">Simulation recrutement comptable (CI)</span>
              </button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 pb-5 pt-3 border-t border-white/10">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Posez votre question (Enter pour envoyer, Shift+Enter pour saut de ligne)"
              rows={1}
              className="flex-1 bg-p-surface text-neutral-light placeholder-neutral-600 rounded-xl px-4 py-3 text-[13.5px] resize-none outline-none border border-white/[0.07] shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)] focus:border-gold/55 focus:ring-2 focus:ring-gold/30 transition-all duration-200"
            />
            <button onClick={() => sendMessage(input)} disabled={isLoading || !input.trim()}
              className="p-3 bg-gold text-onyx rounded-xl hover:bg-gold/80 hover:shadow-gold-sm disabled:opacity-40 transition-all duration-200 flex-shrink-0">
              <Send size={16} />
            </button>
          </div>
          <div className="text-[10.5px] text-neutral-600 mt-2 flex items-center justify-between">
            <span>
              <strong className="text-neutral-500">Disclaimer :</strong> <span className="font-logo">Proph3t</span> est un assistant.
              Les decisions financieres et fiscales restent sous votre responsabilite.
            </span>
            <span>{userId ? "session authentifiee" : ""}</span>
          </div>
        </div>
      </div>

      {/* Workflow streaming modal */}
      {activeWorkflow && (
        <Proph3tWorkflowStream
          open={true}
          workflow_name={activeWorkflow.name}
          args={activeWorkflow.args}
          onClose={() => setActiveWorkflow(null)}
        />
      )}
    </div>
  );
}
