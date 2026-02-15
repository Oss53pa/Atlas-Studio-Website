import { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { APP_INFO } from "../../config/apps";
import type { Subscription, SubscriptionStatus } from "../../lib/database.types";

interface SubWithProfile extends Subscription {
  profiles?: { full_name: string; email: string } | null;
}

const statusFilters: { label: string; value: string }[] = [
  { label: "Tous", value: "all" },
  { label: "Actifs", value: "active" },
  { label: "Essai", value: "trial" },
  { label: "Suspendus", value: "suspended" },
  { label: "Annulés", value: "cancelled" },
  { label: "Expirés", value: "expired" },
];

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);

  const fetchSubs = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (data) setSubs(data as SubWithProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const filtered = filter === "all" ? subs : subs.filter(s => s.status === filter);

  const updateStatus = async (sub: SubWithProfile, status: SubscriptionStatus) => {
    const updates: Partial<Subscription> = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("subscriptions").update(updates).eq("id", sub.id);
    fetchSubs();
    setToast(`Abonnement ${status === "active" ? "activé" : status === "suspended" ? "suspendu" : "annulé"}`);
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
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Abonnements</h1>
          <p className="text-neutral-muted text-sm">{subs.length} abonnements</p>
        </div>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              filter === f.value ? "bg-gold text-onyx" : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[11px] opacity-70">
              {f.value === "all" ? subs.length : subs.filter(s => s.status === f.value).length}
            </span>
          </button>
        ))}
      </div>

      <AdminTable
        keyExtractor={(r: SubWithProfile) => r.id}
        columns={[
          { key: "user", label: "Client", render: (r: SubWithProfile) => (
            <div>
              <span className="font-medium text-neutral-text">{r.profiles?.full_name || "—"}</span>
              <div className="text-neutral-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "app_id", label: "Application", sortable: true, render: (r: SubWithProfile) => APP_INFO[r.app_id]?.name || r.app_id },
          { key: "plan", label: "Plan", sortable: true, render: (r: SubWithProfile) => (
            <span className="capitalize">{r.plan}</span>
          )},
          { key: "price_at_subscription", label: "Prix", sortable: true, render: (r: SubWithProfile) => `${Number(r.price_at_subscription).toFixed(2)} FCFA` },
          { key: "status", label: "Statut", render: (r: SubWithProfile) => <AdminBadge status={r.status} /> },
          { key: "current_period_end", label: "Fin période", sortable: true, render: (r: SubWithProfile) => new Date(r.current_period_end).toLocaleDateString("fr-FR") },
          { key: "actions", label: "Actions", render: (r: SubWithProfile) => (
            <div className="flex items-center gap-1">
              {r.status !== "active" && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateStatus(r, "active"); }}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 transition-colors"
                >
                  Activer
                </button>
              )}
              {r.status === "active" && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateStatus(r, "suspended"); }}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 transition-colors"
                >
                  Suspendre
                </button>
              )}
              {r.status !== "cancelled" && (
                <button
                  onClick={(e) => { e.stopPropagation(); updateStatus(r, "cancelled"); }}
                  className="px-2.5 py-1 rounded text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Annuler
                </button>
              )}
            </div>
          )},
        ]}
        data={filtered}
      />
    </div>
  );
}
