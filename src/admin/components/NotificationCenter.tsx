import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, ExternalLink, AlertTriangle, UserPlus, CreditCard, FileText, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";

const STORAGE_KEY = "atlas_admin_read_notifications";

type NotifSource = "activity" | "alert" | "notification";
type NotifSeverity = "info" | "success" | "warning" | "critical";

interface UnifiedNotif {
  id: string;          // prefixed: "activity-xxx" / "alert-xxx" / "notif-xxx"
  source: NotifSource;
  severity: NotifSeverity;
  title: string;
  subtitle?: string;
  created_at: string;
  link?: string;
}

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
  login: "Connexion admin",
  licence_generated: "Licence générée",
  licence_activated: "Licence activée",
  licence_suspended: "Licence suspendue",
  seat_invited: "Membre invité",
  refund_initiated: "Remboursement initié",
  wire_transfer_confirmed: "Virement confirmé",
};

function severityFromAction(action: string): NotifSeverity {
  if (action.includes("delete") || action.includes("cancel") || action.includes("failed") || action.includes("suspend")) return "critical";
  if (action.includes("create") || action.includes("completed") || action.includes("granted") || action.includes("activated") || action.includes("generated")) return "success";
  if (action.includes("update") || action.includes("reset") || action.includes("invited")) return "warning";
  return "info";
}

function severityStyles(sev: NotifSeverity) {
  switch (sev) {
    case "critical": return { dot: "bg-red-500", icon: AlertTriangle, color: "text-red-400" };
    case "success": return { dot: "bg-emerald-500", icon: UserPlus, color: "text-emerald-400" };
    case "warning": return { dot: "bg-amber-500", icon: FileText, color: "text-amber-400" };
    default: return { dot: "bg-blue-500", icon: Activity, color: "text-blue-400" };
  }
}

