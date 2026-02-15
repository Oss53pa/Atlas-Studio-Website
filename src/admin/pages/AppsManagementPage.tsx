import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import type { AppRow, AppType, AppStatus } from "../../lib/database.types";
import { DEFAULT_CONTENT } from "../../config/content";

const appTypes: AppType[] = ["Module ERP", "App", "App mobile"];
const appStatuses: AppStatus[] = ["available", "coming_soon", "unavailable"];

const emptyApp: Partial<AppRow> = {
  id: "", name: "", type: "App", tagline: "", description: "",
  features: [], categories: [], pricing: {}, status: "available", sort_order: 0,
};

export default function AppsManagementPage() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editApp, setEditApp] = useState<Partial<AppRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [featuresStr, setFeaturesStr] = useState("");
  const [categoriesStr, setCategoriesStr] = useState("");
  const [pricingStr, setPricingStr] = useState("");

  const fetchApps = async () => {
    const { data } = await supabase.from("apps").select("*").order("sort_order");
    if (data) setApps(data as AppRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, []);

  const openEdit = (app: AppRow) => {
    setEditApp(app);
    setIsNew(false);
    setFeaturesStr((app.features || []).join("\n"));
    setCategoriesStr((app.categories || []).join(", "));
    setPricingStr(JSON.stringify(app.pricing || {}, null, 2));
  };

  const openCreate = () => {
    setEditApp({ ...emptyApp });
    setIsNew(true);
    setFeaturesStr("");
    setCategoriesStr("");
    setPricingStr("{}");
  };

  const handleSave = async () => {
    if (!editApp || !editApp.id || !editApp.name) return;
    setSaving(true);

    let pricing = {};
    try { pricing = JSON.parse(pricingStr); } catch { /* keep empty */ }

    const row = {
      id: editApp.id,
      name: editApp.name,
      type: editApp.type as AppType,
      tagline: editApp.tagline || "",
      description: editApp.description || "",
      features: featuresStr.split("\n").map(s => s.trim()).filter(Boolean),
      categories: categoriesStr.split(",").map(s => s.trim()).filter(Boolean),
      pricing,
      status: editApp.status as AppStatus || "available",
      sort_order: editApp.sort_order || 0,
      updated_at: new Date().toISOString(),
    };

    const { error } = isNew
      ? await supabase.from("apps").insert(row)
      : await supabase.from("apps").update(row).eq("id", editApp.id);

    setSaving(false);
    if (error) {
      setToast(`Erreur: ${error.message}`);
    } else {
      setToast(isNew ? "Application créée" : "Application mise à jour");
      setEditApp(null);
      fetchApps();
    }
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette application ?")) return;
    await supabase.from("apps").delete().eq("id", id);
    fetchApps();
    setToast("Application supprimée");
    setTimeout(() => setToast(null), 3000);
  };

  const toggleStatus = async (app: AppRow) => {
    const cycle: AppStatus[] = ["available", "coming_soon", "unavailable"];
    const nextIdx = (cycle.indexOf(app.status as AppStatus) + 1) % cycle.length;
    await supabase.from("apps").update({ status: cycle[nextIdx], updated_at: new Date().toISOString() }).eq("id", app.id);
    fetchApps();
  };

  const seedFromDefaults = async () => {
    setSaving(true);
    const rows = DEFAULT_CONTENT.apps.map((a, i) => ({
      id: a.id,
      name: a.name,
      type: a.type as AppType,
      tagline: a.tagline,
      description: a.desc,
      features: a.features,
      categories: a.categories,
      pricing: a.pricing,
      status: "available" as AppStatus,
      sort_order: i,
    }));
    await supabase.from("apps").upsert(rows);
    setSaving(false);
    setToast("22 applications importées depuis le contenu par défaut");
    fetchApps();
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Applications</h1>
          <p className="text-neutral-muted text-sm">{apps.length} applications</p>
        </div>
        <div className="flex gap-2">
          {apps.length === 0 && (
            <button onClick={seedFromDefaults} disabled={saving} className="flex items-center gap-2 px-4 py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors">
              Importer par défaut
            </button>
          )}
          <button onClick={openCreate} className="btn-gold !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouvelle app
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <AdminTable
        keyExtractor={(r: AppRow) => r.id}
        columns={[
          { key: "name", label: "Nom", sortable: true, render: (r: AppRow) => <span className="font-medium text-neutral-text">{r.name}</span> },
          { key: "type", label: "Type", sortable: true },
          { key: "status", label: "Statut", render: (r: AppRow) => (
            <button onClick={(e) => { e.stopPropagation(); toggleStatus(r); }}>
              <AdminBadge status={r.status} />
            </button>
          )},
          { key: "pricing", label: "Prix min", render: (r: AppRow) => {
            const prices = Object.values(r.pricing as Record<string, number>);
            return prices.length > 0 ? `${Math.min(...prices)}/mois` : "—";
          }},
          { key: "sort_order", label: "Ordre", sortable: true },
          { key: "actions", label: "Actions", render: (r: AppRow) => (
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1.5 rounded hover:bg-warm-bg text-neutral-muted transition-colors">
                <Pencil size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(r.id); }} className="p-1.5 rounded hover:bg-red-50 text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          )},
        ]}
        data={apps}
      />

      <AdminModal open={!!editApp} onClose={() => setEditApp(null)} title={isNew ? "Nouvelle application" : "Modifier l'application"} wide>
        {editApp && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">ID (slug)</label>
                <input
                  value={editApp.id || ""}
                  onChange={e => setEditApp({ ...editApp, id: e.target.value })}
                  disabled={!isNew}
                  className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Nom</label>
                <input
                  value={editApp.name || ""}
                  onChange={e => setEditApp({ ...editApp, name: e.target.value })}
                  className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Type</label>
                <select
                  value={editApp.type || "App"}
                  onChange={e => setEditApp({ ...editApp, type: e.target.value as AppType })}
                  className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold"
                >
                  {appTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Statut</label>
                <select
                  value={editApp.status || "available"}
                  onChange={e => setEditApp({ ...editApp, status: e.target.value as AppStatus })}
                  className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold"
                >
                  {appStatuses.map(s => <option key={s} value={s}>{s === "available" ? "Disponible" : s === "coming_soon" ? "Bientôt" : "Indisponible"}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Tagline</label>
              <input
                value={editApp.tagline || ""}
                onChange={e => setEditApp({ ...editApp, tagline: e.target.value })}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Description</label>
              <textarea
                value={editApp.description || ""}
                onChange={e => setEditApp({ ...editApp, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold resize-y"
              />
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Fonctionnalités (une par ligne)</label>
              <textarea
                value={featuresStr}
                onChange={e => setFeaturesStr(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold resize-y font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Catégories (séparées par des virgules)</label>
              <input
                value={categoriesStr}
                onChange={e => setCategoriesStr(e.target.value)}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Pricing (JSON)</label>
              <textarea
                value={pricingStr}
                onChange={e => setPricingStr(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold resize-y font-mono"
              />
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Ordre d'affichage</label>
              <input
                type="number"
                value={editApp.sort_order || 0}
                onChange={e => setEditApp({ ...editApp, sort_order: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-warm-border">
              <button onClick={handleSave} disabled={saving} className="btn-gold !py-2.5 !text-[13px] flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? "Sauvegarde..." : isNew ? "Créer" : "Sauvegarder"}
              </button>
              <button onClick={() => setEditApp(null)} className="px-4 py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors">
                Annuler
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
