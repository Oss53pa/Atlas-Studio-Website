import { useState, useEffect } from "react";
import { DollarSign, Clock, AlertTriangle, Download, Plus, Send, Mail, Search } from "lucide-react";
import { ADMIN_INPUT_CLASS } from "../components/AdminFormField";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminCard } from "../components/AdminCard";
import { AdminModal } from "../components/AdminModal";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { useToast } from "../contexts/ToastContext";
import { exportToCSV } from "../../lib/csvExport";
import { apiCall } from "../../lib/api";
import { formatSupabaseError } from "../../lib/errorMessages";
import type { Invoice, InvoiceStatus, Profile } from "../../lib/database.types";

interface InvoiceWithProfile extends Invoice {
  profiles?: { full_name: string; email: string } | null;
}

const statusFilters = [
  { label: "Toutes", value: "all" },
  { label: "Payées", value: "paid" },
  { label: "En attente", value: "pending" },
  { label: "Échouées", value: "failed" },
  { label: "Remboursées", value: "refunded" },
];

const dateFilters = [
  { label: "Tout", value: "all" },
  { label: "Ce mois", value: "1" },
  { label: "3 mois", value: "3" },
  { label: "6 mois", value: "6" },
  { label: "12 mois", value: "12" },
];

export default function InvoicesPage() {
  const { appMap, appList } = useAppCatalog();
  const { selectedApp } = useAppFilter();
  const { success, error: showError } = useToast();
  const [invoices, setInvoices] = useState<InvoiceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({ user_id: "", app_id: "", plan: "", amount: 0, currency: "FCFA", status: "pending" as string });
  const [saving, setSaving] = useState(false);

  const fetchInvoices = async () => {
    const { data } = await supabase.from("invoices").select("*, profiles(full_name, email)").order("created_at", { ascending: false });
    if (data) setInvoices(data as InvoiceWithProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filtered = invoices.filter(i => {
    if (filter !== "all" && i.status !== filter) return false;
    if (selectedApp !== "all" && i.app_id !== selectedApp) return false;
    if (dateFilter !== "all") {
      const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - Number(dateFilter));
      if (new Date(i.created_at) < cutoff) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!i.invoice_number.toLowerCase().includes(q) && !(i.profiles?.full_name || "").toLowerCase().includes(q) && !(i.profiles?.email || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthlyRevenue = invoices.filter(i => i.status === "paid" && new Date(i.created_at) >= monthStart).reduce((s, i) => s + Number(i.amount), 0);
  const pendingAmount = invoices.filter(i => i.status === "pending").reduce((s, i) => s + Number(i.amount), 0);
  const failedAmount = invoices.filter(i => i.status === "failed").reduce((s, i) => s + Number(i.amount), 0);

  const setStatus = async (inv: InvoiceWithProfile, status: InvoiceStatus) => {
    const updates: Record<string, any> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    const { error } = await supabase.from("invoices").update(updates).eq("id", inv.id);
    if (error) { console.error("Update error:", error); showError?.(`Erreur: ${error.message}`); }
    fetchInvoices();
    success(`Facture ${status === "paid" ? "marquée payée" : status === "refunded" ? "remboursée" : "mise à jour"}`);
  };

  const bulkMarkPaid = async (ids: string[]) => {
    const { error } = await supabase.from("invoices").update({ status: "paid", paid_at: new Date().toISOString() }).in("id", ids);
    if (error) { console.error("Update error:", error); showError?.(`Erreur: ${error.message}`); }
    fetchInvoices();
    success(`${ids.length} facture(s) marquée(s) payée(s)`);
  };

  const openCreateForm = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setClients(data as Profile[] || []);
    setFormData({ user_id: "", app_id: appList[0]?.id || "", plan: "", amount: 0, currency: "FCFA", status: "pending" });
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!formData.user_id) return;
    setSaving(true);
    const { error } = await supabase.from("invoices").insert({
      invoice_number: `INV-${Date.now().toString(36).toUpperCase()}`,
      user_id: formData.user_id, app_id: formData.app_id || null, plan: formData.plan || null,
      amount: formData.amount, currency: formData.currency, status: formData.status as InvoiceStatus,
      paid_at: formData.status === "paid" ? new Date().toISOString() : null,
    });
    setSaving(false);
    if (error) showError(formatSupabaseError(error));
    else { success("Facture créée"); setShowForm(false); fetchInvoices(); }
  };

  const handleSendEmail = async (inv: InvoiceWithProfile) => {
    if (!inv.profiles?.email) return;
    try {
      await apiCall("send-email", {
        method: "POST",
        body: {
          appId: "core", to: inv.profiles.email,
          subject: `Facture ${inv.invoice_number} — Atlas Studio`,
          html: `<h2>Bonjour ${inv.profiles.full_name || ""},</h2><p>Votre facture <strong>${inv.invoice_number}</strong> d'un montant de <strong>${Number(inv.amount).toLocaleString("fr-FR")} ${inv.currency || "FCFA"}</strong> est disponible.</p><p>Consultez votre espace client.</p><p style="margin-top:20px;"><a href="https://atlas-studio.org/portal" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Mon espace</a></p>`,
        },
      });
      success(`Facture envoyée à ${inv.profiles.email}`);
    } catch { showError("Erreur d'envoi email"); }
  };

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "invoice_number", label: "Numéro" },
      { key: "profiles", label: "Client", render: (r: InvoiceWithProfile) => r.profiles?.full_name || "—" },
      { key: "amount", label: "Montant" },
      { key: "currency", label: "Devise" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date", render: (r: InvoiceWithProfile) => new Date(r.created_at).toLocaleDateString("fr-FR") },
    ], "factures");
    success("Export CSV téléchargé");
  };

  // inputClass imported from AdminFormField

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Facturation</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{invoices.length} factures</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-medium text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
            <Download size={14} /> CSV
          </button>
          <button onClick={openCreateForm} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-4 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouvelle facture
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <AdminCard label="Revenus du mois" value={`${fmt(monthlyRevenue)} FCFA`} icon={DollarSign} loading={loading} />
        <AdminCard label="En attente" value={`${fmt(pendingAmount)} FCFA`} icon={Clock} loading={loading} />
        <AdminCard label="Échouées" value={`${fmt(failedAmount)} FCFA`} icon={AlertTriangle} loading={loading} />
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                filter === f.value ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-body dark:text-admin-text hover:border-gold/40 dark:hover:border-admin-accent/40"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {dateFilters.map(f => (
            <button key={f.value} onClick={() => setDateFilter(f.value)}
              className={`px-2.5 py-1.5 rounded text-[11px] font-medium transition-all ${
                dateFilter === f.value ? "bg-neutral-200 dark:bg-admin-surface-alt text-neutral-700 dark:text-admin-text" : "text-neutral-muted dark:text-admin-muted hover:bg-neutral-100 dark:hover:bg-admin-surface-alt"
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="N° facture, client..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
        </div>
      </div>

      <AdminTable
        keyExtractor={(r: InvoiceWithProfile) => r.id}
        loading={loading}
        selectable
        bulkActions={[
          { label: "Marquer payées", onClick: bulkMarkPaid },
        ]}
        emptyMessage="Aucune facture"
        columns={[
          { key: "invoice_number", label: "Facture", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="font-mono text-neutral-text dark:text-admin-text">{r.invoice_number}</span>
          )},
          { key: "user", label: "Client", render: (r: InvoiceWithProfile) => (
            <div>
              <div className="font-medium text-neutral-text dark:text-admin-text">{r.profiles?.full_name || "—"}</div>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "amount", label: "Montant", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="text-gold dark:text-admin-accent font-mono font-semibold">{fmt(Number(r.amount))} {r.currency || "FCFA"}</span>
          )},
          { key: "status", label: "Statut", render: (r: InvoiceWithProfile) => <AdminBadge status={r.status} /> },
          { key: "created_at", label: "Date", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
          )},
          { key: "actions", label: "", render: (r: InvoiceWithProfile) => (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              {r.status === "pending" && <button onClick={() => setStatus(r, "paid")} className="px-2 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-colors">Payer</button>}
              {r.status === "paid" && <button onClick={() => setStatus(r, "refunded")} className="px-2 py-1 rounded text-[11px] font-medium text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-colors">Rembourser</button>}
              {r.status === "failed" && <button onClick={() => setStatus(r, "pending")} className="px-2 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">Relancer</button>}
              <button onClick={() => handleSendEmail(r)} className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 text-neutral-muted dark:text-admin-muted hover:text-blue-600 transition-colors" title="Envoyer par email"><Mail size={13} /></button>
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Create modal */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle facture"
        footer={<button onClick={handleCreate} disabled={saving || !formData.user_id} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg px-5 py-2.5 hover:bg-gold-dark dark:hover:bg-admin-accent-dark transition-colors text-[13px] ${saving || !formData.user_id ? "opacity-50" : ""}`}>{saving ? "Création..." : "Créer"}</button>}>
        <div className="space-y-3">
          <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Client</label>
            <select value={formData.user_id} onChange={e => setFormData(p => ({ ...p, user_id: e.target.value }))} className={ADMIN_INPUT_CLASS}>
              <option value="">Sélectionner</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Application</label>
              <select value={formData.app_id} onChange={e => setFormData(p => ({ ...p, app_id: e.target.value }))} className={ADMIN_INPUT_CLASS}>
                <option value="">Aucune</option>
                {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Plan</label>
              <input value={formData.plan} onChange={e => setFormData(p => ({ ...p, plan: e.target.value }))} className={ADMIN_INPUT_CLASS} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Montant</label>
              <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: Number(e.target.value) }))} className={ADMIN_INPUT_CLASS} /></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Devise</label>
              <select value={formData.currency} onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))} className={ADMIN_INPUT_CLASS}>
                <option value="FCFA">FCFA</option><option value="EUR">EUR</option><option value="USD">USD</option>
              </select></div>
            <div><label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut</label>
              <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className={ADMIN_INPUT_CLASS}>
                <option value="pending">En attente</option><option value="paid">Payée</option>
              </select></div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
