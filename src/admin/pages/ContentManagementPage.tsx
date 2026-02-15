import { useState, useEffect } from "react";
import { Save, RotateCcw, Loader2, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { DEFAULT_CONTENT } from "../../config/content";

const tabs = ["Hero", "Stats", "About", "Témoignages", "Secteurs", "FAQs", "Contact"] as const;
type Tab = (typeof tabs)[number];

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
        about: map.about || DEFAULT_CONTENT.about,
        testimonials: map.testimonials || DEFAULT_CONTENT.testimonials,
        sectors: map.sectors || DEFAULT_CONTENT.sectors.map(s => s.name),
        faqs: map.faqs || DEFAULT_CONTENT.faqs,
        contact: map.contact || DEFAULT_CONTENT.contact,
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
      about: DEFAULT_CONTENT.about,
      testimonials: DEFAULT_CONTENT.testimonials,
      sectors: DEFAULT_CONTENT.sectors.map(s => s.name),
      faqs: DEFAULT_CONTENT.faqs,
      contact: DEFAULT_CONTENT.contact,
    };
    update(key, defaults[key]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  const Field = ({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) => (
    <div className="mb-4">
      <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors resize-y" />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
      )}
    </div>
  );

  const sectionKey = tab === "Hero" ? "hero" : tab === "Stats" ? "stats" : tab === "About" ? "about" : tab === "Témoignages" ? "testimonials" : tab === "Secteurs" ? "sectors" : tab === "FAQs" ? "faqs" : "contact";

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Gestion du contenu</h1>
          <p className="text-neutral-muted text-sm">Modifiez le contenu du site vitrine</p>
        </div>
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
        {tab === "Hero" && (
          <>
            <Field label="Titre" value={content.hero?.title || ""} onChange={v => update("hero", { ...content.hero, title: v })} />
            <Field label="Sous-titre" value={content.hero?.subtitle || ""} onChange={v => update("hero", { ...content.hero, subtitle: v })} multiline />
            <Field label="CTA primaire" value={content.hero?.cta1 || ""} onChange={v => update("hero", { ...content.hero, cta1: v })} />
            <Field label="CTA secondaire" value={content.hero?.cta2 || ""} onChange={v => update("hero", { ...content.hero, cta2: v })} />
          </>
        )}

        {tab === "Stats" && (
          <>
            {(content.stats || []).map((s: any, i: number) => (
              <div key={i} className="flex gap-3 mb-3">
                <div className="flex-1">
                  <Field label={`Valeur ${i + 1}`} value={s.value} onChange={v => {
                    const arr = [...content.stats];
                    arr[i] = { ...arr[i], value: v };
                    update("stats", arr);
                  }} />
                </div>
                <div className="flex-1">
                  <Field label={`Label ${i + 1}`} value={s.label} onChange={v => {
                    const arr = [...content.stats];
                    arr[i] = { ...arr[i], label: v };
                    update("stats", arr);
                  }} />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "About" && (
          <>
            <Field label="Paragraphe 1" value={content.about?.p1 || ""} onChange={v => update("about", { ...content.about, p1: v })} multiline />
            <Field label="Paragraphe 2" value={content.about?.p2 || ""} onChange={v => update("about", { ...content.about, p2: v })} multiline />
            <Field label="Paragraphe 3" value={content.about?.p3 || ""} onChange={v => update("about", { ...content.about, p3: v })} multiline />
            <h3 className="text-neutral-text text-sm font-bold mb-3 mt-4">Valeurs</h3>
            {(content.about?.values || []).map((val: any, i: number) => (
              <div key={i} className="mb-3 p-4 bg-warm-bg rounded-lg">
                <Field label={`Titre ${i + 1}`} value={val.title} onChange={v => {
                  const vals = [...(content.about?.values || [])];
                  vals[i] = { ...vals[i], title: v };
                  update("about", { ...content.about, values: vals });
                }} />
                <Field label={`Description ${i + 1}`} value={val.desc} onChange={v => {
                  const vals = [...(content.about?.values || [])];
                  vals[i] = { ...vals[i], desc: v };
                  update("about", { ...content.about, values: vals });
                }} multiline />
              </div>
            ))}
          </>
        )}

        {tab === "Témoignages" && (
          <>
            {(content.testimonials || []).map((t: any, i: number) => (
              <div key={i} className="mb-4 p-4 bg-warm-bg rounded-lg">
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
                  <Field label="Avatar" value={t.avatar} onChange={v => {
                    const arr = [...content.testimonials]; arr[i] = { ...arr[i], avatar: v }; update("testimonials", arr);
                  }} />
                </div>
                <Field label="Texte" value={t.text} onChange={v => {
                  const arr = [...content.testimonials]; arr[i] = { ...arr[i], text: v }; update("testimonials", arr);
                }} multiline />
              </div>
            ))}
            <button
              onClick={() => update("testimonials", [...(content.testimonials || []), { name: "", role: "", company: "", text: "", avatar: "" }])}
              className="text-gold text-[13px] font-semibold hover:underline"
            >
              + Ajouter un témoignage
            </button>
          </>
        )}

        {tab === "Secteurs" && (
          <>
            <p className="text-neutral-muted text-[13px] mb-4">Noms des secteurs (les icônes sont gérées côté code).</p>
            {(content.sectors || []).map((name: string, i: number) => (
              <Field key={i} label={`Secteur ${i + 1}`} value={name} onChange={v => {
                const arr = [...content.sectors]; arr[i] = v; update("sectors", arr);
              }} />
            ))}
          </>
        )}

        {tab === "FAQs" && (
          <>
            {(content.faqs || []).map((f: any, i: number) => (
              <div key={i} className="mb-4 p-4 bg-warm-bg rounded-lg">
                <Field label={`Question ${i + 1}`} value={f.q} onChange={v => {
                  const arr = [...content.faqs]; arr[i] = { ...arr[i], q: v }; update("faqs", arr);
                }} />
                <Field label={`Réponse ${i + 1}`} value={f.a} onChange={v => {
                  const arr = [...content.faqs]; arr[i] = { ...arr[i], a: v }; update("faqs", arr);
                }} multiline />
              </div>
            ))}
            <button
              onClick={() => update("faqs", [...(content.faqs || []), { q: "", a: "" }])}
              className="text-gold text-[13px] font-semibold hover:underline"
            >
              + Ajouter une FAQ
            </button>
          </>
        )}

        {tab === "Contact" && (
          <>
            <Field label="Email" value={content.contact?.email || ""} onChange={v => update("contact", { ...content.contact, email: v })} />
            <Field label="Téléphone" value={content.contact?.phone || ""} onChange={v => update("contact", { ...content.contact, phone: v })} />
            <Field label="Ville" value={content.contact?.city || ""} onChange={v => update("contact", { ...content.contact, city: v })} />
          </>
        )}

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
