import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";

const STORAGE_KEY = "atlas_admin_read_notifications";
const POLL_INTERVAL = 30000;

const ACTION_LABELS: Record<string, string> = {
  subscription_created: "Nouvel abonnement",
  subscription_cancelled: "Abonnement annulé",
  payment_completed: "Paiement reçu",
  payment_failed: "Paiement échoué",
  client_created: "Nouveau client",
  admin_create_client: "Client créé (admin)",
  admin_delete_client: "Client supprimé",
  test_access_granted: "Accès test accordé",
  password_reset: "Mot de passe réinitialisé",
  content_updated: "Contenu mis à jour",
  login: "Connexion",
};

function dotColor(action: string): string {
  if (action.includes("delete") || action.includes("cancel") || action.includes("failed")) return "bg-red-500";
  if (action.includes("create") || action.includes("completed") || action.includes("granted")) return "bg-emerald-500";
  if (action.includes("update") || action.includes("reset")) return "bg-amber-500";
  return "bg-blue-500";
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); }
  catch { return new Set(); }
}

function persistReadIds(ids: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids].slice(-200)));
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = logs.filter(l => !readIds.has(l.id)).length;

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_log").select("*")
      .order("created_at", { ascending: false }).limit(20);
    if (data) setLogs(data);
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = () => {
    setReadIds(prev => {
      const next = new Set(prev);
      logs.forEach(l => next.add(l.id));
      persistReadIds(next);
      return next;
    });
  };

  const markRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      persistReadIds(next);
      return next;
    });
  };

  return (
    <div ref={panelRef} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg text-neutral-400 hover:text-neutral-light hover:bg-white/5 transition-colors">
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-onyx border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-neutral-light text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="flex items-center gap-1 text-[11px] text-gold hover:text-gold/80 transition-colors">
                <CheckCheck size={13} /> Tout marquer comme lu
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500 text-sm">Aucune activité récente</div>
            ) : logs.map(log => {
              const isRead = readIds.has(log.id);
              return (
                <button key={log.id} onClick={() => markRead(log.id)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ${isRead ? "opacity-50" : ""}`}>
                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor(log.action)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-neutral-light text-[13px] leading-snug truncate">
                      {ACTION_LABELS[log.action] || log.action.replace(/_/g, " ")}
                    </div>
                    <div className="text-neutral-500 text-[11px] mt-0.5">{relativeTime(log.created_at)}</div>
                  </div>
                  {!isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-gold flex-shrink-0" />}
                </button>
              );
            })}
          </div>
          <Link to="/admin/activity" onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-white/10 text-gold text-[12px] font-medium hover:bg-white/5 transition-colors">
            Voir tous les logs <ExternalLink size={12} />
          </Link>
        </div>
      )}
    </div>
  );
}
