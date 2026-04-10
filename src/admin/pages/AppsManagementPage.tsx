import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, GripVertical, ExternalLink } from "lucide-react";
import { ADMIN_INPUT_CLASS } from "../components/AdminFormField";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import type { AppRow, AppType, AppStatus } from "../../lib/database.types";
import { DEFAULT_CONTENT } from "../../config/content";

const appTypes: AppType[] = ["Module ERP", "App", "App mobile"];
const appStatuses: AppStatus[] = ["available", "coming_soon", "unavailable"];
const STATUS_LABELS: Record<string, string> = { available: "Disponible", coming_soon: "Bientôt", unavailable: "Indisponible" };

const emptyApp: Partial<AppRow> = {
  id: "", name: "", type: "App", tagline: "", description: "",
  features: [], categories: [], pricing: {}, pricing_period: "mois",
  color: "#C8A960", icon: "receipt", highlights: [],
  status: "available", sort_order: 0, external_url: null,
};

interface PricingRow { plan: string; price: number }

export default function AppsManagementPage() {
  const { success, error: showError } = useToast();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editApp, setEditApp] = useState<Partial<AppRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [featuresStr, setFeaturesStr] = useState("");
  const [categoriesStr, setCategoriesStr] = useState("");
  const [highlightsStr, setHighlightsStr] = useState("");
  const [pricingRows, setPricingRows] = useState<PricingRow[]>([]);
  const [subCounts, setSubCounts] = useState<Record<string, number>>({});
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const fetchApps = async () => {
    const [appsRes, subsRes] = await Promise.all([
      supabase.from("apps").select("*").order("sort_order"),
      supabase.from("subscriptions").select("app_id").in("status", ["active", "trial"]),
    ]);
    if (appsRes.error) {
      console.error("Erreur chargement apps:", appsRes.error);
      showError?.(`Erreur chargement apps: ${appsRes.error.message}`);
    }
    if (appsRes.data) setApps(appsRes.data as AppRow[]);
    if (subsRes.error) {
      console.error("Erreur chargement subscriptions:", subsRes.error);
    }
    if (subsRes.data) {
      const counts: Record<string, number> = {};
      subsRes.data.forEach((s: any) => { counts[s.app_id] = (counts[s.app_id] || 0) + 1; });
      setSubCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const filtered = search
    ? apps.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase()))
    : apps;

  const openEdit = (app: AppRow) => {
    setEditApp(app); setIsNew(false);
    setFeaturesStr((app.features || []).join("\n"));
    setCategoriesStr((app.categories || []).join(", "));
    setHighlightsStr((app.highlights || []).join(", "));
    const pricing = app.pricing as Record<string, number> || {};
    setPricingRows(Object.entries(pricing).map(([plan, price]) => ({ plan, price })));
  };

  const openCreate = () => {
    setEditApp({ ...emptyApp }); setIsNew(true);
    setFeaturesStr(""); setCategoriesStr(""); setHighlightsStr("");
    setPricingRows([{ plan: "", price: 0 }]);
  };

  // Reserved IDs that cannot be used for apps (site vitrine, etc.)
  const RESERVED_APP_IDS = ["atlas-studio", "atlasstudio", "admin", "portal", "site"];

  const handleSave = async () => {
    if (!editApp || !editApp.id || !editApp.name) return;

    // Protect against creating the site vitrine as an app
    const normalizedId = editApp.id.toLowerCase().trim();
    if (isNew && RESERVED_APP_IDS.includes(normalizedId)) {
      showError(`L'identifiant "${editApp.id}" est réservé. Le site vitrine Atlas Studio n'est pas une application vendable.`);
      return;
    }

    setSaving(true);

    const pricing: Record<string, number> = {};
    pricingRows.filter(r => r.plan.trim()).forEach(r => { pricing[r.plan.trim()] = r.price; });

    const row = {
      id: editApp.id, name: editApp.name, type: editApp.type as AppType,
      tagline: editApp.tagline || "", description: editApp.description || "",
      features: featuresStr.split("\n").map(s => s.trim()).filter(Boolean),
      categories: categoriesStr.split(",").map(s => s.trim()).filter(Boolean),
      pricing, pricing_period: editApp.pricing_period || "mois",
      color: editApp.color || "#C8A960", icon: editApp.icon || "receipt",
      highlights: highlightsStr.split(",").map(s => s.trim()).filter(Boolean),
      external_url: editApp.external_url || null,
      status: editApp.status as AppStatus || "available",
      sort_order: editApp.sort_order || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = isNew
      ? await supabase.from("apps").insert(row)
      : await supabase.from("apps").update(row).eq("id", editApp.id);

    setSaving(false);
    if (error) { showError(`Erreur: ${error.message}`); }
    else { success(isNew ? "Application créée" : "Application mise à jour"); setEditApp(null); fetchApps(); }
  };

  const handleDelete = (app: AppRow) => {
    setConfirmDialog({
      open: true, title: "Supprimer cette application ?",
      message: `${app.name} sera définitivement supprimée. Les abonnements associés seront orphelins.`,
      onConfirm: async () => {
        await supabase.from("apps").delete().eq("id", app.id);
        setConfirmDialog(prev => ({ ...prev, open: false }));
        success("Application supprimée"); fetchApps();
      },
    });
  };

  const seedFromDefaults = async () => {
    setSaving(true);
    const rows = DEFAULT_CONTENT.apps.map((a, i) => ({
      id: a.id, name: a.name, type: a.type as AppType, tagline: a.tagline, description: a.desc,
      features: a.features, categories: a.categories, pricing: a.pricing,
      pricing_period: a.pricingPeriod || "mois", color: a.color || "#C8A960",
      icon: a.icon || "receipt", highlights: a.highlights || [],
      status: "available" as AppStatus, sort_order: i,
    }));
    const { error } = await supabase.from("apps").upsert(rows, { onConflict: "id" });
    setSaving(false);
    if (error) { console.error("Upsert error:", error); showError?.(`Erreur: ${error.message}`); }
    else { success(`${rows.length} applications importées`); }
    fetchApps();
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  // inputClass imported from AdminFormField

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Grille Tarifaire & Applications</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{apps.length} applications configurées</p>
        </div>
        <div className="flex gap-2">
          {apps.length === 0 && (
            <button onClick={seedFromDefaults} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text/80 text-[13px] font-medium hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">
              Importer par défaut
            </button>
          )}
          <button onClick={openCreate} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouvelle app
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
      </div>

      <AdminTable
        keyExtractor={(r: AppRow) => r.id}
        loading={loading}
        columns={[
          { key: "name", label: "Application", sortable: true, render: (r: AppRow) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold" style={{ backgroundColor: r.color || "#C8A960" }}>
                {r.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-neutral-text dark:text-admin-text flex items-center gap-1.5">
                  {r.name}
                  {r.external_url && <ExternalLink size={11} className="text-neutral-muted dark:text-admin-muted" />}
                </div>
                <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.tagline}</div>
              </div>
            </div>
          )},
          { key: "type", label: "Type", sortable: true, render: (r: AppRow) => (
            <span className="text-[12px] text-neutral-text dark:text-admin-text/80">{r.type}</span>
          )},
          { key: "status", label: "Statut", render: (r: AppRow) => <AdminBadge status={r.status} /> },
          { key: "subs", label: "Abonnés", render: (r: AppRow) => (
            <span className="text-gold dark:text-admin-accent font-medium">{subCounts[r.id] || 0}</span>
          )},
          { key: "pricing", label: "Tarifs", render: (r: AppRow) => {
            const prices = Object.entries(r.pricing as Record<string, number>);
            if (prices.length === 0) return <span className="text-neutral-muted dark:text-admin-muted">—</span>;
            return (
              <div className="space-y-0.5">
                {prices.map(([plan, price]) => (
                  <div key={plan} className="text-[11px]">
                    <span className="text-neutral-muted dark:text-admin-muted">{plan}:</span>{" "}
                    <span className="text-neutral-text dark:text-admin-text font-medium">{fmt(price)} FCFA/{r.pricing_period || "mois"}</span>
                  </div>
                ))}
              </div>
            );
          }},
          { key: "sort_order", label: "Ordre", sortable: true, render: (r: AppRow) => (
            <span className="text-neutral-muted dark:text-admin-muted text-[12px] font-mono">{r.sort_order}</span>
          )},
          { key: "actions", label: "", render: (r: AppRow) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => openEdit(r)} className="p-1.5 rounded hover:bg-white dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:text-admin-accent transition-colors" title="Modifier"><Pencil size={14} /></button>
              <button onClick={() => handleDelete(r)} className="p-1.5 rounded hover:bg-red-50 text-neutral-muted dark:text-admin-muted hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={filtered}
        onRowClick={(r) => openEdit(r)}
      />

      {/* Edit/Create modal */}
      <AdminModal open={!!editApp} onClose={() => setEditApp(null)} title={isNew ? "Nouvelle application" : `Modifier ${editApp?.name || ""}`} size="xl"
        footer={
          <>
            <button onClick={() => setEditApp(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text/80 text-[13px] font-medium hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "Sauvegarde..." : isNew ? "Créer" : "Sauvegarder"}</button>
          </>
        }>
        {editApp && (
          <div className="space-y-5">
            {/* Identity */}
            <div>
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3">Identité</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">ID (slug)</label>
                  <input value={editApp.id || ""} onChange={e => setEditApp({ ...editApp, id: e.target.value })} disabled={!isNew} placeholder="mon-app" className={`${inputClass} ${!isNew ? "opacity-50" : ""}`} />
                </div>
                <div>
                  <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Nom</label>
                  <input value={editApp.name || ""} onChange={e => setEditApp({ ...editApp, name: e.target.value })} className={ADMIN_INPUT_CLASS} />
                </div>
              </div>
            </div>

            {/* Type, Status, Period */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Type</label>
                <select value={editApp.type || "App"} onChange={e => setEditApp({ ...editApp, type: e.target.value as AppType })} className={ADMIN_INPUT_CLASS}>
                  {appTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut</label>
                <select value={editApp.status || "available"} onChange={e => setEditApp({ ...editApp, status: e.target.value as AppStatus })} className={ADMIN_INPUT_CLASS}>
                  {appStatuses.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Période tarif</label>
                <select value={editApp.pricing_period || "mois"} onChange={e => setEditApp({ ...editApp, pricing_period: e.target.value })} className={ADMIN_INPUT_CLASS}>
                  <option value="mois">Par mois</option><option value="an">Par an</option>
                </select>
              </div>
            </div>

            {/* External URL */}
            <div>
              <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">URL externe (landing page)</label>
              <input value={editApp.external_url || ""} onChange={e => setEditApp({ ...editApp, external_url: e.target.value || null })} placeholder="https://mon-app.atlas-studio.org" className={ADMIN_INPUT_CLASS} />
              <p className="text-neutral-muted dark:text-admin-muted/60 text-[11px] mt-1">Redirige vers ce site au lieu de la page détail interne.</p>
            </div>

            {/* Tagline + Description */}
            <div>
              <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Tagline</label>
              <input value={editApp.tagline || ""} onChange={e => setEditApp({ ...editApp, tagline: e.target.value })} className={ADMIN_INPUT_CLASS} />
            </div>
            <div>
              <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Description</label>
              <textarea value={editApp.description || ""} onChange={e => setEditApp({ ...editApp, description: e.target.value })} rows={3} className={`${inputClass} resize-y`} />
            </div>

            {/* Structured Pricing */}
            <div>
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3">Tarification</h3>
              <div className="space-y-2">
                {pricingRows.map((row, i) => (
                  <div key={i} className="flex gap-3 items-center">
                    <input value={row.plan} onChange={e => { const r = [...pricingRows]; r[i] = { ...r[i], plan: e.target.value }; setPricingRows(r); }}
                      placeholder="Nom du plan" className={`flex-1 ${inputClass}`} />
                    <div className="relative flex-1">
                      <input type="number" value={row.price} onChange={e => { const r = [...pricingRows]; r[i] = { ...r[i], price: Number(e.target.value) }; setPricingRows(r); }}
                        className={ADMIN_INPUT_CLASS} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted text-[11px]">FCFA</span>
                    </div>
                    <button onClick={() => setPricingRows(pricingRows.filter((_, j) => j !== i))} className="p-2 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setPricingRows([...pricingRows, { plan: "", price: 0 }])}
                className="text-gold dark:text-admin-accent text-[12px] font-semibold mt-2 hover:underline">+ Ajouter un plan</button>
            </div>

            {/* Appearance */}
            <div>
              <h3 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-3">Apparence</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Couleur</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={editApp.color || "#C8A960"} onChange={e => setEditApp({ ...editApp, color: e.target.value })}
                      className="w-10 h-10 rounded border border-warm-border dark:border-admin-surface-alt cursor-pointer bg-transparent" />
                    <input value={editApp.color || "#C8A960"} onChange={e => setEditApp({ ...editApp, color: e.target.value })}
                      className={`flex-1 ${inputClass} font-mono`} />
                  </div>
                </div>
                <div>
                  <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Icône Lucide</label>
                  <input value={editApp.icon || "receipt"} onChange={e => setEditApp({ ...editApp, icon: e.target.value })} placeholder="receipt" className={ADMIN_INPUT_CLASS} />
                  <p className="text-neutral-muted dark:text-admin-muted/60 text-[11px] mt-1">Nom d'icône lucide-react</p>
                </div>
                <div>
                  <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Ordre d'affichage</label>
                  <input type="number" value={editApp.sort_order || 0} onChange={e => setEditApp({ ...editApp, sort_order: parseInt(e.target.value) || 0 })} className={ADMIN_INPUT_CLASS} />
                </div>
              </div>
            </div>

            {/* Features */}
            <div>
              <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Fonctionnalités (une par ligne)</label>
              <textarea value={featuresStr} onChange={e => setFeaturesStr(e.target.value)} rows={5}
                className={`${inputClass} resize-y font-mono text-[12px]`} />
              <p className="text-neutral-muted dark:text-admin-muted/60 text-[11px] mt-1">{featuresStr.split("\n").filter(Boolean).length} fonctionnalités</p>
            </div>

            {/* Categories + Highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Catégories</label>
                <input value={categoriesStr} onChange={e => setCategoriesStr(e.target.value)} placeholder="Finance, Comptabilité" className={ADMIN_INPUT_CLASS} />
                <p className="text-neutral-muted dark:text-admin-muted/60 text-[11px] mt-1">Séparées par des virgules</p>
              </div>
              <div>
                <label className="block text-neutral-text dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Points forts</label>
                <input value={highlightsStr} onChange={e => setHighlightsStr(e.target.value)} placeholder="SYSCOHADA natif, Proph3t IA" className={ADMIN_INPUT_CLASS} />
                <p className="text-neutral-muted dark:text-admin-muted/60 text-[11px] mt-1">Séparés par des virgules</p>
              </div>
            </div>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
