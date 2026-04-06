import { useState, useEffect } from "react";
import { Plus, Download, Pencil, Search } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { useToast } from "../contexts/ToastContext";
import { exportToCSV } from "../../lib/csvExport";
import type { Subscription, SubscriptionStatus, Profile } from "../../lib/database.types";

interface SubWithProfile extends Subscription {
  profiles?: { full_name: string; email: string } | null;
}

const statusFilters = [
  { label: "Tous", value: "all" },
  { label: "Actifs", value: "active" },
  { label: "Essai", value: "trial" },
  { label: "Suspendus", value: "suspended" },
  { label: "Annulés", value: "cancelled" },
];

export default function SubscriptionsPage() {
  const { appMap, appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const { success, error: showError } = useToast();
  const [subs, setSubs] = useState<SubWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editSub, setEditSub] = useState<SubWithProfile | null>(null);
  const [clients, setClients] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({ user_id: "", app_id: "", plan: "", price: 0, status: "active" as string });
  const [editData, setEditData] = useState({ plan: "", price: 0, trial_ends_at: "", current_period_end: "" });
  const [saving, setSaving] = useState(false);

  const fetchSubs = async () => {
    const { data } = await supabase.from("subscriptions").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
    if (data) setSubs(data as SubWithProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchSubs(); }, []);

  const filtered = subs.filter(s => {
    if (filter !== "all" && s.status !== filter) return false;
    if (selectedApp !== "all" && s.app_id !== selectedApp) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(s.profiles?.full_name || "").toLowerCase().includes(q) && !(s.profiles?.email || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const counts = statusFilters.reduce((acc, f) => {
    acc[f.value] = f.value === "all" ? subs.length : subs.filter(s => s.status === f.value).length;
    return acc;
  }, {} as Record<string, number>);

  const updateStatus = async (sub: SubWithProfile, status: SubscriptionStatus) => {
    const updates: Partial<Subscription> = { status, updated_at: new Date().toISOString() };
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();
    await supabase.from("subscriptions").update(updates).eq("id", sub.id);
    fetchSubs();
    success(`Abonnement ${status === "active" ? "activé" : status === "suspended" ? "suspendu" : status === "trial" ? "en essai" : "annulé"}`);
  };

  const bulkCancel = async (ids: string[]) => {
    await supabase.from("subscriptions").update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() }).in("id", ids);
    fetchSubs();
    success(`${ids.length} abonnement(s) annulé(s)`);
  };

  const bulkSuspend = async (ids: string[]) => {
    await supabase.from("subscriptions").update({ status: "suspended", updated_at: new Date().toISOString() }).in("id", ids);
    fetchSubs();
    success(`${ids.length} abonnement(s) suspendu(s)`);
  };

  const openCreateForm = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setClients(data as Profile[] || []);
    setFormData({ user_id: "", app_id: appList[0]?.id || "", plan: "", price: 0, status: "active" });
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
      user_id: formData.user_id, app_id: formData.app_id, plan: formData.plan,
      status: formData.status as SubscriptionStatus, price_at_subscription: formData.price,
      trial_ends_at: isTrial ? new Date(Date.now() + 14 * 86400000).toISOString() : null,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
    setSaving(false);
    if (error) showError(`Erreur: ${error.message}`);
    else { success("Abonnement créé"); setShowForm(false); fetchSubs(); }
  };

  const handleEditSub = async () => {
    if (!editSub) return;
    setSaving(true);
    const updates: Record<string, any> = { plan: editData.plan, price_at_subscription: editData.price, updated_at: new Date().toISOString() };
    if (editData.trial_ends_at) updates.trial_ends_at = new Date(editData.trial_ends_at).toISOString();
    if (editData.current_period_end) updates.current_period_end = new Date(editData.current_period_end).toISOString();
    await supabase.from("subscriptions").update(updates).eq("id", editSub.id);
    setSaving(false);
    success("Abonnement mis à jour");
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
    ], "abonnements");
    success("Export CSV téléchargé");
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Abonnements</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{subs.length} abonnements — {counts.active || 0} actifs</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
            <Download size={14} /> CSV
          </button>
          <button onClick={openCreateForm} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouvel abonnement
          </button>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f.value
                  ? "bg-gold dark:bg-admin-accent text-onyx"
                  : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{counts[f.value] || 0}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher client..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
        </div>
      </div>

      <AdminTable
        keyExtractor={(r: SubWithProfile) => r.id}
        loading={loading}
        selectable
        bulkActions={[
          { label: "Suspendre", onClick: bulkSuspend },
          { label: "Annuler", onClick: bulkCancel, variant: "danger" },
        ]}
        emptyMessage="Aucun abonnement"
        columns={[
          { key: "user", label: "Client", render: (r: SubWithProfile) => (
            <div>
              <div className="font-medium text-neutral-text dark:text-admin-text">{r.profiles?.full_name || "—"}</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "app_id", label: "Application", sortable: true, render: (r: SubWithProfile) => (
            <span className="text-[13px]">{appMap[r.app_id]?.name || r.app_id}</span>
          )},
          { key: "plan", label: "Plan", sortable: true, render: (r: SubWithProfile) => <span className="capitalize">{r.plan || "—"}</span> },
          { key: "price_at_subscription", label: "Prix", sortable: true, render: (r: SubWithProfile) => (
            <span className="font-mono">{Number(r.price_at_subscription || 0).toLocaleString("fr-FR")} FCFA</span>
          )},
          { key: "status", label: "Statut", render: (r: SubWithProfile) => <AdminBadge status={r.status} /> },
          { key: "current_period_end", label: "Fin période", sortable: true, render: (r: SubWithProfile) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{r.current_period_end ? new Date(r.current_period_end).toLocaleDateString("fr-FR") : "—"}</span>
          )},
          { key: "actions", label: "", render: (r: SubWithProfile) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => openEditForm(r)} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors" title="Modifier"><Pencil size={14} /></button>
              {r.status !== "active" && <button onClick={() => updateStatus(r, "active")} className="px-2 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">Activer</button>}
              {r.status === "active" && <button onClick={() => updateStatus(r, "suspended")} className="px-2 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">Suspendre</button>}
              {r.status !== "cancelled" && <button onClick={() => updateStatus(r, "cancelled")} className="px-2 py-1 rounded text-[11px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">Annuler</button>}
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Create modal */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Nouvel abonnement"
        footer={<button onClick={handleCreateSub} disabled={saving || !formData.user_id} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving || !formData.user_id ? "opacity-50" : ""}`}>{saving ? "Création..." : "Créer"}</button>}>
        <div className="space-y-3">
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Client</label>
            <select value={formData.user_id} onChange={e => setFormData(p => ({ ...p, user_id: e.target.value }))} className={ADMIN_INPUT_CLASS}>
              <option value="">Sélectionner un client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
            </select></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Application</label>
            <select value={formData.app_id} onChange={e => setFormData(p => ({ ...p, app_id: e.target.value }))} className={ADMIN_INPUT_CLASS}>
              {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut initial</label>
            <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className={ADMIN_INPUT_CLASS}>
              <option value="active">Actif</option><option value="trial">Essai gratuit (14 jours)</option>
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Plan</label>
              <select value={formData.plan} onChange={e => {
                const plan = e.target.value;
                const price = appMap[formData.app_id] ? (appMap[formData.app_id].pricing as Record<string, number>)[plan] || 0 : 0;
                setFormData(p => ({ ...p, plan, price }));
              }} className={ADMIN_INPUT_CLASS}>
                <option value="">Sélectionner</option>
                {formData.app_id && appMap[formData.app_id] && Object.entries(appMap[formData.app_id].pricing as Record<string, number>).map(([p, pr]) => (
                  <option key={p} value={p}>{p} — {pr.toLocaleString("fr-FR")} FCFA</option>
                ))}
              </select></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Prix (FCFA)</label>
              <input type="number" value={formData.price} onChange={e => setFormData(p => ({ ...p, price: Number(e.target.value) }))} className={ADMIN_INPUT_CLASS} /></div>
          </div>
        </div>
      </AdminModal>

      {/* Edit modal */}
      <AdminModal open={showEditForm} onClose={() => setShowEditForm(false)} title="Modifier l'abonnement"
        subtitle={editSub ? `${editSub.profiles?.full_name} — ${appMap[editSub.app_id]?.name || editSub.app_id}` : undefined}
        footer={<button onClick={handleEditSub} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "Enregistrement..." : "Enregistrer"}</button>}>
        {editSub && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Plan</label>
                <input value={editData.plan} onChange={e => setEditData(p => ({ ...p, plan: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Prix (FCFA)</label>
                <input type="number" value={editData.price} onChange={e => setEditData(p => ({ ...p, price: Number(e.target.value) }))} className={ADMIN_INPUT_CLASS} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Fin essai</label>
                <input type="date" value={editData.trial_ends_at} onChange={e => setEditData(p => ({ ...p, trial_ends_at: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Fin période</label>
                <input type="date" value={editData.current_period_end} onChange={e => setEditData(p => ({ ...p, current_period_end: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
