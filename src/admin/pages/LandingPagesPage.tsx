import { useState, useEffect, useCallback } from "react";
import {
  Save, Loader2, ChevronDown, ChevronRight, Plus, Trash2, ExternalLink,
  Star, Clock, LayoutDashboard, MessageSquareQuote, HelpCircle, Megaphone,
  BarChart3, CreditCard, Sparkles, X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../contexts/ToastContext";

/* ── constants ── */
const APPS = [
  { id: "advist", label: "Advist", url: "https://advist.atlas-studio.io" },
  { id: "taxpilot", label: "Liass'Pilot", url: "https://taxpilot.atlas-studio.io" },
  { id: "atlas-compta", label: "Atlas F&A", url: "https://compta.atlas-studio.io" },
] as const;

const SECTIONS = [
  { key: "hero", label: "Hero", icon: LayoutDashboard, order: 1 },
  { key: "stats", label: "Stats", icon: BarChart3, order: 2 },
  { key: "features", label: "Features", icon: Sparkles, order: 3 },
  { key: "pricing", label: "Pricing", icon: CreditCard, order: 4 },
  { key: "testimonials", label: "Testimonials", icon: MessageSquareQuote, order: 5 },
  { key: "faq", label: "FAQ", icon: HelpCircle, order: 6 },
  { key: "cta", label: "CTA", icon: Megaphone, order: 7 },
] as const;

type AppId = (typeof APPS)[number]["id"];
type SectionKey = (typeof SECTIONS)[number]["key"];
type SectionData = Record<string, any>;
type ContentMap = Partial<Record<SectionKey, { data: SectionData; updated_at: string | null }>>;

/* ── style tokens ── */
const cx = {
  bg: "bg-[#0A0A0A]",
  surface: "bg-[#1E1E2E]",
  alt: "bg-[#2A2A3A]",
  border: "border-[#2A2A3A]",
  accent: "text-[#EF9F27]",
  accentBg: "bg-[#EF9F27]",
  text: "text-[#F5F5F5]",
  muted: "text-[#888]",
  input: "w-full px-3 py-2 bg-[#2A2A3A] border border-[#2A2A3A] rounded-lg text-[#F5F5F5] text-sm outline-none focus:border-[#EF9F27] transition-colors placeholder-[#666]",
  btn: "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
};

/* ── tiny components ── */
function Field({ label, value, onChange, multi, placeholder, mono }: {
  label: string; value: string; onChange: (v: string) => void; multi?: boolean; placeholder?: string; mono?: boolean;
}) {
  const cls = `${cx.input}${mono ? " font-mono" : ""}`;
  return (
    <div className="mb-3">
      <label className="block text-[#888] text-xs font-semibold mb-1">{label}</label>
      {multi
        ? <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} placeholder={placeholder} className={`${cls} resize-y`} />
        : <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
    </div>
  );
}

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => { if (draft.trim()) { onChange([...tags, draft.trim()]); setDraft(""); } };
  return (
    <div className="mb-3">
      <label className="block text-[#888] text-xs font-semibold mb-1">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {tags.map((t, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-[#EF9F27]/15 text-[#EF9F27] rounded text-xs">
            {t}<X className="w-3 h-3 cursor-pointer" onClick={() => onChange(tags.filter((_, j) => j !== i))} />
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          className={cx.input} placeholder="Type and press Enter" />
        <button onClick={add} className={`${cx.btn} ${cx.accentBg} text-[#0A0A0A]`}><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/* ── section editors ── */
function HeroEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const u = (k: string, v: any) => set({ ...data, [k]: v });
  return (<>
    <Field label="Title" value={data.title || ""} onChange={v => u("title", v)} />
    <Field label="Subtitle" value={data.subtitle || ""} onChange={v => u("subtitle", v)} multi />
    <div className="grid grid-cols-2 gap-3">
      <Field label="CTA Primary Text" value={data.cta_primary_text || ""} onChange={v => u("cta_primary_text", v)} />
      <Field label="CTA Primary URL" value={data.cta_primary_url || ""} onChange={v => u("cta_primary_url", v)} />
      <Field label="CTA Secondary Text" value={data.cta_secondary_text || ""} onChange={v => u("cta_secondary_text", v)} />
      <Field label="CTA Secondary URL" value={data.cta_secondary_url || ""} onChange={v => u("cta_secondary_url", v)} />
    </div>
    <TagInput label="Badges" tags={data.badges || []} onChange={v => u("badges", v)} />
  </>);
}

function StatsEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const items: { value: string; label: string }[] = data.items || [];
  const upd = (arr: typeof items) => set({ ...data, items: arr });
  return (<>
    {items.map((s, i) => (
      <div key={i} className="flex gap-2 mb-2 items-end">
        <Field label="Value" value={s.value} onChange={v => upd(items.map((x, j) => j === i ? { ...x, value: v } : x))} />
        <Field label="Label" value={s.label} onChange={v => upd(items.map((x, j) => j === i ? { ...x, label: v } : x))} />
        <button onClick={() => upd(items.filter((_, j) => j !== i))} className="mb-3 p-2 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
      </div>
    ))}
    <button onClick={() => upd([...items, { value: "", label: "" }])} className={`${cx.btn} border ${cx.border} ${cx.muted} hover:${cx.text}`}>
      <Plus className="w-4 h-4 inline mr-1" />Add stat
    </button>
  </>);
}

function FeaturesEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const items: { title: string; description: string; icon: string }[] = data.items || [];
  const upd = (arr: typeof items) => set({ ...data, items: arr });
  return (<>
    {items.map((f, i) => (
      <div key={i} className={`p-3 ${cx.alt} rounded-lg mb-2`}>
        <div className="flex justify-between mb-2">
          <span className="text-xs text-[#888]">Feature {i + 1}</span>
          <button onClick={() => upd(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Title" value={f.title} onChange={v => upd(items.map((x, j) => j === i ? { ...x, title: v } : x))} />
          <Field label="Icon (lucide name)" value={f.icon || ""} onChange={v => upd(items.map((x, j) => j === i ? { ...x, icon: v } : x))} />
        </div>
        <Field label="Description" value={f.description} onChange={v => upd(items.map((x, j) => j === i ? { ...x, description: v } : x))} multi />
      </div>
    ))}
    <button onClick={() => upd([...items, { title: "", description: "", icon: "" }])} className={`${cx.btn} border ${cx.border} ${cx.muted} hover:${cx.text}`}>
      <Plus className="w-4 h-4 inline mr-1" />Add feature
    </button>
  </>);
}

function PricingEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const plans: any[] = data.plans || [];
  const upd = (arr: any[]) => set({ ...data, plans: arr });
  const patch = (i: number, k: string, v: any) => upd(plans.map((p, j) => j === i ? { ...p, [k]: v } : p));
  return (<>
    {plans.map((p, i) => (
      <div key={i} className={`p-4 ${cx.alt} rounded-lg mb-3 ${p.is_popular ? "ring-1 ring-[#EF9F27]" : ""}`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-[#F5F5F5]">{p.name || `Plan ${i + 1}`}</span>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-[#888] cursor-pointer">
              <input type="checkbox" checked={!!p.is_popular} onChange={e => patch(i, "is_popular", e.target.checked)} className="accent-[#EF9F27]" />
              <Star className="w-3.5 h-3.5" />Popular
            </label>
            <button onClick={() => upd(plans.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <Field label="Name" value={p.name || ""} onChange={v => patch(i, "name", v)} />
          <Field label="Price" value={String(p.price ?? "")} onChange={v => patch(i, "price", Number(v) || 0)} mono />
          <Field label="Currency" value={p.currency || "FCFA"} onChange={v => patch(i, "currency", v)} mono />
          <Field label="Period" value={p.period || ""} onChange={v => patch(i, "period", v)} placeholder="/mois" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="CTA Text" value={p.cta_text || ""} onChange={v => patch(i, "cta_text", v)} />
          <Field label="CTA URL" value={p.cta_url || ""} onChange={v => patch(i, "cta_url", v)} />
        </div>
        <TagInput label="Features" tags={p.features || []} onChange={v => patch(i, "features", v)} />
      </div>
    ))}
    <button onClick={() => upd([...plans, { name: "", price: 0, currency: "FCFA", period: "/mois", features: [], is_popular: false, cta_text: "", cta_url: "" }])}
      className={`${cx.btn} border ${cx.border} ${cx.muted} hover:${cx.text}`}>
      <Plus className="w-4 h-4 inline mr-1" />Add plan
    </button>
  </>);
}

function TestimonialsEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const items: any[] = data.items || [];
  const upd = (arr: any[]) => set({ ...data, items: arr });
  const patch = (i: number, k: string, v: any) => upd(items.map((t, j) => j === i ? { ...t, [k]: v } : t));
  return (<>
    {items.map((t, i) => (
      <div key={i} className={`p-3 ${cx.alt} rounded-lg mb-2`}>
        <div className="flex justify-between mb-2">
          <span className="text-xs text-[#888]">Testimonial {i + 1}</span>
          <button onClick={() => upd(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Name" value={t.name || ""} onChange={v => patch(i, "name", v)} />
          <Field label="Role" value={t.role || ""} onChange={v => patch(i, "role", v)} />
          <Field label="Company" value={t.company || ""} onChange={v => patch(i, "company", v)} />
        </div>
        <Field label="Text" value={t.text || ""} onChange={v => patch(i, "text", v)} multi />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Avatar URL" value={t.avatar || ""} onChange={v => patch(i, "avatar", v)} />
          <div className="mb-3">
            <label className="block text-[#888] text-xs font-semibold mb-1">Rating</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map(n => (
                <Star key={n} className={`w-5 h-5 cursor-pointer ${n <= (t.rating || 0) ? "text-[#EF9F27] fill-[#EF9F27]" : "text-[#2A2A3A]"}`}
                  onClick={() => patch(i, "rating", n)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    ))}
    <button onClick={() => upd([...items, { name: "", role: "", company: "", text: "", avatar: "", rating: 5 }])}
      className={`${cx.btn} border ${cx.border} ${cx.muted} hover:${cx.text}`}>
      <Plus className="w-4 h-4 inline mr-1" />Add testimonial
    </button>
  </>);
}

function FAQEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const items: { question: string; answer: string }[] = data.items || [];
  const upd = (arr: typeof items) => set({ ...data, items: arr });
  return (<>
    {items.map((f, i) => (
      <div key={i} className="flex gap-2 mb-2 items-start">
        <div className="flex-1">
          <Field label={`Q${i + 1}`} value={f.question} onChange={v => upd(items.map((x, j) => j === i ? { ...x, question: v } : x))} />
          <Field label="Answer" value={f.answer} onChange={v => upd(items.map((x, j) => j === i ? { ...x, answer: v } : x))} multi />
        </div>
        <button onClick={() => upd(items.filter((_, j) => j !== i))} className="mt-5 p-2 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
      </div>
    ))}
    <button onClick={() => upd([...items, { question: "", answer: "" }])} className={`${cx.btn} border ${cx.border} ${cx.muted} hover:${cx.text}`}>
      <Plus className="w-4 h-4 inline mr-1" />Add FAQ
    </button>
  </>);
}

function CTAEditor({ data, set }: { data: SectionData; set: (d: SectionData) => void }) {
  const u = (k: string, v: any) => set({ ...data, [k]: v });
  return (<>
    <Field label="Title" value={data.title || ""} onChange={v => u("title", v)} />
    <Field label="Subtitle" value={data.subtitle || ""} onChange={v => u("subtitle", v)} multi />
    <div className="grid grid-cols-2 gap-3">
      <Field label="CTA Text" value={data.cta_text || ""} onChange={v => u("cta_text", v)} />
      <Field label="CTA URL" value={data.cta_url || ""} onChange={v => u("cta_url", v)} />
    </div>
  </>);
}

const EDITORS: Record<SectionKey, React.FC<{ data: SectionData; set: (d: SectionData) => void }>> = {
  hero: HeroEditor, stats: StatsEditor, features: FeaturesEditor,
  pricing: PricingEditor, testimonials: TestimonialsEditor, faq: FAQEditor, cta: CTAEditor,
};

/* ══════════════ MAIN PAGE ══════════════ */
export default function LandingPagesPage() {
  const { user } = useAuth();
  const { success, error: toastErr } = useToast();
  const [app, setApp] = useState<AppId>("advist");
  const [content, setContent] = useState<Record<AppId, ContentMap>>({ advist: {}, taxpilot: {}, "atlas-compta": {} });
  const [open, setOpen] = useState<SectionKey | null>("hero");
  const [saving, setSaving] = useState<SectionKey | null>(null);
  const [loading, setLoading] = useState(true);

  /* fetch all apps in one go */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_landing_content").select("*").order("sort_order");
    if (error) { toastErr("Failed to load content"); setLoading(false); return; }
    const map: Record<AppId, ContentMap> = { advist: {}, taxpilot: {}, "atlas-compta": {} };
    for (const row of data ?? []) {
      const aid = row.app_id as AppId;
      if (map[aid]) map[aid][row.section as SectionKey] = { data: row.data ?? {}, updated_at: row.updated_at };
    }
    setContent(map);
    setLoading(false);
  }, [toastErr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getData = (sec: SectionKey): SectionData => content[app]?.[sec]?.data ?? {};
  const setData = (sec: SectionKey, d: SectionData) => {
    setContent(prev => ({ ...prev, [app]: { ...prev[app], [sec]: { data: d, updated_at: prev[app]?.[sec]?.updated_at ?? null } } }));
  };

  const save = async (sec: SectionKey) => {
    setSaving(sec);
    const sectionMeta = SECTIONS.find(s => s.key === sec)!;
    const { error } = await supabase.from("app_landing_content").upsert(
      { app_id: app, section: sec, data: getData(sec), sort_order: sectionMeta.order, updated_at: new Date().toISOString(), updated_by: user?.id },
      { onConflict: "app_id,section" },
    );
    setSaving(null);
    if (error) { toastErr(`Save failed: ${error.message}`); return; }
    success(`${sectionMeta.label} saved`);
    fetchAll();
  };

  const appMeta = APPS.find(a => a.id === app)!;

  return (
    <div className={`min-h-screen ${cx.bg} ${cx.text} p-6`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Landing Pages</h1>
          <p className={`text-sm ${cx.muted}`}>Manage landing page content for all apps</p>
        </div>
        <button onClick={() => window.open(appMeta.url, "_blank")}
          className={`${cx.btn} ${cx.accentBg} text-[#0A0A0A] font-semibold flex items-center gap-2`}>
          <ExternalLink className="w-4 h-4" />Preview {appMeta.label}
        </button>
      </div>

      {/* App tabs */}
      <div className={`flex gap-1 p-1 ${cx.surface} rounded-xl mb-6 w-fit`}>
        {APPS.map(a => (
          <button key={a.id} onClick={() => { setApp(a.id); setOpen("hero"); }}
            className={`${cx.btn} ${app === a.id ? `${cx.accentBg} text-[#0A0A0A] font-semibold` : `${cx.muted} hover:text-[#F5F5F5]`}`}>
            {a.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[#EF9F27]" /></div>
      ) : (
        <div className="space-y-2 max-w-4xl">
          {SECTIONS.map(sec => {
            const isOpen = open === sec.key;
            const Icon = sec.icon;
            const Editor = EDITORS[sec.key];
            const ts = content[app]?.[sec.key]?.updated_at;
            return (
              <div key={sec.key} className={`${cx.surface} rounded-xl overflow-hidden`}>
                {/* Accordion header */}
                <button onClick={() => setOpen(isOpen ? null : sec.key)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#2A2A3A]/40 transition-colors">
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-[#EF9F27]" /> : <ChevronRight className="w-4 h-4 text-[#888]" />}
                    <Icon className={`w-4 h-4 ${isOpen ? "text-[#EF9F27]" : "text-[#888]"}`} />
                    <span className={`text-sm font-semibold ${isOpen ? "text-[#F5F5F5]" : "text-[#888]"}`}>{sec.label}</span>
                  </div>
                  {ts && (
                    <span className="flex items-center gap-1.5 text-[10px] text-[#888]">
                      <Clock className="w-3 h-3" />{new Date(ts).toLocaleString()}
                    </span>
                  )}
                </button>
                {/* Accordion body */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#2A2A3A]">
                    <div className="pt-4">
                      <Editor data={getData(sec.key)} set={d => setData(sec.key, d)} />
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={() => save(sec.key)} disabled={saving === sec.key}
                        className={`${cx.btn} ${cx.accentBg} text-[#0A0A0A] font-semibold flex items-center gap-2 disabled:opacity-50`}>
                        {saving === sec.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save {sec.label}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
