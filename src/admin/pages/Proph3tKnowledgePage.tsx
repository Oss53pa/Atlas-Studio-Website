import { useState, useEffect } from "react";
import { Database, Plus, Trash2, FileText, Loader2, Library, FileUp } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { apiCall } from "../../lib/api";
import { AdminTable } from "../components/AdminTable";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilterPills } from "../components/AdminFilterPills";
import { AdminButton } from "../components/AdminButton";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { ADMIN_INPUT_CLASS } from "../components/AdminFormField";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

// PROPH3T v2 — page connaissance.
// Deux sources distinctes :
//   - proph3t_knowledge_base : référentiel système (SYSCOHADA, OHADA, fiscal…)
//     pré-indexé, géré par l'équipe Atlas. Pas d'upload utilisateur.
//   - proph3t_documents : documents propres au client/société. Uploadés via
//     proph3t-ingest qui chunke + embed en arrière-plan.

type Tab = "kb" | "documents";

interface KnowledgeRow {
  id: string;
  category: string;
  reference: string | null;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  version: string;
  created_at: string;
  updated_at: string;
}

interface DocumentRow {
  id: string;
  title: string;
  source_type: string;
  product: string | null;
  society_id: string | null;
  metadata: Record<string, unknown>;
  page_count: number | null;
  total_chunks: number;
  ingestion_status: "pending" | "processing" | "done" | "failed";
  ingestion_error: string | null;
  created_at: string;
}

const KB_CATEGORIES = ["syscohada", "ohada", "fiscal", "rh", "immobilier", "retail", "sectoriel", "autre"];
const KB_COLORS: Record<string, string> = {
  syscohada: "bg-emerald-500/20 text-emerald-400",
  ohada: "bg-blue-500/20 text-blue-400",
  fiscal: "bg-amber-500/20 text-amber-400",
  rh: "bg-purple-500/20 text-purple-400",
  immobilier: "bg-indigo-500/20 text-indigo-400",
  retail: "bg-cyan-500/20 text-cyan-400",
  sectoriel: "bg-rose-500/20 text-rose-400",
  autre: "bg-neutral-500/20 text-neutral-400",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-neutral-500/20 text-neutral-400",
  processing: "bg-blue-500/20 text-blue-400",
  done: "bg-emerald-500/20 text-emerald-400",
  failed: "bg-red-500/20 text-red-400",
};

