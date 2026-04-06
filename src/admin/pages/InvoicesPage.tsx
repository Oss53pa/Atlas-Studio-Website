import { useState, useEffect } from "react";
import { Loader2, DollarSign, Clock, AlertTriangle, Download, Plus, Check, Send, Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminCard } from "../components/AdminCard";
import { AdminModal } from "../components/AdminModal";
import { useAppCatalog } from "../../hooks/useAppCatalog";
import { useAppFilter } from "../contexts/AppFilterContext";
import { exportToCSV } from "../../lib/csvExport";
import { apiCall } from "../../lib/api";
import type { Invoice, InvoiceStatus, Profile } from "../../lib/database.types";

interface InvoiceWithProfile extends Invoice {
  profiles?: { full_name: string; email: string } | null;
}

const dateFilters = [
  { label: "Tout", value: "all" },
  { label: "Ce mois", value: "1" },
  { label: "3 mois", value: "3" },
  { label: "6 mois", value: "6" },
  { label: "12 mois", value: "12" },
];

export default function InvoicesPage() {
  const { appMap, appList } = useAppCatalog();
  const { selectedApp: globalAppFilter } = useAppFilter();
  const [invoices, setInvoices] = useState<InvoiceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [toast, setToast] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Profile[]>([]);
  const [formData, setFormData] = useState({ user_id: "", app_id: "", plan: "", amount: 0, currency: "FCFA", status: "pending" as string });
  const [saving, setSaving] = useState(false);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("invoices")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (data) setInvoices(data as InvoiceWithProfile[]);
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Apply filters
  const filtered = invoices.filter(i => {
    if (filter !== "all" && i.status !== filter) return false;
    if (globalAppFilter !== "all" && i.app_id !== globalAppFilter) return false;
    if (dateFilter !== "all") {
      const months = Number(dateFilter);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      if (new Date(i.created_at) < cutoff) return false;
    }
    return true;
  });

  // Status actions
  const setStatus = async (inv: InvoiceWithProfile, status: InvoiceStatus) => {
    const updates: Record<string, any> = { status };
    if (status === "paid") updates.paid_at = new Date().toISOString();
    await supabase.from("invoices").update(updates).eq("id", inv.id);
    fetchInvoices();
    showToast(`Facture ${status === "paid" ? "marquee payee" : status === "refunded" ? "remboursee" : status}`);
  };

  // Create invoice
  const openCreateForm = async () => {
    const { data } = await supabase.from("profiles").select("*").order("full_name");
    setClients(data as Profile[] || []);
    setFormData({ user_id: "", app_id: appList[0]?.id || "", plan: "", amount: 0, currency: "FCFA", status: "pending" });
    setShowForm(true);
  };

  const handleCreate = async () => {
    if (!formData.user_id) return;
    setSaving(true);
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("invoices").insert({
      invoice_number: invoiceNumber,
      user_id: formData.user_id,
      app_id: formData.app_id || null,
      plan: formData.plan || null,
      amount: formData.amount,
      currency: formData.currency,
      status: formData.status as InvoiceStatus,
      paid_at: formData.status === "paid" ? new Date().toISOString() : null,
    });
    setSaving(false);
    if (error) {
      showToast(`Erreur: ${error.message}`);
    } else {
      showToast("Facture creee");
      setShowForm(false);
      fetchInvoices();
    }
  };

  // Send invoice by email
  const handleSendEmail = async (inv: InvoiceWithProfile) => {
    if (!inv.profiles?.email) return;
    try {
      await apiCall("send-email", {
        method: "POST",
        body: {
          appId: "core",
          to: inv.profiles.email,
          subject: `Facture ${inv.invoice_number} — Atlas Studio`,
          html: `<h2>Bonjour ${inv.profiles.full_name || ""},</h2><p>Votre facture <strong>${inv.invoice_number}</strong> d'un montant de <strong>${Number(inv.amount).toLocaleString("fr-FR")} ${inv.currency || "FCFA"}</strong> est disponible.</p><p>Statut : <strong>${inv.status}</strong></p><p>Consultez votre espace client pour plus de details.</p><p style="margin-top:20px;"><a href="https://atlas-studio.org/portal" style="display:inline-block;background:#C8A960;color:#0A0A0A;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;">Mon espace</a></p>`,
        },
      });
      showToast(`Facture envoyee a ${inv.profiles.email}`);
    } catch {
      showToast("Erreur d'envoi email");
    }
  };

  const handleDownloadPDF = async (invoiceId: string, invoiceNumber: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-pdf?id=${invoiceId}`,
        { headers: { Authorization: `Bearer ${session?.access_token}` } }
      );
      if (!res.ok) throw new Error("Erreur");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `facture-${invoiceNumber}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* PDF non disponible */ }
  };

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "invoice_number", label: "Numero" },
      { key: "profiles", label: "Client", render: (r: InvoiceWithProfile) => r.profiles?.full_name || "—" },
      { key: "profiles", label: "Email", render: (r: InvoiceWithProfile) => r.profiles?.email || "—" },
      { key: "app_id", label: "Application", render: (r: InvoiceWithProfile) => appMap[r.app_id]?.name || r.app_id || "—" },
      { key: "amount", label: "Montant" },
      { key: "currency", label: "Devise" },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date", render: (r: InvoiceWithProfile) => new Date(r.created_at).toLocaleDateString("fr-FR") },
    ], "factures");
    showToast("Export CSV telecharge");
  };

  const fmt = (n: number) => n.toLocaleString("fr-FR");
  const monthlyRevenue = invoices
    .filter(i => i.status === "paid" && new Date(i.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const pendingAmount = invoices.filter(i => i.status === "pending").reduce((sum, i) => sum + Number(i.amount), 0);
  const failedAmount = invoices.filter(i => i.status === "failed").reduce((sum, i) => sum + Number(i.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold dark:text-admin-accent" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">Factures</h1>
          <p className="text-neutral-muted dark:text-admin-muted text-sm">{invoices.length} factures</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="px-4 py-2.5 border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] font-semibold text-neutral-text dark:text-neutral-body dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors flex items-center gap-2">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={openCreateForm} className="bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold dark:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouvelle facture
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold dark:bg-admin-accent/10 border border-gold/20 text-gold dark:text-admin-accent text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <AdminCard label="Revenus du mois" value={`${fmt(monthlyRevenue)} FCFA`} icon={DollarSign} />
        <AdminCard label="En attente" value={`${fmt(pendingAmount)} FCFA`} icon={Clock} />
        <AdminCard label="Echouees" value={`${fmt(failedAmount)} FCFA`} icon={AlertTriangle} />
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap mb-3">
        {[
          { label: "Toutes", value: "all" },
          { label: "Payees", value: "paid" },
          { label: "En attente", value: "pending" },
          { label: "Echouees", value: "failed" },
          { label: "Remboursees", value: "refunded" },
        ].map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${filter === f.value ? "bg-gold dark:bg-admin-accent text-onyx" : "bg-white dark:bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt text-neutral-text dark:text-neutral-body dark:text-admin-text/80 hover:border-gold/40 dark:hover:border-admin-accent/40"}`}>
            {f.label}
          </button>
        ))}
      </div>
      {/* Date filters */}
      <div className="flex gap-2 flex-wrap mb-6">
        {dateFilters.map(f => (
          <button key={f.value} onClick={() => setDateFilter(f.value)}
            className={`px-3 py-1.5 rounded text-[12px] font-medium transition-all ${dateFilter === f.value ? "bg-neutral-200 text-neutral-700" : "bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:bg-neutral-100"}`}>
            {f.label}
          </button>
        ))}
      </div>

      <AdminTable
        keyExtractor={(r: InvoiceWithProfile) => r.id}
        columns={[
          { key: "invoice_number", label: "Facture", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="font-mono text-neutral-text dark:text-admin-text">{r.invoice_number}</span>
          )},
          { key: "user", label: "Client", render: (r: InvoiceWithProfile) => (
            <div>
              <span className="font-medium text-neutral-text dark:text-admin-text">{r.profiles?.full_name || "—"}</span>
              <div className="text-neutral-muted dark:text-admin-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "amount", label: "Montant", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="text-gold dark:text-admin-accent font-semibold">{fmt(Number(r.amount))} {r.currency || "FCFA"}</span>
          )},
          { key: "status", label: "Statut", render: (r: InvoiceWithProfile) => <AdminBadge status={r.status} /> },
          { key: "created_at", label: "Date", sortable: true, render: (r: InvoiceWithProfile) => new Date(r.created_at).toLocaleDateString("fr-FR") },
          { key: "actions", label: "Actions", render: (r: InvoiceWithProfile) => (
            <div className="flex items-center gap-1">
              {r.status === "pending" && (
                <button onClick={(e) => { e.stopPropagation(); setStatus(r, "paid"); }} className="px-2 py-1 rounded text-[11px] font-medium text-green-600 hover:bg-green-50 transition-colors">Payer</button>
              )}
              {r.status === "paid" && (
                <button onClick={(e) => { e.stopPropagation(); setStatus(r, "refunded"); }} className="px-2 py-1 rounded text-[11px] font-medium text-purple-600 hover:bg-purple-50 transition-colors">Rembourser</button>
              )}
              {r.status === "failed" && (
                <button onClick={(e) => { e.stopPropagation(); setStatus(r, "pending"); }} className="px-2 py-1 rounded text-[11px] font-medium text-amber-600 hover:bg-amber-50 transition-colors">Relancer</button>
              )}
              <button onClick={(e) => { e.stopPropagation(); handleSendEmail(r); }} className="p-1.5 rounded hover:bg-blue-50 text-neutral-muted dark:text-admin-muted hover:text-blue-600 transition-colors" title="Envoyer par email">
                <Mail size={13} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(r.id, r.invoice_number); }} className="p-1.5 rounded hover:bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted hover:text-gold dark:text-admin-accent transition-colors" title="Telecharger PDF">
                <Download size={13} />
              </button>
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Create invoice modal */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title="Nouvelle facture">
        <div className="space-y-3">
          <div>
            <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Client</label>
            <select value={formData.user_id} onChange={e => setFormData(p => ({ ...p, user_id: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
              <option value="">Selectionner un client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Application</label>
              <select value={formData.app_id} onChange={e => setFormData(p => ({ ...p, app_id: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
                <option value="">Aucune</option>
                {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Plan</label>
              <input value={formData.plan} onChange={e => setFormData(p => ({ ...p, plan: e.target.value }))} placeholder="ex: pro" className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Montant</label>
              <input type="number" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: Number(e.target.value) }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors" />
            </div>
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Devise</label>
              <select value={formData.currency} onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
                <option value="FCFA">FCFA</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div>
              <label className="block text-neutral-text dark:text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">Statut</label>
              <select value={formData.status} onChange={e => setFormData(p => ({ ...p, status: e.target.value }))} className="w-full px-4 py-3 bg-white dark:bg-white dark:bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors">
                <option value="pending">En attente</option>
                <option value="paid">Payee</option>
              </select>
            </div>
          </div>
          <button onClick={handleCreate} disabled={saving || !formData.user_id} className={`bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold dark:bg-admin-accent-dark transition-colors w-full mt-4 ${saving || !formData.user_id ? "opacity-50" : ""}`}>
            {saving ? "Creation..." : "Creer la facture"}
          </button>
        </div>
      </AdminModal>
    </div>
  );
}
