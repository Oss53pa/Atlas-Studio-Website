import { useState, useEffect } from "react";
import { BookOpen, Plus, Pencil, Trash2, Search, Eye, EyeOff, ThumbsUp, ThumbsDown } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";

interface KBArticle {
  id: string;
  product_id: string | null;
  title: string;
  content: string;
  excerpt: string | null;
  status: string;
  views: number;
  helpful_count: number;
  not_helpful_count: number;
  created_at: string;
  updated_at: string;
}

export default function KnowledgeBasePage() {
  const { success, error: showError } = useToast();
  const { appMap, appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editArticle, setEditArticle] = useState<Partial<KBArticle> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchArticles = async () => {
    const { data } = await supabase.from("kb_articles").select("*").order("created_at", { ascending: false });
    setArticles(data as KBArticle[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, []);

  const filtered = articles.filter(a => {
    if (selectedApp !== "all" && a.product_id !== selectedApp) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (search && !a.title.toLowerCase().includes(search.toLowerCase()) && !(a.content || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const publishedCount = articles.filter(a => a.status === "published").length;
  const draftCount = articles.filter(a => a.status === "draft").length;
  const totalViews = articles.reduce((s, a) => s + a.views, 0);

  const openCreate = () => {
    setEditArticle({ title: "", content: "", excerpt: "", product_id: null, status: "draft" });
    setIsNew(true);
  };

  const handleSave = async () => {
    if (!editArticle?.title || !editArticle?.content) return;
    setSaving(true);
    const row = {
      title: editArticle.title, content: editArticle.content,
      excerpt: editArticle.excerpt || null, product_id: editArticle.product_id || null,
      status: editArticle.status || "draft", updated_at: new Date().toISOString(),
    };
    const { error } = isNew
      ? await supabase.from("kb_articles").insert(row)
      : await supabase.from("kb_articles").update(row).eq("id", editArticle.id);
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success(isNew ? "Article créé" : "Article mis à jour"); setEditArticle(null); fetchArticles(); }
  };

  const handleDelete = (article: KBArticle) => {
    setConfirmDialog({
      open: true, title: "Supprimer cet article ?", message: `"${article.title}" sera supprimé.`,
      onConfirm: async () => {
        await supabase.from("kb_articles").delete().eq("id", article.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Article supprimé"); fetchArticles();
      },
    });
  };

  const toggleStatus = async (article: KBArticle) => {
    const newStatus = article.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("kb_articles").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", article.id);
    if (error) { console.error("Update error:", error); showError?.(`Erreur: ${error.message}`); }
    fetchArticles();
    success(newStatus === "published" ? "Article publié" : "Article dépublié");
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  const statusFilters = [
    { label: "Tous", value: "all", count: articles.length },
    { label: "Publiés", value: "published", count: publishedCount },
    { label: "Brouillons", value: "draft", count: draftCount },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Base de connaissances</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{articles.length} articles — {totalViews} vues totales</p>
        </div>
        <button onClick={openCreate} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
          <Plus size={14} /> Nouvel article
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                statusFilter === f.value ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
        </div>
      </div>

      <AdminTable
        keyExtractor={(r: KBArticle) => r.id}
        loading={loading}
        emptyMessage="Aucun article"
        emptyIcon={<BookOpen size={32} />}
        onRowClick={r => { setEditArticle(r); setIsNew(false); }}
        columns={[
          { key: "title", label: "Titre", sortable: true, render: (r: KBArticle) => (
            <div>
              <div className="font-medium text-neutral-text dark:text-admin-text">{r.title}</div>
              {r.excerpt && <div className="text-neutral-muted dark:text-admin-muted text-[11px] truncate max-w-[300px]">{r.excerpt}</div>}
            </div>
          )},
          { key: "product_id", label: "Produit", render: (r: KBArticle) => (
            <span className="text-[12px]">{r.product_id ? appMap[r.product_id]?.name || r.product_id : "Général"}</span>
          )},
          { key: "status", label: "Statut", render: (r: KBArticle) => (
            <button onClick={e => { e.stopPropagation(); toggleStatus(r); }}>
              <AdminBadge status={r.status === "published" ? "active" : r.status === "draft" ? "trial" : "suspended"} label={r.status === "published" ? "Publié" : r.status === "draft" ? "Brouillon" : "Archivé"} />
            </button>
          )},
          { key: "views", label: "Vues", sortable: true, render: (r: KBArticle) => <span className="font-mono text-[13px]">{r.views}</span> },
          { key: "feedback", label: "Feedback", render: (r: KBArticle) => (
            <div className="flex items-center gap-3 text-[12px]">
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400"><ThumbsUp size={12} /> {r.helpful_count}</span>
              <span className="flex items-center gap-1 text-red-500 dark:text-red-400"><ThumbsDown size={12} /> {r.not_helpful_count}</span>
            </div>
          )},
          { key: "actions", label: "", render: (r: KBArticle) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => { setEditArticle(r); setIsNew(false); }} className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={filtered}
      />

      <AdminModal open={!!editArticle} onClose={() => setEditArticle(null)} title={isNew ? "Nouvel article" : `Modifier : ${editArticle?.title || ""}`} size="xl"
        footer={
          <>
            <button onClick={() => setEditArticle(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : isNew ? "Créer" : "Sauvegarder"}</button>
          </>
        }>
        {editArticle && (
          <div className="space-y-4">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Titre</label>
              <input value={editArticle.title || ""} onChange={e => setEditArticle({ ...editArticle, title: e.target.value })} className={inputClass} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Produit</label>
                <select value={editArticle.product_id || ""} onChange={e => setEditArticle({ ...editArticle, product_id: e.target.value || null })} className={inputClass}>
                  <option value="">Général</option>
                  {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                </select></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut</label>
                <select value={editArticle.status || "draft"} onChange={e => setEditArticle({ ...editArticle, status: e.target.value })} className={inputClass}>
                  <option value="draft">Brouillon</option>
                  <option value="published">Publié</option>
                  <option value="archived">Archivé</option>
                </select></div>
            </div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Extrait (résumé court)</label>
              <input value={editArticle.excerpt || ""} onChange={e => setEditArticle({ ...editArticle, excerpt: e.target.value })} placeholder="Résumé affiché dans la liste..." className={inputClass} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Contenu</label>
              <textarea value={editArticle.content || ""} onChange={e => setEditArticle({ ...editArticle, content: e.target.value })} rows={15}
                className={`${inputClass} resize-y font-mono text-[13px] leading-relaxed`} placeholder="Contenu de l'article (Markdown supporté)..." /></div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
