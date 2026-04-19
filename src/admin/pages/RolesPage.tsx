import { useState, useEffect } from "react";
import { Shield, Plus, Pencil, Trash2, Search, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

interface AdminRole {
  id: string;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  created_at: string;
}

const ALL_PERMISSIONS = [
  { key: "dashboard.view", label: "Dashboard", group: "Général" },
  { key: "proph3t.use", label: "Proph3t IA", group: "Général" },
  { key: "clients.view", label: "Voir les clients", group: "Clients" },
  { key: "clients.edit", label: "Modifier les clients", group: "Clients" },
  { key: "clients.delete", label: "Supprimer les clients", group: "Clients" },
  { key: "subscriptions.view", label: "Voir les abonnements", group: "Abonnements" },
  { key: "subscriptions.edit", label: "Modifier les abonnements", group: "Abonnements" },
  { key: "invoices.view", label: "Voir les factures", group: "Facturation" },
  { key: "invoices.create", label: "Créer des factures", group: "Facturation" },
  { key: "invoices.edit", label: "Modifier les factures", group: "Facturation" },
  { key: "tickets.view", label: "Voir les tickets", group: "Support" },
  { key: "tickets.reply", label: "Répondre aux tickets", group: "Support" },
  { key: "content.edit", label: "Modifier le contenu", group: "Contenu" },
  { key: "apps.manage", label: "Gérer les applications", group: "Plateforme" },
  { key: "analytics.view", label: "Voir les analytics", group: "Plateforme" },
  { key: "settings.manage", label: "Gérer les paramètres", group: "Plateforme" },
  { key: "roles.manage", label: "Gérer les rôles", group: "Plateforme" },
  { key: "feature_flags.manage", label: "Gérer les feature flags", group: "Plateforme" },
  { key: "deployments.manage", label: "Gérer les déploiements", group: "Plateforme" },
];

export default function RolesPage() {
  const { success, error: showError } = useToast();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRole, setEditRole] = useState<Partial<AdminRole> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchRoles = async () => {
    const { data } = await supabase.from("admin_roles").select("*").order("created_at");
    setRoles(data as AdminRole[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchRoles(); }, []);

  const openCreate = () => {
    const allPerms: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(p => { allPerms[p.key] = false; });
    setEditRole({ name: "", description: "", permissions: allPerms });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editRole?.name) return;
    setSaving(true);
    const row = { name: editRole.name, description: editRole.description || null, permissions: editRole.permissions || {} };
    const { error } = isNew
      ? await supabase.from("admin_roles").insert(row)
      : await supabase.from("admin_roles").update(row).eq("id", editRole.id);
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success(isNew ? "Rôle créé" : "Rôle mis à jour"); setEditRole(null); fetchRoles(); }
  };

  const handleDelete = (role: AdminRole) => {
    setConfirmDialog({
      open: true, title: "Supprimer ce rôle ?", message: `"${role.name}" sera supprimé.`,
      onConfirm: async () => {
        await supabase.from("admin_roles").delete().eq("id", role.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Rôle supprimé"); fetchRoles();
      },
    });
  };

  const togglePermission = (key: string) => {
    if (!editRole) return;
    setEditRole({ ...editRole, permissions: { ...editRole.permissions, [key]: !(editRole.permissions || {})[key] } });
  };

  const selectAll = () => {
    if (!editRole) return;
    const perms: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = true; });
    setEditRole({ ...editRole, permissions: perms });
  };

  const deselectAll = () => {
    if (!editRole) return;
    const perms: Record<string, boolean> = {};
    ALL_PERMISSIONS.forEach(p => { perms[p.key] = false; });
    setEditRole({ ...editRole, permissions: perms });
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  // Group permissions
  const permGroups = ALL_PERMISSIONS.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, typeof ALL_PERMISSIONS>);

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Rôles & Permissions</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{roles.length} rôles configurés</p>
        </div>
        <button onClick={openCreate} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouveau rôle
        </button>
      </div>

      <AdminTable
        keyExtractor={(r: AdminRole) => r.id}
        loading={loading}
        emptyMessage="Aucun rôle configuré"
        emptyIcon={<Shield size={32} />}
        onRowClick={r => { setEditRole(r); setIsNew(false); }}
        columns={[
          { key: "name", label: "Rôle", sortable: true, render: (r: AdminRole) => (
            <span className="font-medium text-neutral-text dark:text-admin-text">{r.name}</span>
          )},
          { key: "description", label: "Description", render: (r: AdminRole) => (
            <span className="text-[13px] text-neutral-muted dark:text-admin-muted">{r.description || "—"}</span>
          )},
          { key: "permissions", label: "Permissions", render: (r: AdminRole) => {
            const granted = Object.values(r.permissions || {}).filter(Boolean).length;
            return <span className="text-[13px] font-mono">{granted}/{ALL_PERMISSIONS.length}</span>;
          }},
          { key: "actions", label: "", render: (r: AdminRole) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditRole(r); setIsNew(false); }} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={roles}
      />

      <AdminModal open={!!editRole} onClose={() => setEditRole(null)} title={isNew ? "Nouveau rôle" : `Modifier : ${editRole?.name || ""}`} size="lg"
        footer={
          <>
            <button onClick={() => setEditRole(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : isNew ? "Créer" : "Sauvegarder"}</button>
          </>
        }>
        {editRole && (
          <div className="space-y-5">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Nom du rôle</label>
              <input value={editRole.name || ""} onChange={e => setEditRole({ ...editRole, name: e.target.value })} placeholder="ex: Support Manager" className={inputClass} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Description</label>
              <input value={editRole.description || ""} onChange={e => setEditRole({ ...editRole, description: e.target.value })} className={inputClass} /></div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold">Permissions</h3>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[11px] text-gold dark:text-admin-accent font-medium hover:underline">Tout sélectionner</button>
                  <button onClick={deselectAll} className="text-[11px] text-neutral-muted dark:text-admin-muted font-medium hover:underline">Tout désélectionner</button>
                </div>
              </div>

              {Object.entries(permGroups).map(([group, perms]) => (
                <div key={group} className="mb-4">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-2">{group}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {perms.map(perm => (
                      <label key={perm.key} className="flex items-center gap-2.5 p-2.5 bg-warm-bg dark:bg-admin-surface-alt rounded-lg cursor-pointer hover:bg-warm-border/50 dark:hover:bg-admin-accent/5 transition-colors">
                        <input type="checkbox" checked={(editRole.permissions || {})[perm.key] || false} onChange={() => togglePermission(perm.key)}
                          className="w-4 h-4 accent-gold dark:accent-admin-accent" />
                        <span className="text-[13px] text-neutral-text dark:text-admin-text">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
