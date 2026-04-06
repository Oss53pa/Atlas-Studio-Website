import { useState, useEffect, useMemo } from "react";
import { Search, UserX, UserCheck, Plus, Pencil, Trash2, Download, KeyRound, FileText, FlaskConical } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { apiCall } from "../../lib/api";
import { exportToCSV } from "../../lib/csvExport";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import { AdminCard } from "../components/AdminCard";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { useAppFilter } from "../contexts/AppFilterContext";
import type { Profile, Subscription, Invoice } from "../../lib/database.types";
import { useAppCatalog } from "../../hooks/useAppCatalog";

type DetailTab = "profile" | "subscriptions" | "invoices";

export default function ClientsPage() {
  const { appMap, appList } = useAppCatalog();
  const { success, error: showError } = useToast();
  const { selectedApp } = useAppFilter();
  const [clients, setClients] = useState<Profile[]>([]);
  const [allSubs, setAllSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("profile");
  const [clientSubs, setClientSubs] = useState<Subscription[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "", full_name: "", company_name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });

  const [testAccessClient, setTestAccessClient] = useState<Profile | null>(null);
  const [testAccessForm, setTestAccessForm] = useState({ appId: "", duration: "7" });
  const [grantingAccess, setGrantingAccess] = useState(false);

  const fetchClients = async () => {
    const [profilesRes, subsRes] = await Promise.all([
      supabase.from("profiles").select("*").neq("role", "admin").order("created_at", { ascending: false }),
      supabase.from("subscriptions").select("user_id, app_id, status"),
    ]);
    if (profilesRes.data) setClients(profilesRes.data as Profile[]);
    if (subsRes.data) setAllSubs(subsRes.data as Subscription[]);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  // ─── Filter by app (clients who have a subscription for selected app) ───
  const appClientIds = useMemo(() => {
    if (selectedApp === "all") return null;
    return new Set(allSubs.filter(s => s.app_id === selectedApp).map(s => s.user_id));
  }, [allSubs, selectedApp]);

  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (statusFilter === "active" && !c.is_active) return false;
      if (statusFilter === "suspended" && c.is_active) return false;
      if (appClientIds && !appClientIds.has(c.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.full_name.toLowerCase().includes(q) && !c.email.toLowerCase().includes(q) && !(c.company_name || "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [clients, search, statusFilter, appClientIds]);

  // ─── KPIs ───
  const activeCount = clients.filter(c => c.is_active).length;
  const suspendedCount = clients.filter(c => !c.is_active).length;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = clients.filter(c => new Date(c.created_at) >= monthStart).length;

  // ─── Actions ───
  const toggleActive = async (client: Profile) => {
    await supabase.from("profiles").update({ is_active: !client.is_active, updated_at: new Date().toISOString() }).eq("id", client.id);
    fetchClients();
    success(client.is_active ? "Client suspendu" : "Client réactivé");
  };

  const openClientDetail = async (client: Profile) => {
    setSelectedClient(client);
    setDetailTab("profile");
    const [subsRes, invRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", client.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", client.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setClientSubs(subsRes.data as Subscription[] || []);
    setClientInvoices(invRes.data as Invoice[] || []);
  };

  const handleResetPassword = async (client: Profile) => {
    setConfirmDialog({
      open: true, title: "Réinitialiser le mot de passe ?",
      message: `Un nouveau mot de passe sera envoyé à ${client.email}.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try {
          await apiCall("admin-reset-password", { method: "POST", body: { userId: client.id, email: client.email, fullName: client.full_name } });
          success(`Nouveau mot de passe envoyé à ${client.email}`);
        } catch (err: any) { showError(`Erreur: ${err.message}`); }
      },
    });
  };

  const openCreateForm = () => { setEditClient(null); setFormData({ email: "", password: "", full_name: "", company_name: "", phone: "" }); setShowForm(true); };
  const openEditForm = (client: Profile) => { setEditClient(client); setFormData({ email: client.email, password: "", full_name: client.full_name, company_name: client.company_name || "", phone: client.phone || "" }); setShowForm(true); };

  const handleSaveClient = async () => {
    setSaving(true);
    try {
      if (editClient) {
        await supabase.from("profiles").update({ full_name: formData.full_name, company_name: formData.company_name, phone: formData.phone, updated_at: new Date().toISOString() }).eq("id", editClient.id);
        success("Client modifié");
      } else {
        await apiCall("admin-clients", { method: "POST", body: formData });
        success("Client créé");
      }
      setShowForm(false);
      fetchClients();
    } catch (err: any) { showError(`Erreur: ${err.message}`); }
    setSaving(false);
  };

  const handleDeleteClient = (client: Profile) => {
    setConfirmDialog({
      open: true, title: "Supprimer ce client ?",
      message: `${client.full_name} (${client.email}) sera définitivement supprimé. Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirmDialog(prev => ({ ...prev, open: false }));
        try { await apiCall(`admin-clients?id=${client.id}`, { method: "DELETE" }); success("Client supprimé"); fetchClients(); }
        catch (err: any) { showError(`Erreur: ${err.message}`); }
      },
    });
  };

  const bulkSuspend = async (ids: string[]) => {
    await supabase.from("profiles").update({ is_active: false, updated_at: new Date().toISOString() }).in("id", ids);
    fetchClients();
    success(`${ids.length} client(s) suspendu(s)`);
  };

  const openTestAccess = (client: Profile) => { setTestAccessClient(client); setTestAccessForm({ appId: appList[0]?.id || "", duration: "7" }); };

  const handleGrantTestAccess = async () => {
    if (!testAccessClient || !testAccessForm.appId) return;
    setGrantingAccess(true);
    try {
      const days = parseInt(testAccessForm.duration);
      const trialEnd = new Date(Date.now() + days * 86400000);
      const { error: err } = await supabase.from("subscriptions").insert({
        user_id: testAccessClient.id, app_id: testAccessForm.appId, plan: "test", status: "trial",
        price_at_subscription: 0, trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(), current_period_end: trialEnd.toISOString(),
      });
      if (err) throw err;
      await supabase.from("activity_log").insert({ user_id: testAccessClient.id, action: "test_access_granted", metadata: { app_id: testAccessForm.appId, duration_days: days } });
      setTestAccessClient(null);
      success(`Accès test accordé pour ${days} jours`);
    } catch (err: any) { showError(`Erreur: ${err.message}`); }
    setGrantingAccess(false);
  };

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "full_name", label: "Nom" }, { key: "email", label: "Email" }, { key: "company_name", label: "Entreprise" },
      { key: "phone", label: "Telephone" }, { key: "is_active", label: "Actif", render: (r) => r.is_active ? "Oui" : "Non" },
      { key: "created_at", label: "Inscrit le", render: (r) => new Date(r.created_at).toLocaleDateString("fr-FR") },
    ], "clients");
    success("Export CSV téléchargé");
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const statusFilters: { label: string; value: typeof statusFilter; count: number }[] = [
    { label: "Tous", value: "all", count: clients.length },
    { label: "Actifs", value: "active", count: activeCount },
    { label: "Suspendus", value: "suspended", count: suspendedCount },
  ];

  const DETAIL_TABS: { label: string; value: DetailTab; count?: number }[] = [
    { label: "Profil", value: "profile" },
    { label: "Abonnements", value: "subscriptions", count: clientSubs.length },
    { label: "Factures", value: "invoices", count: clientInvoices.length },
  ];

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="mb-3">
      <label className="block text-admin-text/80 text-[13px] font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  );
  const inputClass = "w-full px-4 py-3 bg-admin-surface-alt border border-admin-surface-alt rounded-lg text-admin-text text-sm outline-none focus:border-admin-accent transition-colors";

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-admin-text text-2xl font-bold mb-1">Utilisateurs</h1>
          <p className="text-admin-muted text-sm">{clients.length} clients — {newThisMonth} nouveaux ce mois</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2.5 border border-admin-surface-alt rounded-lg bg-admin-surface text-admin-text/80 text-[13px] font-medium hover:border-admin-accent/40 transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={openCreateForm} className="bg-admin-accent text-black font-semibold rounded-lg hover:bg-admin-accent-dark transition-colors !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouveau client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                statusFilter === f.value ? "bg-admin-accent text-onyx" : "bg-admin-surface border border-admin-surface-alt text-admin-text/80 hover:border-admin-accent/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, email, entreprise..."
            className="w-full pl-9 pr-4 py-2.5 bg-admin-surface border border-admin-surface-alt rounded-lg text-sm text-admin-text outline-none focus:border-admin-accent transition-colors" />
        </div>
      </div>

      {/* Table */}
      <AdminTable
        keyExtractor={(r: Profile) => r.id}
        loading={loading}
        selectable
        bulkActions={[
          { label: "Suspendre", onClick: bulkSuspend, variant: "danger" },
        ]}
        emptyMessage="Aucun client trouvé"
        onRowClick={openClientDetail}
        columns={[
          { key: "full_name", label: "Client", sortable: true, render: (r: Profile) => (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-admin-accent/10 flex items-center justify-center text-admin-accent text-[11px] font-semibold flex-shrink-0">
                {getInitials(r.full_name || "?")}
              </div>
              <div>
                <div className="font-medium text-admin-text">{r.full_name}</div>
                {r.company_name && <div className="text-admin-muted text-[11px]">{r.company_name}</div>}
              </div>
            </div>
          )},
          { key: "email", label: "Email", sortable: true, render: (r: Profile) => <span className="text-[13px]">{r.email}</span> },
          { key: "is_active", label: "Statut", render: (r: Profile) => (
            <AdminBadge status={r.is_active ? "active" : "suspended"} label={r.is_active ? "Actif" : "Suspendu"} />
          )},
          { key: "created_at", label: "Inscrit le", sortable: true, render: (r: Profile) =>
            <span className="text-[12px] text-admin-muted">{new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}</span>
          },
          { key: "actions", label: "", render: (r: Profile) => (
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <button onClick={() => openEditForm(r)} className="p-1.5 rounded hover:bg-admin-surface-alt text-admin-muted hover:text-admin-accent transition-colors" title="Modifier"><Pencil size={14} /></button>
              <button onClick={() => handleResetPassword(r)} className="p-1.5 rounded hover:bg-blue-50 text-admin-muted hover:text-blue-600 transition-colors" title="Reset mot de passe"><KeyRound size={14} /></button>
              <button onClick={() => openTestAccess(r)} className="p-1.5 rounded hover:bg-emerald-50 text-admin-muted hover:text-emerald-600 transition-colors" title="Accès test"><FlaskConical size={14} /></button>
              <button onClick={() => toggleActive(r)} className={`p-1.5 rounded transition-colors ${r.is_active ? "hover:bg-red-50 text-red-400" : "hover:bg-green-50 text-green-600"}`} title={r.is_active ? "Suspendre" : "Réactiver"}>
                {r.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
              <button onClick={() => handleDeleteClient(r)} className="p-1.5 rounded hover:bg-red-50 text-admin-muted hover:text-red-500 transition-colors" title="Supprimer"><Trash2 size={14} /></button>
            </div>
          )},
        ]}
        data={filtered}
      />

      {/* Client detail modal with tabs */}
      <AdminModal open={!!selectedClient} onClose={() => setSelectedClient(null)} title={selectedClient?.full_name || "Client"} size="xl"
        subtitle={selectedClient?.email}>
        {selectedClient && (
          <div>
            <div className="flex gap-2 mb-6 border-b border-admin-surface-alt">
              {DETAIL_TABS.map(tab => (
                <button key={tab.value} onClick={() => setDetailTab(tab.value)}
                  className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors -mb-px ${
                    detailTab === tab.value ? "border-gold text-admin-accent" : "border-transparent text-admin-muted hover:text-admin-text"
                  }`}>
                  {tab.label} {tab.count !== undefined && <span className="ml-1 text-[11px] opacity-60">{tab.count}</span>}
                </button>
              ))}
            </div>

            {detailTab === "profile" && (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Nom</div>
                  <div className="text-admin-text text-sm">{selectedClient.full_name}</div>
                </div>
                <div>
                  <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Email</div>
                  <div className="text-admin-text text-sm">{selectedClient.email}</div>
                </div>
                <div>
                  <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Entreprise</div>
                  <div className="text-admin-text text-sm">{selectedClient.company_name || "—"}</div>
                </div>
                <div>
                  <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Téléphone</div>
                  <div className="text-admin-text text-sm">{selectedClient.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Statut</div>
                  <AdminBadge status={selectedClient.is_active ? "active" : "suspended"} label={selectedClient.is_active ? "Actif" : "Suspendu"} />
                </div>
                <div>
                  <div className="text-admin-muted text-[11px] font-semibold uppercase tracking-wider mb-1">Inscrit le</div>
                  <div className="text-admin-text text-sm">{new Date(selectedClient.created_at).toLocaleDateString("fr-FR", { dateStyle: "long" })}</div>
                </div>
              </div>
            )}

            {detailTab === "subscriptions" && (
              clientSubs.length === 0 ? <p className="text-admin-muted text-sm py-4">Aucun abonnement</p> : (
                <div className="space-y-2">
                  {clientSubs.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-4 bg-admin-surface-alt rounded-xl">
                      <div>
                        <div className="text-admin-text text-sm font-medium">{appMap[sub.app_id]?.name || sub.app_id}</div>
                        <div className="text-admin-muted text-[11px]">Plan {sub.plan} · Depuis {new Date(sub.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-admin-accent text-sm font-mono font-medium">{Number(sub.price_at_subscription).toLocaleString("fr-FR")} FCFA</span>
                        <AdminBadge status={sub.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {detailTab === "invoices" && (
              clientInvoices.length === 0 ? <p className="text-admin-muted text-sm py-4">Aucune facture</p> : (
                <div className="space-y-2">
                  {clientInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-4 bg-admin-surface-alt rounded-xl">
                      <div>
                        <div className="text-admin-text text-sm font-mono">{inv.invoice_number}</div>
                        <div className="text-admin-muted text-[11px]">{new Date(inv.created_at).toLocaleDateString("fr-FR")}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-admin-accent text-sm font-semibold">{Number(inv.amount).toLocaleString("fr-FR")} {inv.currency || "FCFA"}</span>
                        <AdminBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </AdminModal>

      {/* Create/Edit form */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title={editClient ? "Modifier le client" : "Nouveau client"}
        footer={<button onClick={handleSaveClient} disabled={saving} className={`bg-admin-accent text-black font-semibold rounded-lg hover:bg-admin-accent-dark transition-colors !py-2.5 ${saving ? "opacity-50" : ""}`}>{saving ? "Sauvegarde..." : editClient ? "Modifier" : "Créer"}</button>}>
        <div className="space-y-1">
          <Field label="Nom complet"><input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} className={inputClass} /></Field>
          {!editClient && (
            <>
              <Field label="Email"><input value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className={inputClass} /></Field>
              <Field label="Mot de passe"><input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className={inputClass} /></Field>
            </>
          )}
          <Field label="Entreprise"><input value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} className={inputClass} /></Field>
          <Field label="Téléphone"><input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className={inputClass} /></Field>
        </div>
      </AdminModal>

      {/* Test access modal */}
      <AdminModal open={!!testAccessClient} onClose={() => setTestAccessClient(null)} title="Accorder un accès test"
        footer={<button onClick={handleGrantTestAccess} disabled={grantingAccess || !testAccessForm.appId} className={`bg-admin-accent text-black font-semibold rounded-lg hover:bg-admin-accent-dark transition-colors !py-2.5 flex items-center gap-2 ${grantingAccess || !testAccessForm.appId ? "opacity-50" : ""}`}><FlaskConical size={14} />{grantingAccess ? "En cours..." : "Accorder"}</button>}>
        {testAccessClient && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-emerald-800 text-sm">Accès test pour <strong>{testAccessClient.full_name}</strong></p>
            </div>
            <Field label="Application">
              <select value={testAccessForm.appId} onChange={e => setTestAccessForm(p => ({ ...p, appId: e.target.value }))} className={inputClass}>
                <option value="">-- Choisir --</option>
                {appList.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
              </select>
            </Field>
            <Field label="Durée">
              <select value={testAccessForm.duration} onChange={e => setTestAccessForm(p => ({ ...p, duration: e.target.value }))} className={inputClass}>
                {[3, 7, 14, 30].map(d => <option key={d} value={d}>{d} jours</option>)}
              </select>
            </Field>
          </div>
        )}
      </AdminModal>

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
