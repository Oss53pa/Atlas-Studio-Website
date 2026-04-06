import { useState, useEffect } from "react";
import { Loader2, Check, Plus, Download, Pencil } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { exportToCSV } from "../../lib/csvExport";
import type { Subscription, SubscriptionStatus, Profile } from "../../lib/database.types";

interface SubWithProfile extends Subscription {
  profiles?: { full_name: string; email: string } | null;
}

const statusFilters: { label: string; value: string }[] = [
  { label: "Tous", value: "all" },
  { label: "Actifs", value: "active" },
  { label: "Essai", value: "trial" },
  { label: "Suspendus", value: "suspended" },
  { label: "Annules", value: "cancelled" },
  { label: "Expires", value: "expired" },
];

export default function SubscriptionsPage() {
  const { appMap, appList } = useAppCatalog();
  const { selectedApp: globalAppFilter } = useAppFilter();
  const [subs, setSubs] = useState<SubWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const appFilter = globalAppFilter;
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editSub, setEditSub] = useState<SubWithProfile | null>(null);
  const [clients, setClients] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({ user_id: "", app_id: "", plan: "", price: 0, status: "active" as string });
  const [editData, setEditData] = useState({ plan: "", price: 0, trial_ends_at: "", current_period_end: "" });
  const [saving, setSaving] = useState(false);

  const fetchSubs = async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (data) setSubs(data as SubWithProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const filtered = subs.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (appFilter !== "all" && s.app_id !== appFilter) return false;
    return true;
  });

  const updateStatus = async (sub: SubWithProfile, status: SubscriptionStatus) => {
    const updates: Partial<Subscription> = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("subscriptions").update(updates).eq("id", sub.id);
    fetchSubs();
    showToast(`Abonnement ${status === "active" ? "active" : status === "suspended" ? "suspendu" : status === "trial" ? "en essai" : "annule"}`);
  };

  const openCreateForm = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setClients(data as Profile[] || []);
    const firstAppId = appList.length > 0 ? appList[0].id : "";
    setFormData({ user_id: "", app_id: firstAppId, plan: "", price: 0, status: "active" });
    setShowForm(true);
  };

  const openEditForm = (sub: SubWithProfile) => {
    setEditSub(sub);
    setEditData({
      plan: sub.plan || "",
      price: Number(sub.price_at_subscription) || 0,
      trial_ends_at: sub.trial_ends_at ? new Date(sub.trial_ends_at).toISOString().split("T")[0] : "",
      current_period_end: sub.current_period_end ? new Date(sub.current_period_end).toISOString().split("T")[0] : "",
    });
    setShowEditForm(true);
  };

  const handleCreateSub = async () => {
    if (!formData.user_id || !formData.app_id) return;
    setSaving(true);
    const isTrial = formData.status === "trial";
    const { error } = await supabase.from("subscriptions").insert({
      user_id: formData.user_id,
      app_id: formData.app_id,
      plan: formData.plan,
      status: formData.status as SubscriptionStatus,
      price_at_subscription: formData.price,
      trial_ends_at: isTrial ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    setSaving(false);
    if (error) {
      showToast(`Erreur: ${error.message}`);
    } else {
      showToast("Abonnement cree");
      setShowForm(false);
      fetchSubs();
    }
  };

  const handleEditSub = async () => {
    if (!editSub) return;
    setSaving(true);
    const updates: Record<string, any> = {
      plan: editData.plan,
      price_at_subscription: editData.price,
      updated_at: new Date().toISOString(),
    };
    if (editData.trial_ends_at) updates.trial_ends_at = new Date(editData.trial_ends_at).toISOString();
    if (editData.current_period_end) updates.current_period_end = new Date(editData.current_period_end).toISOString();
    await supabase.from("subscriptions").update(updates).eq("id", editSub.id);
    setSaving(false);
    showToast("Abonnement mis a jour");
    setShowEditForm(false);
    fetchSubs();
  };

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "profiles", label: "Client", render: (r: SubWithProfile) => r.profiles?.full_name || "—" },
      { key: "profiles", label: "Email", render: (r: SubWithProfile) => r.profiles?.email || "—" },
      { key: "app_id", label: "Application", render: (r: SubWithProfile) => appMap[r.app_id]?.name || r.app_id },
      { key: "plan", label: "Plan" },
      { key: "price_at_subscription", label: "Prix" },
      { key: "status", label: "Statut" },
      { key: "current_period_end", label: "Fin periode", render: (r: SubWithProfile) => new Date(r.current_period_end).toLocaleDateString("fr-FR") },
    ], "abonnements");
    showToast("Export CSV telecharge");
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Unique apps for filter
  const uniqueApps = [...new Set(subs.map(s => s.app_id).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Abonnements</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{subs.length} abonnements</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-semibold text-neutral-text dark:text-neutral-body dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={openCreateForm} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold dark:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouvel abonnement
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold dark:bg-admin-accent/10 border border-gold/20 text-gold dark:text-admin-accent text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {statusFilters.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              filter === f.value ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-text dark:text-neutral-body dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40"
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-[11px] opacity-70">
              {f.value === "all" ? subs.length : subs.filter(s => s.status === f.value).length}
            </span>
          </button>
        ))}
      </div>
      {/* App filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        <button onClick={() => setAppFilter("all")} className={`px-3 py-1.5 rounded text-[12px] font-medium transition-all ${appFilter === "all" ? "bg-neutral-200 text-neutral-700" : "bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:bg-neutral-100"}`}>
          Toutes les apps
        </button>
        {uniqueApps.map(appId => (
          <button key={appId} onClick={() => setAppFilter(appId)} className={`px-3 py-1.5 rounded text-[12px] font-medium transition-all ${appFilter === appId ? "bg-neutral-200 text-neutral-700" : "bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:bg-neutral-100"}`}>
            {appMap[appId]?.name || appId}
          </button>
        ))}
      </div>

      <AdminTable
        keyExtractor={(r: SubWithProfile) => r.id}
        columns={[
          { key: "user", label: "Client", render: (r: SubWithProfile) => (
            <div>
              <span className="font-medium text-neutral-text dark:text-admin-text">{r.profiles?.full_name || "—"}</span>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "app_id", label: "Application", sortable: true, render: (r: SubWithProfile) => appMap[r.app_id]?.name || r.app_id },
          { key: "plan", label: "Plan", sortable: true, render: (r: SubWithProfile) => <span className="capitalize">{r.plan || "—"}</span> },
          { key: "price_at_subscription", label: "Prix", sortable: true, render: (r: SubWithProfile) => `${Number(r.price_at_subscription || 0).toLocaleString("fr-FR")} FCFA` },
          { key: "status", label: "Statut", render: (r: SubWithProfile) => <AdminBadge status={r.status} /> },
          { key: "current_period_end", label: "Fin periode", sortable: true, render: (r: SubWithProfile) => r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("fr-FR") : "—" },
          { key: "actions", label: "Actions", render: (r: SubWithProfile) => (
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); openEditForm(r); }} className="px-2 py-1 rounded text-[11px] font-medium text-blue-600 hover:bg-blue-50 transition-colors" title="Modifier">
                <Pencil size={13} />
              </button>
              {r.status !== "active" && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(r, "active"); }} className="px-2.5 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 transition-colors">Activer</button>
              )}
              {r.status === "active" && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(r, "suspended"); }} className="px-2.5 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 transition-colors">Suspendre</button>
              )}
              {r.status !== "cancelled" && (
                <button onClick={(e) => { e.stopPropagation(); updateStatus(r, "cancelled"); }} className="px-2.5 py-1 rounded text-[11px] font-medium text-red-600 hover:bg-red-50 transition-colors">Annuler</button>
              )}
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Create subscription modal */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Nouvel abonnement">
        <div className="space-y-3">
          <div>
            <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Client</label>
            <select value={formData.user_id} onChange={e => setFormData(p => ({ ...p, user_id: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
              <option value="">Selectionner un client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Application</label>
            <select value={formData.app_id} onChange={e => setFormData(p => ({ ...p, app_id: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
              {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut initial</label>
            <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
              <option value="active">Actif</option>
              <option value="trial">Essai gratuit (14 jours)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Plan</label>
              <select value={formData.plan} onChange={e => {
                const plan = e.target.value;
                const app = appMap[formData.app_id];
                const price = app ? (app.pricing as Record<string, number>)[plan] || 0 : 0;
                setFormData(p => ({ ...p, plan, price }));
              }} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
                <option value="">Selectionner</option>
                {formData.app_id && appMap[formData.app_id] && Object.entries(appMap[formData.app_id].pricing as Record<string, number>).map(([planName, price]) => (
                  <option key={planName} value={planName}>{planName} — {price.toLocaleString("fr-FR")} FCFA</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Prix (FCFA)</label>
              <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
            </div>
          </div>
          <button onClick={handleCreateSub} disabled={saving || !formData.user_id} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold dark:bg-admin-accent-dark transition-colors w-full mt-4 ${saving || !formData.user_id ? "opacity-50" : ""}`}>
            {saving ? "Creation..." : "Creer l'abonnement"}
          </button>
        </div>
      </AdminModal>

      {/* Edit subscription modal */}
      <AdminModal open={showEditForm} onClose={() => setShowEditForm(false)} title="Modifier l'abonnement">
        {editSub && (
          <div className="space-y-3">
            <div className="px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt rounded-lg text-sm">
              <p className="font-semibold text-neutral-text dark:text-admin-text">{editSub.profiles?.full_name}</p>
              <p className="text-neutral-muted dark:text-admin-muted text-[12px]">{editSub.profiles?.email} — {appMap[editSub.app_id]?.name || editSub.app_id}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Plan</label>
                <input value={editData.plan} onChange={e => setEditData(p => ({ ...p, plan: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
              </div>
              <div>
                <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Prix (FCFA)</label>
                <input type="number" value={editData.price} onChange={e => setEditData(p => ({ ...p, price: Number(e.target.value) }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Fin essai</label>
                <input type="date" value={editData.trial_ends_at} onChange={e => setEditData(p => ({ ...p, trial_ends_at: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
              </div>
              <div>
                <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Fin periode</label>
                <input type="date" value={editData.current_period_end} onChange={e => setEditData(p => ({ ...p, current_period_end: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
              </div>
            </div>
            <button onClick={handleEditSub} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold dark:bg-admin-accent-dark transition-colors w-full mt-4 ${saving ? "opacity-50" : ""}`}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
