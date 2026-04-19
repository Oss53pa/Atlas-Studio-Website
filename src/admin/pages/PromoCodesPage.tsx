import { useState, useEffect } from "react";
import { Tag, Plus, Pencil, Trash2, Search, Copy, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

interface PromoCode {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

export default function PromoCodesPage() {
  const { success, error: showError } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editCode, setEditCode] = useState<Partial<PromoCode> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes(data as PromoCode[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchCodes(); }, []);

  const filtered = search ? codes.filter(c => c.code.toLowerCase().includes(search.toLowerCase())) : codes;

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleActive = async (code: PromoCode) => {
    const { error } = await supabase.from("promo_codes").update({ active: !code.active }).eq("id", code.id);
    if (error) { console.error("Update error:", error); showError?.(`Erreur: ${error.message}`); }
    fetchCodes();
    success(code.active ? "Code désactivé" : "Code activé");
  };

  const openCreate = () => {
    const randomCode = `ATLAS${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    setEditCode({ code: randomCode, type: "percentage", value: 10, max_uses: null, active: true, expires_at: null });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editCode?.code) return;
    setSaving(true);
    const row = {
      code: editCode.code.toUpperCase(), type: editCode.type || "percentage",
      value: editCode.value || 0, max_uses: editCode.max_uses || null,
      active: editCode.active ?? true,
      expires_at: editCode.expires_at || null,
    };
    const { error } = isNew
      ? await supabase.from("promo_codes").insert(row)
      : await supabase.from("promo_codes").update(row).eq("id", editCode.id);
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success(isNew ? "Code promo créé" : "Code promo mis à jour"); setEditCode(null); fetchCodes(); }
  };

  const handleDelete = (code: PromoCode) => {
    setConfirmDialog({
      open: true, title: "Supprimer ce code promo ?", message: `"${code.code}" sera supprimé.`,
      onConfirm: async () => {
        await supabase.from("promo_codes").delete().eq("id", code.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Code promo supprimé"); fetchCodes();
      },
    });
  };

  const activeCount = codes.filter(c => c.active).length;
  const totalUses = codes.reduce((s, c) => s + c.used_count, 0);
  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Codes Promo</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{codes.length} codes — {activeCount} actifs — {totalUses} utilisations</p>
        </div>
        <button onClick={openCreate} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouveau code
        </button>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un code..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
      </div>

      <AdminTable
        keyExtractor={(r: PromoCode) => r.id}
        loading={loading}
        emptyMessage="Aucun code promo"
        emptyIcon={<Tag size={32} />}
        onRowClick={r => { setEditCode(r); setIsNew(false); }}
        columns={[
          { key: "code", label: "Code", sortable: true, render: (r: PromoCode) => (
            <div className="flex items-center gap-2">
              <span className="font-mono text-neutral-text dark:text-admin-text font-medium">{r.code}</span>
              <button onClick={e => { e.stopPropagation(); copyCode(r.code, r.id); }} className="p-1 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted transition-colors">
                {copiedId === r.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            </div>
          )},
          { key: "type", label: "Type", render: (r: PromoCode) => (
            <span className="text-[12px]">{r.type === "percentage" ? `${r.value}%` : `${r.value.toLocaleString("fr-FR")} FCFA`}</span>
          )},
          { key: "used_count", label: "Utilisations", render: (r: PromoCode) => (
            <span className="font-mono text-[13px]">{r.used_count}{r.max_uses ? ` / ${r.max_uses}` : ""}</span>
          )},
          { key: "expires_at", label: "Expiration", render: (r: PromoCode) => (
            r.expires_at
              ? <span className={`text-[12px] ${new Date(r.expires_at) < new Date() ? "text-red-500" : "text-neutral-muted dark:text-admin-muted"}`}>{new Date(r.expires_at).toLocaleDateString("fr-FR")}</span>
              : <span className="text-[12px] text-neutral-muted dark:text-admin-muted">Illimité</span>
          )},
          { key: "active", label: "Statut", render: (r: PromoCode) => (
            <button onClick={e => { e.stopPropagation(); toggleActive(r); }}>
              <AdminBadge status={r.active ? "active" : "suspended"} label={r.active ? "Actif" : "Inactif"} />
            </button>
          )},
          { key: "actions", label: "", render: (r: PromoCode) => (
            <button onClick={e => { e.stopPropagation(); handleDelete(r); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
          )},
        ]}
        data={filtered}
      />

      <AdminModal open={!!editCode} onClose={() => setEditCode(null)} title={isNew ? "Nouveau code promo" : `Modifier ${editCode?.code || ""}`}
        footer={
          <>
            <button onClick={() => setEditCode(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : isNew ? "Créer" : "Sauvegarder"}</button>
          </>
        }>
        {editCode && (
          <div className="space-y-4">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Code</label>
              <input value={editCode.code || ""} onChange={e => setEditCode({ ...editCode, code: e.target.value.toUpperCase() })} className={`${inputClass} font-mono`} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Type</label>
                <select value={editCode.type || "percentage"} onChange={e => setEditCode({ ...editCode, type: e.target.value as any })} className={inputClass}>
                  <option value="percentage">Pourcentage (%)</option>
                  <option value="fixed">Montant fixe (FCFA)</option>
                </select></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Valeur</label>
                <input type="number" value={editCode.value || 0} onChange={e => setEditCode({ ...editCode, value: Number(e.target.value) })} className={inputClass} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Utilisations max</label>
                <input type="number" value={editCode.max_uses || ""} onChange={e => setEditCode({ ...editCode, max_uses: e.target.value ? Number(e.target.value) : null })} placeholder="Illimité" className={inputClass} /></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Date d'expiration</label>
                <input type="date" value={editCode.expires_at ? new Date(editCode.expires_at).toISOString().split("T")[0] : ""} onChange={e => setEditCode({ ...editCode, expires_at: e.target.value || null })} className={inputClass} /></div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
