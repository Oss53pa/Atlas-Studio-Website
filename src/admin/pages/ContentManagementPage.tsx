import { useState, useEffect, useRef } from "react";
import { Save, RotateCcw, Loader2, Check, Trash2, Plus, Upload, X, Image, ExternalLink } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { DEFAULT_CONTENT } from "../../config/content";

const tabs = ["Hero", "Stats", "Trust Bar", "About", "Témoignages", "Secteurs", "Comparatif", "FAQs", "Contact", "Réseaux sociaux", "Apparence"] as const;
type Tab = (typeof tabs)[number];

const TAB_KEY_MAP: Record<Tab, string> = {
  Hero: "hero",
  Stats: "stats",
  "Trust Bar": "trustBar",
  About: "about",
  Témoignages: "testimonials",
  Secteurs: "sectors",
  Comparatif: "comparatif",
  FAQs: "faqs",
  Contact: "contact",
  "Réseaux sociaux": "social",
  Apparence: "appearance",
};

/* ─── Image upload helper ─── */
async function uploadImage(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split(".").pop();
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("site-assets").upload(name, file, { upsert: true });
  if (error) return null;
  const { data } = supabase.storage.from("site-assets").getPublicUrl(name);
  return data.publicUrl;
}

/* ─── Reusable Field ─── */
function Field({ label, value, onChange, multiline, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; multiline?: boolean; placeholder?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder}
          className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors resize-y" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
      )}
    </div>
  );
}

/* ─── Color Picker Field ─── */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-4">
      <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-warm-border cursor-pointer bg-transparent" />
        <input value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors font-mono" />
        <div className="w-20 h-10 rounded-lg border border-warm-border" style={{ backgroundColor: value }} />
      </div>
    </div>
  );
}

/* ─── Image Upload Field ─── */
function ImageField({ label, value, onChange, folder }: {
  label: string; value: string; onChange: (v: string) => void; folder: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file, folder);
    if (url) onChange(url);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="mb-4">
      <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        {value ? (
          <div className="relative w-16 h-16 rounded-lg border border-warm-border overflow-hidden bg-warm-bg flex-shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button onClick={() => onChange("")} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
              <X size={10} />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg border-2 border-dashed border-warm-border bg-warm-bg flex items-center justify-center flex-shrink-0">
            <Image size={20} className="text-neutral-muted" />
          </div>
        )}
        <div className="flex-1">
          <input value={value} onChange={e => onChange(e.target.value)} placeholder="URL de l'image ou uploader"
            className="w-full px-4 py-2.5 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors mb-2" />
          <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-1.5 text-gold text-[12px] font-semibold hover:underline">
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
            {uploading ? "Upload..." : "Uploader une image"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Delete button ─── */
function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-red-400 hover:text-red-300 transition-colors p-1" title="Supprimer">
      <Trash2 size={14} />
    </button>
  );
}