function iconForAction(action: string) {
  if (action.includes("payment") || action.includes("invoice") || action.includes("refund") || action.includes("wire")) return CreditCard;
  if (action.includes("client") || action.includes("user") || action.includes("invit") || action.includes("seat")) return UserPlus;
  if (action.includes("licen")) return FileText;
  if (action.includes("delete") || action.includes("fail") || action.includes("suspend")) return AlertTriangle;
  return Activity;
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
  const [items, setItems] = useState<UnifiedNotif[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Compute dropdown position based on button's real DOM position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    // Sidebar width is ~240px, dropdown width is 380px
    // Position: to the right of the button, or adjust if would overflow
    const dropdownWidth = 380;
    const gap = 12;
    let left = rect.right + gap;
    // If dropdown would overflow right edge, anchor to right side of button instead
    if (left + dropdownWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - dropdownWidth - 12);
    }
    setDropdownPos({ top: rect.top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handleResize = () => updatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [open, updatePosition]);

  const unreadCount = items.filter(n => !readIds.has(n.id)).length;

  const fetchAll = useCallback(async () => {
    const [actRes, alertRes, notifRes] = await Promise.all([
      supabase.from("activity_log").select("id, action, metadata, created_at").order("created_at", { ascending: false }).limit(15),
      supabase.from("alerts").select("id, severity, title, message, created_at, resolved_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(10),
      supabase.from("notifications").select("id, title, message, type, created_at, is_read, link").order("created_at", { ascending: false }).limit(10),
    ]);

    const unified: UnifiedNotif[] = [];

    if (actRes.data) {
      actRes.data.forEach((log: any) => {
        unified.push({
          id: `activity-${log.id}`,
          source: "activity",
          severity: severityFromAction(log.action),
          title: ACTION_LABELS[log.action] || log.action.replace(/_/g, " "),
          subtitle: log.metadata?.app_name || log.metadata?.amount ? `${log.metadata?.app_name || ""} ${log.metadata?.amount ? `— ${Number(log.metadata.amount).toLocaleString("fr-FR")} FCFA` : ""}`.trim() : undefined,
          created_at: log.created_at,
          link: "/admin/activity",
        });
      });
    }

    if (alertRes.data) {
      alertRes.data.forEach((alert: any) => {
        unified.push({
          id: `alert-${alert.id}`,
          source: "alert",
          severity: alert.severity === "critical" || alert.severity === "high" ? "critical" : alert.severity === "medium" ? "warning" : "info",
          title: alert.title || "Alerte",
          subtitle: alert.message,
          created_at: alert.created_at,
          link: "/admin/alerts",
        });
      });
    }

    if (notifRes.data) {
      notifRes.data.forEach((notif: any) => {
        const sev: NotifSeverity = notif.type === "error" ? "critical" : notif.type === "warning" ? "warning" : notif.type === "success" ? "success" : "info";
        unified.push({
          id: `notif-${notif.id}`,
          source: "notification",
          severity: sev,
          title: notif.title,
          subtitle: notif.message,
          created_at: notif.created_at,
          link: notif.link || "/admin",
        });
        if (notif.is_read) {
          setReadIds(prev => new Set([...prev, `notif-${notif.id}`]));
        }
      });
    }

    // Sort by date descending
    unified.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setItems(unified.slice(0, 30));
  }, []);

  useEffect(() => {
    fetchAll();

    // Realtime subscriptions
    const channel = supabase.channel("admin-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_log" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alerts" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchAll())
      .subscribe();

    return () => { channel.unsubscribe(); };
  }, [fetchAll]);

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
      items.forEach(n => next.add(n.id));
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
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        className="relative p-1.5 rounded-md text-neutral-400 hover:text-neutral-light hover:bg-white/5 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} strokeWidth={1.5} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-1 ring-2 ring-onyx">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && dropdownPos && (
        <>
          {/* Backdrop to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed bg-[#0F0F15] border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: 380,
              maxHeight: `calc(100vh - ${dropdownPos.top + 20}px)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#1A1A22]">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-semibold">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold">
                    {unreadCount} nouveaux
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-[11px] text-[#EF9F27] hover:text-[#D4B872] transition-colors font-medium"
                >
                  <CheckCheck size={12} /> Tout lu
                </button>
              )}
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {items.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Bell size={28} className="mx-auto text-white/20 mb-2" />
                  <div className="text-white/50 text-sm">Aucune notification</div>
                  <div className="text-white/30 text-[11px] mt-1">Vous êtes à jour</div>
                </div>
              ) : (
                items.map(item => {
                  const isRead = readIds.has(item.id);
                  const styles = severityStyles(item.severity);
                  const Icon = item.source === "activity"
                    ? iconForAction((items.find(i => i.id === item.id) as any)?.title || "")
                    : styles.icon;
                  return (
                    <Link
                      key={item.id}
                      to={item.link || "/admin"}
                      onClick={() => { markRead(item.id); setOpen(false); }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/5 last:border-b-0 ${isRead ? "opacity-55" : ""}`}
                    >
                      {/* Icon avec background severity */}
                      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                        item.severity === "critical" ? "bg-red-500/15" :
                        item.severity === "success" ? "bg-emerald-500/15" :
                        item.severity === "warning" ? "bg-amber-500/15" :
                        "bg-blue-500/15"
                      }`}>
                        <Icon size={14} className={styles.color} strokeWidth={2} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-white text-[13px] font-medium leading-snug">
                            {item.title}
                          </div>
                          {!isRead && (
                            <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-[#EF9F27]" />
                          )}
                        </div>
                        {item.subtitle && (
                          <div className="text-white/60 text-[11px] mt-0.5 line-clamp-2">
                            {item.subtitle}
                          </div>
                        )}
                        <div className="text-white/40 text-[10px] mt-1 flex items-center gap-2">
                          <span>{relativeTime(item.created_at)}</span>
                          <span className="text-white/20">•</span>
                          <span className="uppercase tracking-wide">{item.source}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <Link
              to="/admin/activity"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-white/10 bg-[#1A1A22] text-[#EF9F27] text-[12px] font-medium hover:bg-[#1E1E2A] transition-colors"
            >
              Voir tous les logs <ExternalLink size={12} />
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
