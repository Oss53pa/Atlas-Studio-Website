import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../lib/supabase";

interface RealtimeAlert {
  type: "ticket" | "payment" | "subscription";
  message: string;
  created_at: string;
}

/**
 * Subscribes to Supabase Realtime for critical events.
 * Returns recent alerts and an unread count.
 */
export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const addAlert = useCallback((alert: RealtimeAlert) => {
    setAlerts(prev => [alert, ...prev].slice(0, 50));
    setUnreadCount(prev => prev + 1);
  }, []);

  const clearUnread = useCallback(() => setUnreadCount(0), []);

  useEffect(() => {
    const channel = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, (payload) => {
        addAlert({
          type: "ticket",
          message: `Nouveau ticket : ${(payload.new as any).subject || "Sans sujet"}`,
          created_at: new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "invoices" }, (payload) => {
        const inv = payload.new as any;
        addAlert({
          type: "payment",
          message: `Nouvelle facture ${inv.invoice_number || ""} — ${Number(inv.amount || 0).toLocaleString("fr-FR")} FCFA`,
          created_at: new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "invoices" }, (payload) => {
        const inv = payload.new as any;
        if (inv.status === "paid") {
          addAlert({
            type: "payment",
            message: `Paiement reçu : ${inv.invoice_number || ""} — ${Number(inv.amount || 0).toLocaleString("fr-FR")} FCFA`,
            created_at: new Date().toISOString(),
          });
        }
        if (inv.status === "failed") {
          addAlert({
            type: "payment",
            message: `Paiement échoué : ${inv.invoice_number || ""}`,
            created_at: new Date().toISOString(),
          });
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "subscriptions" }, (payload) => {
        addAlert({
          type: "subscription",
          message: `Nouvel abonnement : ${(payload.new as any).app_id || ""}`,
          created_at: new Date().toISOString(),
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "subscriptions" }, (payload) => {
        const sub = payload.new as any;
        if (sub.status === "cancelled") {
          addAlert({
            type: "subscription",
            message: `Abonnement annulé : ${sub.app_id || ""}`,
            created_at: new Date().toISOString(),
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [addAlert]);

  return { alerts, unreadCount, clearUnread };
}