export default function Proph3tKnowledgePage() {
  const { success, error: showError } = useToast();
  const [tab, setTab] = useState<Tab>("kb");
  const [kbRows, setKbRows] = useState<KnowledgeRow[]>([]);
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Add KB row modal
  const [showAddKb, setShowAddKb] = useState(false);
  const [savingKb, setSavingKb] = useState(false);
  const [kbForm, setKbForm] = useState({ category: "syscohada", reference: "", title: "", content: "" });

  // Add document modal (text upload — files come later via Storage)
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [docForm, setDocForm] = useState({ title: "", source_type: "manual", product: "", text: "" });

  const [detailKb, setDetailKb] = useState<KnowledgeRow | null>(null);
  const [detailDoc, setDetailDoc] = useState<DocumentRow | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchAll = async () => {
    setLoading(true);
    const [kbRes, docsRes] = await Promise.all([
      supabase.from("proph3t_knowledge_base").select("*").order("category").order("title"),
      supabase.from("proph3t_documents").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setKbRows((kbRes.data as KnowledgeRow[]) || []);
    setDocs((docsRes.data as unknown as DocumentRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSaveKb = async () => {
    if (!kbForm.title.trim() || !kbForm.content.trim()) { showError("Titre et contenu obligatoires"); return; }
    setSavingKb(true);
    // Note: l'embedding sera généré côté serveur lors d'un re-index batch ou via proph3t-ingest.
    // Ici on insère sans embedding — la recherche sémantique reviendra une fois l'embedding ajouté.
    const { error } = await supabase.from("proph3t_knowledge_base").insert({
      category: kbForm.category,
      reference: kbForm.reference.trim() || null,
      title: kbForm.title.trim(),
      content: kbForm.content.trim(),
    });
    setSavingKb(false);
    if (error) showError(formatSupabaseError(error));
    else {
      success("Entrée ajoutée — embedding à indexer côté serveur");
      setShowAddKb(false);
      setKbForm({ category: "syscohada", reference: "", title: "", content: "" });
      fetchAll();
    }
  };

  const handleSaveDoc = async () => {
    if (!docForm.title.trim() || !docForm.text.trim()) { showError("Titre et texte obligatoires"); return; }
    setSavingDoc(true);
    try {
      // Appel à l'edge function proph3t-ingest qui chunke + embed
      await apiCall("proph3t-ingest", {
        method: "POST",
        body: {
          title: docForm.title.trim(),
          source_type: docForm.source_type,
          product: docForm.product.trim() || null,
          text: docForm.text,
        },
      });
      success("Document ingéré");
      setShowAddDoc(false);
      setDocForm({ title: "", source_type: "manual", product: "", text: "" });
      fetchAll();
    } catch (err: unknown) {
      showError(formatSupabaseError(err));
    }
    setSavingDoc(false);
  };

  const deleteKb = (kb: KnowledgeRow) => {
    setConfirmDialog({
      open: true, title: "Supprimer cette entrée ?", message: `"${kb.title}" sera supprimée du référentiel.`,
      onConfirm: async () => {
        const { error } = await supabase.from("proph3t_knowledge_base").delete().eq("id", kb.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        if (error) showError(formatSupabaseError(error));
        else { success("Entrée supprimée"); fetchAll(); }
      },
    });
  };

  const deleteDoc = (d: DocumentRow) => {
    setConfirmDialog({
      open: true, title: "Supprimer ce document ?", message: `"${d.title}" et tous ses chunks (${d.total_chunks}) seront supprimés.`,
      onConfirm: async () => {
        const { error } = await supabase.from("proph3t_documents").delete().eq("id", d.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        if (error) showError(formatSupabaseError(error));
        else { success("Document supprimé"); fetchAll(); }
      },
    });
  };

  const filteredKb = kbRows.filter(k => {
    if (categoryFilter !== "all" && k.category !== categoryFilter) return false;
    if (search && !k.title.toLowerCase().includes(search.toLowerCase()) && !k.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredDocs = docs.filter(d => !search || d.title.toLowerCase().includes(search.toLowerCase()));

  const tabs = [
    { id: "kb", label: "Base de connaissances système", count: kbRows.length, icon: Library },
    { id: "documents", label: "Documents", count: docs.length, icon: FileText },
  ];

  return (
    <div>
      <AdminPageHeader title="Connaissance PROPH3T" subtitle="Référentiel SYSCOHADA/OHADA et documents indexés via RAG vectoriel">
        {tab === "kb" ? (
          <AdminButton icon={Plus} onClick={() => setShowAddKb(true)}>Ajouter une entrée</AdminButton>
        ) : (
          <AdminButton icon={FileUp} onClick={() => setShowAddDoc(true)}>Ingérer un document</AdminButton>
        )}
      </AdminPageHeader>

      <AdminFilterPills
        filters={tabs.map(t => ({ label: t.label, value: t.id, count: t.count }))}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      <div className="flex items-center gap-4 mb-6 mt-4 flex-wrap">
        {tab === "kb" && (
          <AdminFilterPills
            filters={[{ label: "Toutes catégories", value: "all", count: kbRows.length }, ...KB_CATEGORIES.map(c => ({ label: c, value: c, count: kbRows.filter(k => k.category === c).length })).filter(f => f.count > 0)]}
            value={categoryFilter}
            onChange={setCategoryFilter}
          />
        )}
        <AdminSearch value={search} onChange={setSearch} placeholder={`Rechercher dans ${tab === "kb" ? "le référentiel" : "les documents"}…`} />
      </div>

      {tab === "kb" && (
        <AdminTable
          keyExtractor={(r: KnowledgeRow) => r.id}
          loading={loading}
          emptyMessage="Référentiel vide — ajoute des entrées SYSCOHADA / OHADA / fiscal pour activer le RAG"
          emptyIcon={<Library size={32} />}
          onRowClick={setDetailKb}
          columns={[
            { key: "category", label: "Catégorie", render: (r: KnowledgeRow) => (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${KB_COLORS[r.category] || ""}`}>{r.category}</span>
            )},
            { key: "title", label: "Titre", render: (r: KnowledgeRow) => (
              <div>
                <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium">{r.title}</div>
                {r.reference && <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-mono">{r.reference}</div>}
              </div>
            )},
            { key: "content", label: "Contenu", render: (r: KnowledgeRow) => (
              <div className="text-neutral-muted dark:text-admin-muted text-[12px] truncate max-w-[400px]">{r.content.slice(0, 100)}…</div>
            )},
            { key: "version", label: "Version", render: (r: KnowledgeRow) => <span className="font-mono text-[11px]">{r.version}</span> },
            { key: "actions", label: "", render: (r: KnowledgeRow) => (
              <button onClick={(e) => { e.stopPropagation(); deleteKb(r); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            )},
          ]}
          data={filteredKb}
        />
      )}

      {tab === "documents" && (
        <AdminTable
          keyExtractor={(r: DocumentRow) => r.id}
          loading={loading}
          emptyMessage="Aucun document ingéré — clique 'Ingérer un document' pour démarrer"
          emptyIcon={<FileText size={32} />}
          onRowClick={setDetailDoc}
          columns={[
            { key: "title", label: "Titre", render: (r: DocumentRow) => (
              <div>
                <div className="text-neutral-text dark:text-admin-text text-[13px] font-medium">{r.title}</div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.source_type}{r.product ? ` · ${r.product}` : ""}</div>
              </div>
            )},
            { key: "ingestion_status", label: "Statut", render: (r: DocumentRow) => (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.ingestion_status]}`}>
                {r.ingestion_status === "processing" && <Loader2 size={10} className="animate-spin" />}
                {r.ingestion_status}
              </span>
            )},
            { key: "total_chunks", label: "Chunks", render: (r: DocumentRow) => <span className="font-mono text-[12px]">{r.total_chunks}</span> },
            { key: "created_at", label: "Ingéré", sortable: true, render: (r: DocumentRow) => (
              <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}</span>
            )},
            { key: "actions", label: "", render: (r: DocumentRow) => (
              <button onClick={(e) => { e.stopPropagation(); deleteDoc(r); }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            )},
          ]}
          data={filteredDocs}
        />
      )}

      {/* Add KB modal */}
      <AdminModal open={showAddKb} onClose={() => setShowAddKb(false)} title="Ajouter une entrée référentiel"
        footer={<button onClick={handleSaveKb} disabled={savingKb} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 transition-colors text-[13px]">{savingKb ? "Enregistrement…" : "Enregistrer"}</button>}>
        <div className="space-y-3">
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Catégorie</label>
            <select value={kbForm.category} onChange={e => setKbForm(p => ({ ...p, category: e.target.value }))} className={ADMIN_INPUT_CLASS}>
              {KB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Référence (ex: AUDCIF-Art.13, optionnel)</label>
            <input value={kbForm.reference} onChange={e => setKbForm(p => ({ ...p, reference: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Titre *</label>
            <input value={kbForm.title} onChange={e => setKbForm(p => ({ ...p, title: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Contenu *</label>
            <textarea value={kbForm.content} onChange={e => setKbForm(p => ({ ...p, content: e.target.value }))} rows={8} className={ADMIN_INPUT_CLASS} /></div>
          <p className="text-[11px] text-neutral-muted dark:text-admin-muted">L'embedding vectoriel sera calculé en arrière-plan une fois Ollama disponible (ré-indexation batch).</p>
        </div>
      </AdminModal>

      {/* Add document modal (text input — file upload viendra plus tard via Storage) */}
      <AdminModal open={showAddDoc} onClose={() => setShowAddDoc(false)} title="Ingérer un document"
        footer={<button onClick={handleSaveDoc} disabled={savingDoc} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 transition-colors text-[13px]">{savingDoc ? "Ingestion en cours…" : "Ingérer"}</button>}>
        <div className="space-y-3">
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Titre *</label>
            <input value={docForm.title} onChange={e => setDocForm(p => ({ ...p, title: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Type</label>
              <select value={docForm.source_type} onChange={e => setDocForm(p => ({ ...p, source_type: e.target.value }))} className={ADMIN_INPUT_CLASS}>
                <option value="manual">Manuel</option>
                <option value="report">Rapport</option>
                <option value="conversation">Conversation</option>
                <option value="txt">Texte brut</option>
              </select></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Produit (slug)</label>
              <input value={docForm.product} onChange={e => setDocForm(p => ({ ...p, product: e.target.value }))} placeholder="cockpit-fna, advist…" className={ADMIN_INPUT_CLASS} /></div>
          </div>
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Texte à ingérer *</label>
            <textarea value={docForm.text} onChange={e => setDocForm(p => ({ ...p, text: e.target.value }))} rows={10} className={ADMIN_INPUT_CLASS} placeholder="Colle le contenu textuel à indexer (PDF/DOCX seront supportés via Storage en sprint suivant)" /></div>
          <p className="text-[11px] text-neutral-muted dark:text-admin-muted">L'edge function proph3t-ingest chunke en blocs de 500 tokens (overlap 50) et appelle Ollama pour les embeddings.</p>
        </div>
      </AdminModal>

      {/* Detail modals */}
      <AdminModal open={!!detailKb} onClose={() => setDetailKb(null)} title="Détail référentiel" size="lg">
        {detailKb && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${KB_COLORS[detailKb.category] || ""}`}>{detailKb.category}</span>
              {detailKb.reference && <span className="text-[11px] font-mono text-neutral-muted dark:text-admin-muted">{detailKb.reference}</span>}
            </div>
            <h3 className="text-neutral-text dark:text-admin-text text-base font-bold">{detailKb.title}</h3>
            <div className="text-neutral-text dark:text-admin-text text-sm whitespace-pre-wrap bg-warm-bg dark:bg-admin-surface-alt p-4 rounded-lg">{detailKb.content}</div>
          </div>
        )}
      </AdminModal>

      <AdminModal open={!!detailDoc} onClose={() => setDetailDoc(null)} title="Détail document">
        {detailDoc && (
          <div className="space-y-4 text-[13px]">
            <h3 className="text-neutral-text dark:text-admin-text text-base font-bold">{detailDoc.title}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-neutral-muted dark:text-admin-muted">Type:</span> {detailDoc.source_type}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Statut:</span> {detailDoc.ingestion_status}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Chunks:</span> {detailDoc.total_chunks}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Pages:</span> {detailDoc.page_count ?? "—"}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Produit:</span> {detailDoc.product || "—"}</div>
              <div><span className="text-neutral-muted dark:text-admin-muted">Créé:</span> {new Date(detailDoc.created_at).toLocaleDateString("fr-FR")}</div>
            </div>
            {detailDoc.ingestion_error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded text-[12px]">{detailDoc.ingestion_error}</div>
            )}
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />

      {/* Hidden imports placeholders */}
      <span className="hidden"><Database size={1} /></span>
    </div>
  );
}