/* ─── Add button ─── */
function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-gold text-[13px] font-semibold hover:underline mt-2">
      <Plus size={14} /> {label}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ContentManagementPage() {
  const [tab, setTab] = useState<Tab>("Hero");
  const [content, setContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("site_content").select("key, data");
      const map: Record<string, any> = {};
      if (data) data.forEach(r => { map[r.key] = r.data; });
      setContent({
        hero: map.hero || DEFAULT_CONTENT.hero,
        stats: map.stats || DEFAULT_CONTENT.stats,
        trustBar: map.trustBar || DEFAULT_CONTENT.trustBar,
        about: map.about || DEFAULT_CONTENT.about,
        testimonials: map.testimonials || DEFAULT_CONTENT.testimonials,
        sectors: map.sectors || DEFAULT_CONTENT.sectors.map(s => s.name),
        comparatif: map.comparatif || DEFAULT_CONTENT.comparatif,
        faqs: map.faqs || DEFAULT_CONTENT.faqs,
        contact: map.contact || DEFAULT_CONTENT.contact,
        social: map.social || { facebook: "", instagram: "", linkedin: "", twitter: "", youtube: "", tiktok: "" },
        appearance: map.appearance || {
          primaryColor: "#C8A960",
          accentColor: "#D4BC7C",
          heroBackground: "#0A0A0A",
          clientLogos: [] as string[],
        },
      });
      setLoading(false);
    }
    load();
  }, []);

  const update = (key: string, value: any) => {
    setContent(prev => ({ ...prev, [key]: value }));
  };

  const save = async (key: string) => {
    setSaving(true);
    const { error } = await supabase.from("site_content").upsert({
      key,
      data: content[key],
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setToast(error ? `Erreur: ${error.message}` : "Contenu sauvegardé");
    setTimeout(() => setToast(null), 3000);
  };

  const reset = (key: string) => {
    const defaults: Record<string, any> = {
      hero: DEFAULT_CONTENT.hero,
      stats: DEFAULT_CONTENT.stats,
      trustBar: DEFAULT_CONTENT.trustBar,
      about: DEFAULT_CONTENT.about,
      testimonials: DEFAULT_CONTENT.testimonials,
      sectors: DEFAULT_CONTENT.sectors.map(s => s.name),
      comparatif: DEFAULT_CONTENT.comparatif,
      faqs: DEFAULT_CONTENT.faqs,
      contact: DEFAULT_CONTENT.contact,
      social: { facebook: "", instagram: "", linkedin: "", twitter: "", youtube: "", tiktok: "" },
      appearance: { primaryColor: "#C8A960", accentColor: "#D4BC7C", heroBackground: "#0A0A0A", clientLogos: [] },
    };
    update(key, defaults[key]);
  };

  const removeItem = (key: string, index: number) => {
    const arr = [...(content[key] || [])];
    arr.splice(index, 1);
    update(key, arr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  const sectionKey = TAB_KEY_MAP[tab];

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Gestion du contenu</h1>
          <p className="text-neutral-muted text-sm">Modifiez le contenu du site vitrine — textes, images, couleurs, réseaux sociaux</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-gold text-[13px] font-semibold hover:underline">
          <ExternalLink size={14} /> Voir le site
        </a>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t ? "bg-gold text-onyx" : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-warm-border rounded-2xl p-6">

        {/* ═══ HERO ═══ */}
        {tab === "Hero" && (
          <>
            <Field label="Titre principal" value={content.hero?.title || ""} onChange={v => update("hero", { ...content.hero, title: v })} />
            <Field label="Sous-titre" value={content.hero?.subtitle || ""} onChange={v => update("hero", { ...content.hero, subtitle: v })} multiline />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Bouton primaire (CTA)" value={content.hero?.cta1 || ""} onChange={v => update("hero", { ...content.hero, cta1: v })} />
              <Field label="Bouton secondaire" value={content.hero?.cta2 || ""} onChange={v => update("hero", { ...content.hero, cta2: v })} />
            </div>
          </>
        )}

        {/* ═══ STATS ═══ */}
        {tab === "Stats" && (
          <>
            {(content.stats || []).map((s: any, i: number) => (
              <div key={i} className="flex gap-3 mb-3 items-end">
                <div className="flex-1"><Field label={`Valeur ${i + 1}`} value={s.value} onChange={v => {
                  const arr = [...content.stats]; arr[i] = { ...arr[i], value: v }; update("stats", arr);
                }} /></div>
                <div className="flex-1"><Field label={`Label ${i + 1}`} value={s.label} onChange={v => {
                  const arr = [...content.stats]; arr[i] = { ...arr[i], label: v }; update("stats", arr);
                }} /></div>
                <div className="pb-4"><DeleteBtn onClick={() => removeItem("stats", i)} /></div>
              </div>
            ))}
            <AddBtn label="Ajouter une stat" onClick={() => update("stats", [...(content.stats || []), { value: "", label: "" }])} />
          </>
        )}

        {/* ═══ TRUST BAR ═══ */}
        {tab === "Trust Bar" && (
          <>
            <p className="text-neutral-muted text-[13px] mb-4">Éléments affichés dans la barre de confiance sous le hero.</p>
            {(content.trustBar || []).map((item: string, i: number) => (
              <div key={i} className="flex gap-3 mb-3 items-end">
                <div className="flex-1"><Field label={`Élément ${i + 1}`} value={item} onChange={v => {
                  const arr = [...content.trustBar]; arr[i] = v; update("trustBar", arr);
                }} /></div>
                <div className="pb-4"><DeleteBtn onClick={() => removeItem("trustBar", i)} /></div>
              </div>
            ))}
            <AddBtn label="Ajouter un élément" onClick={() => update("trustBar", [...(content.trustBar || []), ""])} />
          </>
        )}

        {/* ═══ ABOUT ═══ */}
        {tab === "About" && (
          <>
            <Field label="Paragraphe 1" value={content.about?.p1 || ""} onChange={v => update("about", { ...content.about, p1: v })} multiline />
            <Field label="Paragraphe 2" value={content.about?.p2 || ""} onChange={v => update("about", { ...content.about, p2: v })} multiline />
            <Field label="Paragraphe 3" value={content.about?.p3 || ""} onChange={v => update("about", { ...content.about, p3: v })} multiline />
            <h3 className="text-neutral-text text-sm font-bold mb-3 mt-4">Valeurs</h3>
            {(content.about?.values || []).map((val: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-warm-bg rounded-lg relative">
                <div className="absolute top-3 right-3"><DeleteBtn onClick={() => {
                  const vals = [...(content.about?.values || [])]; vals.splice(i, 1); update("about", { ...content.about, values: vals });
                }} /></div>
                <Field label={`Titre ${i + 1}`} value={val.title} onChange={v => {
                  const vals = [...(content.about?.values || [])]; vals[i] = { ...vals[i], title: v }; update("about", { ...content.about, values: vals });
                }} />
                <Field label={`Description ${i + 1}`} value={val.desc} onChange={v => {
                  const vals = [...(content.about?.values || [])]; vals[i] = { ...vals[i], desc: v }; update("about", { ...content.about, values: vals });
                }} multiline />
              </div>
            ))}
            <AddBtn label="Ajouter une valeur" onClick={() => update("about", { ...content.about, values: [...(content.about?.values || []), { title: "", desc: "" }] })} />
          </>
        )}

        {/* ═══ TÉMOIGNAGES ═══ */}
        {tab === "Témoignages" && (
          <>
            {(content.testimonials || []).map((t: any, i: number) => (
              <div key={i} className="mb-4 p-4 bg-warm-bg rounded-lg relative">
                <div className="absolute top-3 right-3"><DeleteBtn onClick={() => removeItem("testimonials", i)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nom" value={t.name} onChange={v => {
                    const arr = [...content.testimonials]; arr[i] = { ...arr[i], name: v }; update("testimonials", arr);
                  }} />
                  <Field label="Rôle" value={t.role} onChange={v => {
                    const arr = [...content.testimonials]; arr[i] = { ...arr[i], role: v }; update("testimonials", arr);
                  }} />
                  <Field label="Entreprise" value={t.company} onChange={v => {
                    const arr = [...content.testimonials]; arr[i] = { ...arr[i], company: v }; update("testimonials", arr);
                  }} />
                  <Field label="Initiales avatar" value={t.avatar} onChange={v => {
                    const arr = [...content.testimonials]; arr[i] = { ...arr[i], avatar: v }; update("testimonials", arr);
                  }} />
                </div>
                <ImageField label="Photo (optionnel)" value={t.photo || ""} folder="testimonials" onChange={v => {
                  const arr = [...content.testimonials]; arr[i] = { ...arr[i], photo: v }; update("testimonials", arr);
                }} />
                <ImageField label="Logo entreprise (optionnel)" value={t.companyLogo || ""} folder="logos" onChange={v => {
                  const arr = [...content.testimonials]; arr[i] = { ...arr[i], companyLogo: v }; update("testimonials", arr);
                }} />
                <Field label="Texte du témoignage" value={t.text} onChange={v => {
                  const arr = [...content.testimonials]; arr[i] = { ...arr[i], text: v }; update("testimonials", arr);
                }} multiline />
              </div>
            ))}
            <AddBtn label="Ajouter un témoignage" onClick={() => update("testimonials", [...(content.testimonials || []), { name: "", role: "", company: "", text: "", avatar: "", photo: "", companyLogo: "" }])} />
          </>
        )}

        {/* ═══ SECTEURS ═══ */}
        {tab === "Secteurs" && (
          <>
            <p className="text-neutral-muted text-[13px] mb-4">Noms des secteurs (les icônes sont gérées côté code).</p>
            {(content.sectors || []).map((name: string, i: number) => (
              <div key={i} className="flex gap-3 mb-3 items-end">
                <div className="flex-1"><Field label={`Secteur ${i + 1}`} value={name} onChange={v => {
                  const arr = [...content.sectors]; arr[i] = v; update("sectors", arr);
                }} /></div>
                <div className="pb-4"><DeleteBtn onClick={() => removeItem("sectors", i)} /></div>
              </div>
            ))}
            <AddBtn label="Ajouter un secteur" onClick={() => update("sectors", [...(content.sectors || []), ""])} />
          </>
        )}

        {/* ═══ COMPARATIF ═══ */}
        {tab === "Comparatif" && (
          <>
            <h3 className="text-neutral-text text-sm font-bold mb-3">En-têtes du tableau</h3>
            <div className="flex gap-3 mb-6 flex-wrap">
              {(content.comparatif?.headers || []).map((h: string, i: number) => (
                <div key={i} className="flex-1 min-w-[120px]">
                  <Field label={`Colonne ${i + 1}`} value={h} onChange={v => {
                    const headers = [...(content.comparatif?.headers || [])]; headers[i] = v;
                    update("comparatif", { ...content.comparatif, headers });
                  }} />
                </div>
              ))}
            </div>
            <h3 className="text-neutral-text text-sm font-bold mb-3">Lignes</h3>
            {(content.comparatif?.rows || []).map((row: any, ri: number) => (
              <div key={ri} className="mb-3 p-4 bg-warm-bg rounded-lg relative">
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-[12px] text-neutral-muted">
                    <input type="checkbox" checked={row.highlight || false} onChange={e => {
                      const rows = [...(content.comparatif?.rows || [])]; rows[ri] = { ...rows[ri], highlight: e.target.checked };
                      update("comparatif", { ...content.comparatif, rows });
                    }} className="accent-gold" />
                    Mise en avant
                  </label>
                  <DeleteBtn onClick={() => {
                    const rows = [...(content.comparatif?.rows || [])]; rows.splice(ri, 1);
                    update("comparatif", { ...content.comparatif, rows });
                  }} />
                </div>
                <Field label="Nom" value={row.name} onChange={v => {
                  const rows = [...(content.comparatif?.rows || [])]; rows[ri] = { ...rows[ri], name: v };
                  update("comparatif", { ...content.comparatif, rows });
                }} />
                <div className="grid grid-cols-4 gap-3">
                  {(row.values || []).map((val: string, vi: number) => (
                    <Field key={vi} label={content.comparatif?.headers?.[vi + 1] || `Col ${vi + 2}`} value={val} onChange={v => {
                      const rows = [...(content.comparatif?.rows || [])]; const vals = [...rows[ri].values]; vals[vi] = v;
                      rows[ri] = { ...rows[ri], values: vals };
                      update("comparatif", { ...content.comparatif, rows });
                    }} />
                  ))}
                </div>
              </div>
            ))}
            <AddBtn label="Ajouter une ligne" onClick={() => {
              const colCount = (content.comparatif?.headers?.length || 5) - 1;
              update("comparatif", { ...content.comparatif, rows: [...(content.comparatif?.rows || []), { name: "", values: Array(colCount).fill(""), highlight: false }] });
            }} />
          </>
        )}

        {/* ═══ FAQs ═══ */}
        {tab === "FAQs" && (
          <>
            {(content.faqs || []).map((f: any, i: number) => (
              <div key={i} className="mb-4 p-4 bg-warm-bg rounded-lg relative">
                <div className="absolute top-3 right-3"><DeleteBtn onClick={() => removeItem("faqs", i)} /></div>
                <Field label={`Question ${i + 1}`} value={f.q} onChange={v => {
                  const arr = [...content.faqs]; arr[i] = { ...arr[i], q: v }; update("faqs", arr);
                }} />
                <Field label={`Réponse ${i + 1}`} value={f.a} onChange={v => {
                  const arr = [...content.faqs]; arr[i] = { ...arr[i], a: v }; update("faqs", arr);
                }} multiline />
              </div>
            ))}
            <AddBtn label="Ajouter une FAQ" onClick={() => update("faqs", [...(content.faqs || []), { q: "", a: "" }])} />
          </>
        )}

        {/* ═══ CONTACT ═══ */}
        {tab === "Contact" && (
          <>
            <Field label="Email" value={content.contact?.email || ""} onChange={v => update("contact", { ...content.contact, email: v })} placeholder="contact@atlasstudio.com" />
            <Field label="Téléphone" value={content.contact?.phone || ""} onChange={v => update("contact", { ...content.contact, phone: v })} placeholder="+225 XX XX XX XX" />
            <Field label="Ville" value={content.contact?.city || ""} onChange={v => update("contact", { ...content.contact, city: v })} placeholder="Abidjan, Côte d'Ivoire" />
          </>
        )}

        {/* ═══ RÉSEAUX SOCIAUX ═══ */}
        {tab === "Réseaux sociaux" && (
          <>
            <p className="text-neutral-muted text-[13px] mb-4">Liens vers vos profils sur les réseaux sociaux. Laissez vide pour masquer.</p>
            <Field label="Facebook" value={content.social?.facebook || ""} onChange={v => update("social", { ...content.social, facebook: v })} placeholder="https://facebook.com/atlasstudio" />
            <Field label="Instagram" value={content.social?.instagram || ""} onChange={v => update("social", { ...content.social, instagram: v })} placeholder="https://instagram.com/atlasstudio" />
            <Field label="LinkedIn" value={content.social?.linkedin || ""} onChange={v => update("social", { ...content.social, linkedin: v })} placeholder="https://linkedin.com/company/atlasstudio" />
            <Field label="X (Twitter)" value={content.social?.twitter || ""} onChange={v => update("social", { ...content.social, twitter: v })} placeholder="https://x.com/atlasstudio" />
            <Field label="YouTube" value={content.social?.youtube || ""} onChange={v => update("social", { ...content.social, youtube: v })} placeholder="https://youtube.com/@atlasstudio" />
            <Field label="TikTok" value={content.social?.tiktok || ""} onChange={v => update("social", { ...content.social, tiktok: v })} placeholder="https://tiktok.com/@atlasstudio" />
          </>
        )}

        {/* ═══ APPARENCE ═══ */}
        {tab === "Apparence" && (
          <>
            <h3 className="text-neutral-text text-sm font-bold mb-3">Couleurs</h3>
            <div className="grid grid-cols-2 gap-4">
              <ColorField label="Couleur principale (gold)" value={content.appearance?.primaryColor || "#C8A960"} onChange={v => update("appearance", { ...content.appearance, primaryColor: v })} />
              <ColorField label="Couleur accent" value={content.appearance?.accentColor || "#D4BC7C"} onChange={v => update("appearance", { ...content.appearance, accentColor: v })} />
            </div>
            <ColorField label="Fond du hero" value={content.appearance?.heroBackground || "#0A0A0A"} onChange={v => update("appearance", { ...content.appearance, heroBackground: v })} />

            <h3 className="text-neutral-text text-sm font-bold mb-3 mt-6">Logos des entreprises clientes</h3>
            <p className="text-neutral-muted text-[13px] mb-4">Logos affichés comme preuve sociale sur la landing page.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
              {(content.appearance?.clientLogos || []).map((logo: string, i: number) => (
                <div key={i} className="relative bg-warm-bg border border-warm-border rounded-lg p-3 flex items-center justify-center min-h-[80px]">
                  <img src={logo} alt={`Client ${i + 1}`} className="max-h-12 max-w-full object-contain" />
                  <button onClick={() => {
                    const logos = [...(content.appearance?.clientLogos || [])]; logos.splice(i, 1);
                    update("appearance", { ...content.appearance, clientLogos: logos });
                  }} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
            <ImageField label="Ajouter un logo client" value="" folder="client-logos" onChange={v => {
              if (v) update("appearance", { ...content.appearance, clientLogos: [...(content.appearance?.clientLogos || []), v] });
            }} />
          </>
        )}

        {/* ═══ SAVE / RESET ═══ */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-warm-border">
          <button onClick={() => save(sectionKey)} disabled={saving} className="btn-gold !py-2.5 !text-[13px] flex items-center gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Sauvegarde..." : "Sauvegarder"}
          </button>
          <button onClick={() => reset(sectionKey)} className="px-4 py-2.5 border border-warm-border rounded-lg text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors flex items-center gap-2">
            <RotateCcw size={14} />
            Réinitialiser
          </button>
        </div>
      </div>
    </div>
  );
}
