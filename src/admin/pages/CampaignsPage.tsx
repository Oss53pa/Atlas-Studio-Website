import { useState, useEffect } from "react";
import { Send, Plus, Pencil, Trash2, Search, Calendar, Users, Eye, BarChart3 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  html_body: string | null;
  segment: Record<string, any>;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  recipient_count: number;
  open_count: number;
  click_count: number;
  created_at: string;
}

const STATUS_MAP: Record<string, string> = {
  draft: "Brouillon", scheduled: "Planifiée", sending: "En cours", sent: "Envoyée", cancelled: "Annulée",
};

export default function CampaignsPage() {
  const { success, error: showError } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editCampaign, setEditCampaign] = useState<Partial<Campaign> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchCampaigns = async () => {
    const { data } = await supabase.from("newsletter_campaigns").select("*").order("created_at", { ascending: false });
    setCampaigns(data as Campaign[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchCampaigns(); }, []);

  const filtered = search ? campaigns.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.subject.toLowerCase().includes(search.toLowerCase())) : campaigns;

  const openCreate = () => {
    setEditCampaign({ name: "", subject: "", html_body: "", status: "draft", scheduled_at: null });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editCampaign?.name || !editCampaign?.subject) return;
    setSaving(true);
    const row = {
      name: editCampaign.name, subject: editCampaign.subject,
      html_body: editCampaign.html_body || null,
      status: editCampaign.status || "draft",
      scheduled_at: editCampaign.scheduled_at || null,
    };
    const { error } = isNew
      ? await supabase.from("newsletter_campaigns").insert(row)
      : await supabase.from("newsletter_campaigns").update(row).eq("id", editCampaign.id);
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success(isNew ? "Campagne créée" : "Campagne mise à jour"); setEditCampaign(null); fetchCampaigns(); }
  };

  const handleDelete = (c: Campaign) => {
    setConfirmDialog({
      open: true, title: "Supprimer cette campagne ?", message: `"${c.name}" sera supprimée.`,
      onConfirm: async () => {
        await supabase.from("newsletter_campaigns").delete().eq("id", c.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Campagne supprimée"); fetchCampaigns();
      },
    });
  };

  const sendCampaign = async (c: Campaign) => {
    // Get subscriber count
    const { count } = await supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true);
    await supabase.from("newsletter_campaigns").update({
      status: "sent", sent_at: new Date().toISOString(), recipient_count: count || 0,
    }).eq("id", c.id);
    fetchCampaigns();
    success(`Campagne envoyée à ${count || 0} abonné(s)`);
  };

  const totalSent = campaigns.filter(c => c.status === "sent").length;
  const totalRecipients = campaigns.reduce((s, c) => s + c.recipient_count, 0);
  const avgOpenRate = campaigns.filter(c => c.recipient_count > 0).length > 0
    ? Math.round(campaigns.reduce((s, c) => s + (c.recipient_count > 0 ? (c.open_count / c.recipient_count) * 100 : 0), 0) / Math.max(1, campaigns.filter(c => c.recipient_count > 0).length))
    : 0;

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Campagnes Newsletter</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{campaigns.length} campagnes — {totalSent} envoyées — {totalRecipients} emails envoyés</p>
        </div>
        <button onClick={openCreate} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouvelle campagne
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
          <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Campagnes envoyées</div>
          <div className="text-gold dark:text-admin-accent text-2xl font-mono font-semibold">{totalSent}</div>
        </div>
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
          <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Total emails</div>
          <div className="text-gold dark:text-admin-accent text-2xl font-mono font-semibold">{totalRecipients.toLocaleString("fr-FR")}</div>
        </div>
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-5">
          <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Taux d'ouverture moy.</div>
          <div className="text-gold dark:text-admin-accent text-2xl font-mono font-semibold">{avgOpenRate}%</div>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
      </div>

      <AdminTable
        keyExtractor={(r: Campaign) => r.id}
        loading={loading}
        emptyMessage="Aucune campagne"
        emptyIcon={<Send size={32} />}
        onRowClick={r => { setEditCampaign(r); setIsNew(false); }}
        columns={[
          { key: "name", label: "Campagne", sortable: true, render: (r: Campaign) => (
            <div>
              <div className="font-medium text-neutral-text dark:text-admin-text">{r.name}</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.subject}</div>
            </div>
          )},
          { key: "status", label: "Statut", render: (r: Campaign) => (
            <AdminBadge status={r.status === "sent" ? "paid" : r.status === "draft" ? "trial" : r.status === "scheduled" ? "pending" : r.status === "sending" ? "active" : "cancelled"} label={STATUS_MAP[r.status] || r.status} />
          )},
          { key: "recipient_count", label: "Destinataires", render: (r: Campaign) => (
            <span className="font-mono text-[13px]">{r.recipient_count || "—"}</span>
          )},
          { key: "stats", label: "Performance", render: (r: Campaign) => r.recipient_count > 0 ? (
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1"><Eye size={10} /> {Math.round((r.open_count / r.recipient_count) * 100)}%</span>
              <span className="flex items-center gap-1"><BarChart3 size={10} /> {r.click_count} clics</span>
            </div>
          ) : <span className="text-[11px] text-neutral-muted dark:text-admin-muted">—</span> },
          { key: "created_at", label: "Date", sortable: true, render: (r: Campaign) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.sent_at || r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
          )},
          { key: "actions", label: "", render: (r: Campaign) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              {r.status === "draft" && <button onClick={() => sendCampaign(r)} className="px-2 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors flex items-center gap-1"><Send size={10} /> Envoyer</button>}
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={filtered}
      />

      <AdminModal open={!!editCampaign} onClose={() => setEditCampaign(null)} title={isNew ? "Nouvelle campagne" : `Modifier : ${editCampaign?.name || ""}`} size="xl"
        footer={
          <>
            <button onClick={() => setEditCampaign(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : isNew ? "Créer" : "Sauvegarder"}</button>
          </>
        }>
        {editCampaign && (
          <div className="space-y-4">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Nom de la campagne</label>
              <input value={editCampaign.name || ""} onChange={e => setEditCampaign({ ...editCampaign, name: e.target.value })} placeholder="ex: Newsletter Avril 2026" className={inputClass} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Sujet de l'email</label>
              <input value={editCampaign.subject || ""} onChange={e => setEditCampaign({ ...editCampaign, subject: e.target.value })} className={inputClass} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Contenu HTML</label>
              <textarea value={editCampaign.html_body || ""} onChange={e => setEditCampaign({ ...editCampaign, html_body: e.target.value })} rows={12}
                className={`${inputClass} resize-y font-mono text-[12px]`} placeholder="<h1>Votre newsletter...</h1>" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut</label>
                <select value={editCampaign.status || "draft"} onChange={e => setEditCampaign({ ...editCampaign, status: e.target.value })} className={inputClass}>
                  <option value="draft">Brouillon</option><option value="scheduled">Planifiée</option>
                </select></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Date d'envoi planifié</label>
                <input type="datetime-local" value={editCampaign.scheduled_at ? new Date(editCampaign.scheduled_at).toISOString().slice(0, 16) : ""} onChange={e => setEditCampaign({ ...editCampaign, scheduled_at: e.target.value || null })} className={inputClass} /></div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
