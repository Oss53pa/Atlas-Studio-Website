import { useState, useEffect } from "react";
import { Rocket, Plus, RotateCcw, Search, CheckCircle2, XCircle, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";

interface Deployment {
  id: string;
  product_id: string | null;
  version: string;
  environment: string;
  status: string;
  changelog_public: string | null;
  changelog_internal: string | null;
  deployed_at: string;
}

const ENV_COLORS: Record<string, string> = {
  production: "bg-green-500/20 text-green-400 border-green-500/30",
  staging: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  dev: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  deployed: <CheckCircle2 size={14} className="text-green-500" />,
  deploying: <Clock size={14} className="text-amber-500 animate-spin" />,
  failed: <XCircle size={14} className="text-red-500" />,
  rolled_back: <ArrowLeft size={14} className="text-neutral-500" />,
};

export default function DeploymentsPage() {
  const { success, error: showError } = useToast();
  const { appMap, appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ product_id: "", version: "", environment: "production", changelog_public: "", changelog_internal: "" });
  const [saving, setSaving] = useState(false);
  const [detailDeploy, setDetailDeploy] = useState<Deployment | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchDeployments = async () => {
    const { data } = await supabase.from("deployments").select("*").order("deployed_at", { ascending: false });
    setDeployments(data as Deployment[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchDeployments(); }, []);

  const filtered = deployments.filter(d => {
    if (selectedApp !== "all" && d.product_id !== selectedApp) return false;
    if (search && !d.version.toLowerCase().includes(search.toLowerCase()) && !(appMap[d.product_id || ""]?.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleCreate = async () => {
    if (!formData.version) return;
    setSaving(true);
    const { error } = await supabase.from("deployments").insert({
      product_id: formData.product_id || null, version: formData.version,
      environment: formData.environment, status: "deployed",
      changelog_public: formData.changelog_public || null,
      changelog_internal: formData.changelog_internal || null,
    });
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success(`Déploiement v${formData.version} enregistré`); setShowForm(false); fetchDeployments(); }
  };

  const rollback = (deploy: Deployment) => {
    setConfirmDialog({
      open: true, title: "Rollback ce déploiement ?", message: `v${deploy.version} sera marqué comme "rolled_back".`,
      onConfirm: async () => {
        const { error } = await supabase.from("deployments").update({ status: "rolled_back", rolled_back_at: new Date().toISOString() } as any).eq("id", deploy.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        if (error) { console.error("Update error:", error); showError?.(`Erreur: ${error.message}`); }
        else { success("Déploiement rollbacké"); }
        fetchDeployments();
      },
    });
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Déploiements</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{deployments.length} déploiements enregistrés</p>
        </div>
        <button onClick={() => { setFormData({ product_id: appList[0]?.id || "", version: "", environment: "production", changelog_public: "", changelog_internal: "" }); setShowForm(true); }}
          className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouveau déploiement
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher version, produit..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
      </div>

      <AdminTable
        keyExtractor={(r: Deployment) => r.id}
        loading={loading}
        emptyMessage="Aucun déploiement"
        emptyIcon={<Rocket size={32} />}
        onRowClick={setDetailDeploy}
        columns={[
          { key: "version", label: "Version", sortable: true, render: (r: Deployment) => (
            <span className="font-mono text-neutral-text dark:text-admin-text font-medium">v{r.version}</span>
          )},
          { key: "product_id", label: "Produit", render: (r: Deployment) => (
            <span className="text-[13px]">{r.product_id ? appMap[r.product_id]?.name || r.product_id : "Platform"}</span>
          )},
          { key: "environment", label: "Environnement", render: (r: Deployment) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${ENV_COLORS[r.environment] || ENV_COLORS.dev}`}>
              {r.environment}
            </span>
          )},
          { key: "status", label: "Statut", render: (r: Deployment) => (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
              {STATUS_ICONS[r.status]} {r.status === "deployed" ? "Déployé" : r.status === "deploying" ? "En cours" : r.status === "failed" ? "Échoué" : "Rollbacké"}
            </span>
          )},
          { key: "deployed_at", label: "Date", sortable: true, render: (r: Deployment) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.deployed_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          )},
          { key: "actions", label: "", render: (r: Deployment) => (
            r.status === "deployed" ? (
              <button onClick={e => { e.stopPropagation(); rollback(r); }} className="px-2 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors flex items-center gap-1">
                <RotateCcw size={12} /> Rollback
              </button>
            ) : null
          )},
        ]}
        data={filtered}
      />

      {/* Create modal */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Nouveau déploiement"
        footer={<button onClick={handleCreate} disabled={saving || !formData.version} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : "Enregistrer"}</button>}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Produit</label>
              <select value={formData.product_id} onChange={e => setFormData(p => ({ ...p, product_id: e.target.value }))} className={inputClass}>
                <option value="">Platform</option>
                {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Version</label>
              <input value={formData.version} onChange={e => setFormData(p => ({ ...p, version: e.target.value }))} placeholder="1.2.3" className={`${inputClass} font-mono`} /></div>
          </div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Environnement</label>
            <select value={formData.environment} onChange={e => setFormData(p => ({ ...p, environment: e.target.value }))} className={inputClass}>
              <option value="production">Production</option><option value="staging">Staging</option><option value="dev">Dev</option>
            </select></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Changelog public</label>
            <textarea value={formData.changelog_public} onChange={e => setFormData(p => ({ ...p, changelog_public: e.target.value }))} rows={3} placeholder="Ce qui est visible par les clients..." className={`${inputClass} resize-y`} /></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Notes internes</label>
            <textarea value={formData.changelog_internal} onChange={e => setFormData(p => ({ ...p, changelog_internal: e.target.value }))} rows={2} placeholder="Notes techniques..." className={`${inputClass} resize-y`} /></div>
        </div>
      </AdminModal>

      {/* Detail modal */}
      <AdminModal open={!!detailDeploy} onClose={() => setDetailDeploy(null)} title={detailDeploy ? `Déploiement v${detailDeploy.version}` : ""} size="md">
        {detailDeploy && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Produit</div>
                <div className="text-neutral-text dark:text-admin-text text-sm">{detailDeploy.product_id ? appMap[detailDeploy.product_id]?.name || detailDeploy.product_id : "Platform"}</div></div>
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Environnement</div>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${ENV_COLORS[detailDeploy.environment]}`}>{detailDeploy.environment}</span></div>
            </div>
            <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Date</div>
              <div className="text-neutral-text dark:text-admin-text text-sm">{new Date(detailDeploy.deployed_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "medium" })}</div></div>
            {detailDeploy.changelog_public && (
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Changelog public</div>
                <div className="text-neutral-text dark:text-admin-text text-sm whitespace-pre-wrap bg-warm-bg dark:bg-admin-surface-alt p-4 rounded-lg">{detailDeploy.changelog_public}</div></div>
            )}
            {detailDeploy.changelog_internal && (
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Notes internes</div>
                <div className="text-neutral-text dark:text-admin-text text-sm whitespace-pre-wrap bg-warm-bg dark:bg-admin-surface-alt p-4 rounded-lg">{detailDeploy.changelog_internal}</div></div>
            )}
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
