import { useState, useEffect } from "react";
import { Globe2, Pencil, ShieldCheck, ShieldAlert, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { OHADA_COUNTRIES } from "../../config/ohada";
import type { OhadaCountryTaxRow } from "../../lib/database.types";
import { AdminTable } from "../components/AdminTable";
import { AdminModal } from "../components/AdminModal";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";

const ZONE_LABEL: Record<string, string> = { UEMOA: "UEMOA", CEMAC: "CEMAC", other: "Hors zone" };

function fmtRate(v: number | null): string {
  return v === null || v === undefined ? "—" : `${v}%`;
}

export default function OhadaReferentielPage() {
  const { success, error: showError } = useToast();
  const [rows, setRows] = useState<OhadaCountryTaxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [edit, setEdit] = useState<Partial<OhadaCountryTaxRow> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchRows = async () => {
    const { data, error } = await supabase
      .from("ohada_country_tax")
      .select("*")
      .order("country_name");
    if (error || !data || data.length === 0) {
      // Repli sur le référentiel statique (base injoignable / non migrée).
      setRows(OHADA_COUNTRIES as unknown as OhadaCountryTaxRow[]);
    } else {
      setRows(data as unknown as OhadaCountryTaxRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = search
    ? rows.filter(r =>
        r.country_name.toLowerCase().includes(search.toLowerCase()) ||
        r.country_code.toLowerCase().includes(search.toLowerCase()) ||
        (r.tax_authority || "").toLowerCase().includes(search.toLowerCase()))
    : rows;

  const verifiedCount = rows.filter(r => r.rates_verified).length;

  const handleSave = async () => {
    if (!edit?.country_code) return;
    setSaving(true);
    const patch = {
      vat_standard_rate: edit.vat_standard_rate ?? null,
      corporate_tax_rate: edit.corporate_tax_rate ?? null,
      tax_authority: edit.tax_authority || null,
      efiling_url: edit.efiling_url || null,
      notes: edit.notes || null,
      rates_verified: edit.rates_verified ?? false,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from("ohada_country_tax")
      .update(patch)
      .eq("country_code", edit.country_code);
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success(`${edit.country_name} mis à jour`); setEdit(null); fetchRows(); }
  };

  const inputClass = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Référentiel fiscal OHADA</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">
            {rows.length} pays — {verifiedCount} taux vérifiés. TVA &amp; IS éditables par pays.
          </p>
        </div>
      </div>

      <div className="relative mb-6 max-w-sm">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un pays..."
          className="w-full px-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
      </div>

      <AdminTable
        keyExtractor={(r: OhadaCountryTaxRow) => r.country_code}
        loading={loading}
        emptyMessage="Aucun pays"
        emptyIcon={<Globe2 size={32} />}
        onRowClick={(r: OhadaCountryTaxRow) => setEdit(r)}
        columns={[
          { key: "country", label: "Pays", sortable: true, render: (r: OhadaCountryTaxRow) => (
            <div>
              <div className="font-medium text-neutral-text dark:text-admin-text">{r.country_name}</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px] font-mono">{r.country_code} · {ZONE_LABEL[r.zone] || r.zone}</div>
            </div>
          )},
          { key: "currency", label: "Devise", render: (r: OhadaCountryTaxRow) => (
            <span className="text-[12px] font-mono text-neutral-muted dark:text-admin-muted">{r.currency}</span>
          )},
          { key: "vat", label: "TVA", render: (r: OhadaCountryTaxRow) => (
            <span className="text-[13px] font-medium text-neutral-text dark:text-admin-text">{fmtRate(r.vat_standard_rate)}</span>
          )},
          { key: "is", label: "IS", render: (r: OhadaCountryTaxRow) => (
            <span className="text-[13px] font-medium text-neutral-text dark:text-admin-text">{fmtRate(r.corporate_tax_rate)}</span>
          )},
          { key: "authority", label: "Autorité", render: (r: OhadaCountryTaxRow) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{r.tax_authority || "—"}</span>
          )},
          { key: "verified", label: "Statut", render: (r: OhadaCountryTaxRow) => (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
              r.rates_verified
                ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400"
                : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
            }`}>
              {r.rates_verified ? <ShieldCheck size={13} /> : <ShieldAlert size={13} />}
              {r.rates_verified ? "Vérifié" : "À confirmer"}
            </span>
          )},
          { key: "actions", label: "", render: (r: OhadaCountryTaxRow) => (
            <button onClick={e => { e.stopPropagation(); setEdit(r); }}
              className="p-1.5 rounded hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors"><Pencil size={14} /></button>
          )},
        ]}
        data={filtered}
      />

      <AdminModal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Fiscalité — ${edit.country_name}` : ""}
        footer={
          <>
            <button onClick={() => setEdit(null)} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving ? "opacity-50" : ""}`}>{saving ? "..." : "Sauvegarder"}</button>
          </>
        }>
        {edit && (
          <div className="space-y-4">
            <div className="text-[12px] text-neutral-muted dark:text-admin-muted">
              {edit.country_code} · {ZONE_LABEL[edit.zone || "other"]} · {edit.currency}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">TVA standard (%)</label>
                <input type="number" step="0.01" min={0} max={100} value={edit.vat_standard_rate ?? ""} placeholder="—"
                  onChange={e => setEdit({ ...edit, vat_standard_rate: e.target.value === "" ? null : Number(e.target.value) })} className={inputClass} /></div>
              <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Impôt sociétés IS (%)</label>
                <input type="number" step="0.01" min={0} max={100} value={edit.corporate_tax_rate ?? ""} placeholder="—"
                  onChange={e => setEdit({ ...edit, corporate_tax_rate: e.target.value === "" ? null : Number(e.target.value) })} className={inputClass} /></div>
            </div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Autorité fiscale</label>
              <input value={edit.tax_authority || ""} onChange={e => setEdit({ ...edit, tax_authority: e.target.value })} placeholder="DGI" className={inputClass} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">URL télédéclaration</label>
              <input value={edit.efiling_url || ""} onChange={e => setEdit({ ...edit, efiling_url: e.target.value })} placeholder="https://..." className={inputClass} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Notes</label>
              <textarea value={edit.notes || ""} onChange={e => setEdit({ ...edit, notes: e.target.value })} rows={2} className={`${inputClass} resize-y`} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Taux vérifié</label>
              <button onClick={() => setEdit({ ...edit, rates_verified: !edit.rates_verified })}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                  edit.rates_verified
                    ? "bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-500/30"
                    : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"
                }`}>
                {edit.rates_verified ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                {edit.rates_verified ? "Vérifié & validé" : "À confirmer"}
              </button></div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
