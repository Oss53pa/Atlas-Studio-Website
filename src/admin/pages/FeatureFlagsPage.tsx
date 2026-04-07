import { useState, useEffect } from "react";
import { Flag, Plus, Pencil, Trash2, Search, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { useAppCatalog } from "../../hooks/useAppCatalog";

interface FeatureFlag {
  id: string;
  product_id: string | null;
  name: string;
  description: string | null;
  enabled_global: boolean;
  rollout_percentage: number;
  tenant_overrides: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export default function FeatureFlagsPage() {
  const { success, error: showError } = useToast();
  const { appMap, appList } = useAppCatalog();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editFlag, setEditFlag] = useState<Partial<FeatureFlag> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchFlags = async () => {
    const { data } = await supabase.from("feature_flags").select("*").order("created_at", { ascending: false });
    setFlags(data as FeatureFlag[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchFlags(); }, []);

  const filtered = search
    ? flags.filter(f => f.name.toLowerCase().includes(search.toLowerCase()) || (f.description || "").toLowerCase().includes(search.toLowerCase()))
    : flags;

  const toggleGlobal = async (flag: FeatureFlag) => {
    const { error } = await supabase.from("feature_flags").update({ enabled_global: !flag.enabled_global, updated_at: new Date().toISOString() }).eq("id", flag.id);
    if (error) { console.error("Update error:", error); showError?.(`Erreur: ${error.message}`); }
    fetchFlags();
    success(`${flag.name} ${flag.enabled_global ? "désactivé" : "activé"} globalement`);
  };

  const openCreate = () => {
    setEditFlag({ name: "", description: "", product_id: null, enabled_global: false, rollout_percentage: 0, tenant_overrides: {} });
    setIsNew(true);
  };

  const openEdit = (flag: FeatureFlag) => { setEditFlag(flag); setIsNew(false); };

  const handleSave = async () => {
    if (!editFlag?.name) return;
    setSaving(true);
    const row = {
      name: editFlag.name, description: editFlag.description || null,
      product_id: editFlag.product_id || null, enabled_global: editFlag.enabled_global || false,
      rollout_percentage: editFlag.rollout_percentage || 0,
      tenant_overrides: editFlag.tenant_overrides || {},
      updated_at: new Date().toISOString(),
    };
    const { error } = isNew
      ? await supabase.from("feature_flags").insert(row)
      : await supabase.from("feature_flags").update(row).eq("id", editFlag.id);
    setSaving(false);
    if (error) showError(`Erreur: ${error.message}`);
    else { success(isNew ? "Feature flag créé" : "Feature flag mis à jour"); setEditFlag(null); fetchFlags(); }
  };

  const handleDelete = (flag: FeatureFlag) => {
    setConfirmDialog({
      open: true, title: "Supprimer ce feature flag ?", message: `"${flag.name}" sera supprimé définitivement.`,
      onConfirm: async () => {
        await supabase.from("feature_flags").delete().eq("id", flag.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Feature flag supprimé"); fetchFlags();
      },
    });
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";
  const enabledCount = flags.filter(f => f.enabled_global).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Feature Flags</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{flags.length} flags — {enabledCount} actifs</p>
        </div>
        <button onClick={openCreate} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouveau flag
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
      </div>

      <AdminTable
        keyExtractor={(r: FeatureFlag) => r.id}
        loading={loading}
        emptyMessage="Aucun feature flag"
        emptyIcon={<Flag size={32} />}
        onRowClick={openEdit}
        columns={[
          { key: "name", label: "Nom", sortable: true, render: (r: FeatureFlag) => (
            <div>
              <div className="font-medium text-neutral-text dark:text-admin-text">{r.name}</div>
              {r.description && <div className="text-neutral-muted dark:text-admin-muted text-[11px] truncate max-w-[300px]">{r.description}</div>}
            </div>
          )},
          { key: "product_id", label: "Produit", render: (r: FeatureFlag) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{r.product_id ? appMap[r.product_id]?.name || r.product_id : "Global"}</span>
          )},
          { key: "enabled_global", label: "Statut", render: (r: FeatureFlag) => (
            <button onClick={e => { e.stopPropagation(); toggleGlobal(r); }}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                r.enabled_global ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400" : "bg-neutral-100 dark:bg-admin-surface-alt text-neutral-500 dark:text-admin-muted"
              }`}>
              {r.enabled_global ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {r.enabled_global ? "Actif" : "Inactif"}
            </button>
          )},
          { key: "rollout_percentage", label: "Rollout", render: (r: FeatureFlag) => (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-warm-bg dark:bg-admin-surface-alt rounded-full overflow-hidden">
                <div className="h-full bg-gold dark:bg-admin-accent rounded-full" style={{ width: `${r.rollout_percentage}%` }} />
              </div>
              <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono">{r.rollout_percentage}%</span>
            </div>
          )},
          { key: "overrides", label: "Overrides", render: (r: FeatureFlag) => {
            const count = Object.keys(r.tenant_overrides || {}).length;
            return count > 0 ? <span className="text-[11px] text-gold dark:text-admin-accent font-medium">{count} tenant(s)</span> : <span className="text-[11px] text-neutral-muted dark:text-admin-muted">—</span>;
          }},
          { key: "actions", label: "", render: (r: FeatureFlag) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Edit/Create modal */}
      <AdminModal open={!!editFlag} onClose={() => setEditFlag(null)} title={isNew ? "Nouveau feature flag" : `Modifier ${editFlag?.name || ""}`}
        footer={
          <>
            <button onClick={() => setEditFlag(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : isNew ? "Créer" : "Sauvegarder"}</button>
          </>
        }>
        {editFlag && (
          <div className="space-y-4">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Nom du flag</label>
              <input value={editFlag.name || ""} onChange={e => setEditFlag({ ...editFlag, name: e.target.value })} placeholder="enable_new_dashboard" className={`${inputClass} font-mono`} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Description</label>
              <textarea value={editFlag.description || ""} onChange={e => setEditFlag({ ...editFlag, description: e.target.value })} rows={2} className={`${inputClass} resize-y`} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Produit (optionnel)</label>
              <select value={editFlag.product_id || ""} onChange={e => setEditFlag({ ...editFlag, product_id: e.target.value || null })} className={inputClass}>
                <option value="">Global (tous les produits)</option>
                {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Activé globalement</label>
                <button onClick={() => setEditFlag({ ...editFlag, enabled_global: !editFlag.enabled_global })}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                    editFlag.enabled_global ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30" : "bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted border border-warm-border dark:border-admin-surface-alt"
                  }`}>
                  {editFlag.enabled_global ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {editFlag.enabled_global ? "Activé" : "Désactivé"}
                </button></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Rollout %</label>
                <input type="number" min={0} max={100} value={editFlag.rollout_percentage || 0} onChange={e => setEditFlag({ ...editFlag, rollout_percentage: Math.min(100, Math.max(0, Number(e.target.value))) })} className={inputClass} /></div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
