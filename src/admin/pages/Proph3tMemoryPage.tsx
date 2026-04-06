import { useState, useEffect } from "react";
import { Brain, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilterPills } from "../components/AdminFilterPills";
import { AdminButton } from "../components/AdminButton";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";

interface Memory {
  id: string;
  memory_type: string;
  subject: string | null;
  content: string;
  entity_type: string | null;
  entity_id: string | null;
  confidence: number;
  times_referenced: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  user_preference: "Préférence utilisateur",
  business_context: "Contexte métier",
  decision: "Décision",
  alert_dismissed: "Alerte ignorée",
  learned_pattern: "Pattern appris",
  entity_note: "Note entité",
};

const TYPE_COLORS: Record<string, string> = {
  user_preference: "bg-blue-500/20 text-blue-400",
  business_context: "bg-emerald-500/20 text-emerald-400",
  decision: "bg-purple-500/20 text-purple-400",
  alert_dismissed: "bg-neutral-500/20 text-neutral-400",
  learned_pattern: "bg-amber-500/20 text-amber-400",
  entity_note: "bg-cyan-500/20 text-cyan-400",
};

export default function Proph3tMemoryPage() {
  const { success } = useToast();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [detailMemory, setDetailMemory] = useState<Memory | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchMemories = async () => {
    const { data } = await supabase.from("proph3t_memory").select("*").order("times_referenced", { ascending: false });
    setMemories(data as Memory[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchMemories(); }, []);

  const filtered = memories.filter(m => {
    if (typeFilter !== "all" && m.memory_type !== typeFilter) return false;
    if (search && !(m.subject || "").toLowerCase().includes(search.toLowerCase()) && !m.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const deleteMemory = (m: Memory) => {
    setConfirmDialog({
      open: true, title: "Supprimer cette mémoire ?", message: `"${m.subject || m.content.slice(0, 50)}" sera supprimée.`,
      onConfirm: async () => {
        await supabase.from("proph3t_memory").delete().eq("id", m.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Mémoire supprimée"); fetchMemories();
      },
    });
  };

  const bulkDelete = (ids: string[]) => {
    setConfirmDialog({
      open: true, title: `Supprimer ${ids.length} mémoire(s) ?`, message: "Cette action est irréversible.",
      onConfirm: async () => {
        await supabase.from("proph3t_memory").delete().in("id", ids);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success(`${ids.length} mémoire(s) supprimée(s)`); fetchMemories();
      },
    });
  };

  const typeFilters = [
    { label: "Toutes", value: "all", count: memories.length },
    ...Object.entries(TYPE_LABELS).map(([key, label]) => ({
      label, value: key, count: memories.filter(m => m.memory_type === key).length,
    })).filter(f => f.count > 0),
  ];

  return (
    <div>
      <AdminPageHeader title="Mémoire Proph3t" subtitle={`${memories.length} mémoires actives — ${memories.reduce((s, m) => s + m.times_referenced, 0)} références totales`}>
        <AdminButton icon={RefreshCw} variant="secondary" onClick={fetchMemories}>Rafraîchir</AdminButton>
      </AdminPageHeader>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <AdminFilterPills filters={typeFilters} value={typeFilter} onChange={setTypeFilter} />
        <AdminSearch value={search} onChange={setSearch} placeholder="Rechercher dans les mémoires..." />
      </div>

      <AdminTable
        keyExtractor={(r: Memory) => r.id}
        loading={loading}
        selectable
        bulkActions={[{ label: "Supprimer", onClick: bulkDelete, variant: "danger" }]}
        emptyMessage="Aucune mémoire enregistrée"
        emptyIcon={<Brain size={32} />}
        onRowClick={setDetailMemory}
        columns={[
          { key: "memory_type", label: "Type", render: (r: Memory) => (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_COLORS[r.memory_type] || "bg-neutral-500/20 text-neutral-400"}`}>
              {TYPE_LABELS[r.memory_type] || r.memory_type}
            </span>
          )},
          { key: "subject", label: "Sujet", render: (r: Memory) => (
            <div>
              <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium">{r.subject || "—"}</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] truncate max-w-[300px]">{r.content}</div>
            </div>
          )},
          { key: "times_referenced", label: "Utilisations", sortable: true, render: (r: Memory) => (
            <span className="font-mono text-[13px]">{r.times_referenced}</span>
          )},
          { key: "confidence", label: "Confiance", render: (r: Memory) => (
            <div className="flex items-center gap-2">
              <div className="w-12 h-1.5 bg-warm-bg dark:bg-admin-surface-alt rounded-full overflow-hidden">
                <div className="h-full bg-gold dark:bg-admin-accent rounded-full" style={{ width: `${r.confidence * 100}%` }} />
              </div>
              <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono">{Math.round(r.confidence * 100)}%</span>
            </div>
          )},
          { key: "created_at", label: "Créée", sortable: true, render: (r: Memory) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
          )},
          { key: "actions", label: "", render: (r: Memory) => (
            <button onClick={e => { e.stopPropagation(); deleteMemory(r); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
          )},
        ]}
        data={filtered}
      />

      <AdminModal open={!!detailMemory} onClose={() => setDetailMemory(null)} title="Détail mémoire" size="md">
        {detailMemory && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${TYPE_COLORS[detailMemory.memory_type] || ""}`}>
                {TYPE_LABELS[detailMemory.memory_type] || detailMemory.memory_type}
              </span>
              <span className="text-neutral-muted dark:text-admin-muted text-[12px]">Confiance {Math.round(detailMemory.confidence * 100)}%</span>
            </div>
            {detailMemory.subject && (
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Sujet</div>
                <div className="text-neutral-text dark:text-admin-text text-sm font-medium">{detailMemory.subject}</div></div>
            )}
            <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Contenu</div>
              <div className="text-neutral-text dark:text-admin-text text-sm whitespace-pre-wrap bg-warm-bg dark:bg-admin-surface-alt p-4 rounded-lg">{detailMemory.content}</div></div>
            <div className="grid grid-cols-3 gap-4 text-[12px]">
              <div><span className="text-neutral-muted dark:text-admin-muted">Utilisations:</span> <span className="font-mono font-medium">{detailMemory.times_referenced}</span></div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Créée:</span> {new Date(detailMemory.created_at).toLocaleDateString("fr-FR")}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Dernière utilisation:</span> {detailMemory.last_used_at ? new Date(detailMemory.last_used_at).toLocaleDateString("fr-FR") : "Jamais"}</div>
            </div>
            {detailMemory.entity_type && (
              <div className="text-[12px] text-neutral-muted dark:text-admin-muted">Entité: {detailMemory.entity_type} / {detailMemory.entity_id || "—"}</div>
            )}
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
