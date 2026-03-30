import { useState, useEffect } from "react";
import { Search, Loader2, Check, UserX, UserCheck, Plus, Pencil, Trash2, Download, KeyRound, FileText, FlaskConical } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { apiCall } from "../../lib/api";
import { exportToCSV } from "../../lib/csvExport";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import type { Profile, Subscription, Invoice } from "../../lib/database.types";
import { useAppCatalog } from "../../hooks/useAppCatalog";

export default function ClientsPage() {
  const { appMap, appList } = useAppCatalog();
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientSubs, setClientSubs] = useState<Subscription[]>([]);
  const [clientInvoices, setClientInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({ email: "", password: "", full_name: "", company_name: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // ── Test access state ──
  const [testAccessClient, setTestAccessClient] = useState<Profile | null>(null);
  const [testAccessForm, setTestAccessForm] = useState({ appId: "", duration: "7" });
  const [grantingAccess, setGrantingAccess] = useState(false);

  const fetchClients = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("created_at", { ascending: false });
    if (data) setClients(data as Profile[]);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const filtered = search
    ? clients.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  const toggleActive = async (client: Profile) => {
    await supabase
      .from("profiles")
      .update({ is_active: !client.is_active, updated_at: new Date().toISOString() })
      .eq("id", client.id);
    fetchClients();
    showToast(client.is_active ? "Client suspendu" : "Client réactivé");
  };

  const openClientDetail = async (client: Profile) => {
    setSelectedClient(client);
    const [subsRes, invRes] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", client.id).order("created_at", { ascending: false }),
      supabase.from("invoices").select("*").eq("user_id", client.id).order("created_at", { ascending: false }).limit(10),
    ]);
    setClientSubs(subsRes.data as Subscription[] || []);
    setClientInvoices(invRes.data as Invoice[] || []);
  };

  const handleResetPassword = async (client: Profile) => {
    if (!confirm(`Reinitialiser le mot de passe de ${client.full_name} ? Un nouveau mot de passe sera envoye par email.`)) return;
    try {
      await apiCall("admin-reset-password", {
        method: "POST",
        body: { userId: client.id, email: client.email, fullName: client.full_name },
      });
      showToast(`Nouveau mot de passe envoye a ${client.email}`);
    } catch (err: any) {
      showToast(`Erreur: ${err.message}`);
    }
  };

  const openCreateForm = () => {
    setEditClient(null);
    setFormData({ email: "", password: "", full_name: "", company_name: "", phone: "" });
    setShowForm(true);
  };

  const openEditForm = (client: Profile) => {
    setEditClient(client);
    setFormData({ email: client.email, password: "", full_name: client.full_name, company_name: client.company_name || "", phone: client.phone || "" });
    setShowForm(true);
  };

  const handleSaveClient = async () => {
    setSaving(true);
    try {
      if (editClient) {
        // Update via Supabase directly
        await supabase.from("profiles").update({
          full_name: formData.full_name,
          company_name: formData.company_name,
          phone: formData.phone,
          updated_at: new Date().toISOString(),
        }).eq("id", editClient.id);
        showToast("Client modifié");
      } else {
        // Create via backend (needs service role)
        await apiCall("admin-clients", {
          method: "POST",
          body: formData,
        });
        showToast("Client créé");
      }
      setShowForm(false);
      fetchClients();
    } catch (err: any) {
      showToast(`Erreur: ${err.message}`);
    }
    setSaving(false);
  };

  const handleDeleteClient = async (client: Profile) => {
    if (!confirm(`Supprimer le client ${client.full_name} ? Cette action est irréversible.`)) return;
    try {
      await apiCall(`admin-clients?id=${client.id}`, { method: "DELETE" });
      showToast("Client supprimé");
      fetchClients();
    } catch (err: any) {
      showToast(`Erreur: ${err.message}`);
    }
  };

  const openTestAccess = (client: Profile) => {
    setTestAccessClient(client);
    setTestAccessForm({ appId: appList[0]?.id || "", duration: "7" });
  };

  const handleGrantTestAccess = async () => {
    if (!testAccessClient || !testAccessForm.appId) return;
    setGrantingAccess(true);
    try {
      const days = parseInt(testAccessForm.duration);
      const trialEnd = new Date(Date.now() + days * 86400000);

      // Create trial subscription
      const { error } = await supabase.from("subscriptions").insert({
        user_id: testAccessClient.id,
        app_id: testAccessForm.appId,
        plan: "test",
        status: "trial",
        price_at_subscription: 0,
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
      });

      if (error) throw error;

      // Log activity
      await supabase.from("activity_log").insert({
        user_id: testAccessClient.id,
        action: "test_access_granted",
        metadata: { app_id: testAccessForm.appId, duration_days: days, expires_at: trialEnd.toISOString() },
      });

      setTestAccessClient(null);
      showToast(`Accès test accordé à ${testAccessClient.full_name} pour ${days} jours`);
    } catch (err: any) {
      showToast(`Erreur: ${err.message}`);
    }
    setGrantingAccess(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
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
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Clients</h1>
          <p className="text-neutral-muted text-sm">{clients.length} clients</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => exportToCSV(clients, [
            { key: "full_name", label: "Nom" },
            { key: "email", label: "Email" },
            { key: "company_name", label: "Entreprise" },
            { key: "phone", label: "Telephone" },
            { key: "is_active", label: "Actif", render: (r) => r.is_active ? "Oui" : "Non" },
            { key: "created_at", label: "Inscrit le", render: (r) => new Date(r.created_at).toLocaleDateString("fr-FR") },
          ], "clients")} className="flex items-center gap-2 px-4 py-2.5 border border-warm-border rounded-lg bg-white text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors">
            <Download size={14} /> CSV
          </button>
          <button onClick={openCreateForm} className="btn-gold !py-2.5 !text-[13px] flex items-center gap-2">
            <Plus size={14} /> Nouveau client
          </button>
        </div>
      </div>

      {toast && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-gold/10 border border-gold/20 text-gold text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {toast}
        </div>
      )}

      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-placeholder" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, email ou entreprise..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
        />
      </div>

      <AdminTable
        keyExtractor={(r: Profile) => r.id}
        columns={[
          { key: "full_name", label: "Nom", sortable: true, render: (r: Profile) => (
            <div>
              <span className="font-medium text-neutral-text">{r.full_name}</span>
              {r.company_name && <div className="text-neutral-muted text-[11px]">{r.company_name}</div>}
            </div>
          )},
          { key: "email", label: "Email", sortable: true },
          { key: "is_active", label: "Statut", render: (r: Profile) => (
            <AdminBadge status={r.is_active ? "active" : "suspended"} label={r.is_active ? "Actif" : "Suspendu"} />
          )},
          { key: "created_at", label: "Inscrit le", sortable: true, render: (r: Profile) => new Date(r.created_at).toLocaleDateString("fr-FR") },
          { key: "actions", label: "Actions", render: (r: Profile) => (
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); openEditForm(r); }} className="p-1.5 rounded hover:bg-warm-bg text-neutral-muted hover:text-gold transition-colors" title="Modifier">
                <Pencil size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleResetPassword(r); }} className="p-1.5 rounded hover:bg-blue-50 text-neutral-muted hover:text-blue-600 transition-colors" title="Reset mot de passe">
                <KeyRound size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); openTestAccess(r); }} className="p-1.5 rounded hover:bg-emerald-50 text-neutral-muted hover:text-emerald-600 transition-colors" title="Accorder accès test">
                <FlaskConical size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleActive(r); }} className={`p-1.5 rounded transition-colors ${r.is_active ? "hover:bg-red-50 text-red-400" : "hover:bg-green-50 text-green-600"}`} title={r.is_active ? "Suspendre" : "Réactiver"}>
                {r.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteClient(r); }} className="p-1.5 rounded hover:bg-red-50 text-neutral-muted hover:text-red-500 transition-colors" title="Supprimer">
                <Trash2 size={14} />
              </button>
            </div>
          )},
        ]}
        data={filtered}
        onRowClick={openClientDetail}
      />

      {/* Client detail modal */}
      <AdminModal open={!!selectedClient} onClose={() => setSelectedClient(null)} title={selectedClient?.full_name || "Client"}>
        {selectedClient && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-neutral-muted text-[11px] font-bold uppercase tracking-wider mb-1">Email</div>
                <div className="text-neutral-text text-sm">{selectedClient.email}</div>
              </div>
              <div>
                <div className="text-neutral-muted text-[11px] font-bold uppercase tracking-wider mb-1">Entreprise</div>
                <div className="text-neutral-text text-sm">{selectedClient.company_name || "—"}</div>
              </div>
              <div>
                <div className="text-neutral-muted text-[11px] font-bold uppercase tracking-wider mb-1">Téléphone</div>
                <div className="text-neutral-text text-sm">{selectedClient.phone || "—"}</div>
              </div>
              <div>
                <div className="text-neutral-muted text-[11px] font-bold uppercase tracking-wider mb-1">Inscrit le</div>
                <div className="text-neutral-text text-sm">{new Date(selectedClient.created_at).toLocaleDateString("fr-FR")}</div>
              </div>
            </div>
            <div className="border-t border-warm-border pt-4">
              <h3 className="text-neutral-text text-sm font-bold mb-3">Abonnements ({clientSubs.length})</h3>
              {clientSubs.length === 0 ? (
                <p className="text-neutral-muted text-sm">Aucun abonnement</p>
              ) : (
                <div className="space-y-2">
                  {clientSubs.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between p-3 bg-warm-bg rounded-lg">
                      <div>
                        <span className="text-neutral-text text-sm font-medium">{appMap[sub.app_id]?.name || sub.app_id}</span>
                        <span className="text-neutral-muted text-[11px] ml-2">Plan {sub.plan}</span>
                      </div>
                      <AdminBadge status={sub.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-warm-border pt-4">
              <h3 className="text-neutral-text text-sm font-bold mb-3 flex items-center gap-2">
                <FileText size={14} /> Factures ({clientInvoices.length})
              </h3>
              {clientInvoices.length === 0 ? (
                <p className="text-neutral-muted text-sm">Aucune facture</p>
              ) : (
                <div className="space-y-2">
                  {clientInvoices.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-warm-bg rounded-lg">
                      <div>
                        <span className="text-neutral-text text-sm font-mono">{inv.invoice_number}</span>
                        <span className="text-neutral-muted text-[11px] ml-2">{new Date(inv.created_at).toLocaleDateString("fr-FR")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gold text-sm font-semibold">{Number(inv.amount).toLocaleString("fr-FR")} {inv.currency || "FCFA"}</span>
                        <AdminBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminModal>

      {/* Create/Edit form modal */}
      <AdminModal open={showForm} onClose={() => setShowForm(false)} title={editClient ? "Modifier le client" : "Nouveau client"}>
        <div className="space-y-3">
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Nom complet</label>
            <input value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
          </div>
          {!editClient && (
            <>
              <div>
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Email</label>
                <input value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Mot de passe</label>
                <input type="password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
              </div>
            </>
          )}
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Entreprise</label>
            <input value={formData.company_name} onChange={e => setFormData(p => ({ ...p, company_name: e.target.value }))} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
          </div>
          <div>
            <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Téléphone</label>
            <input value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors" />
          </div>
          <button onClick={handleSaveClient} disabled={saving} className={`btn-gold w-full mt-4 ${saving ? "opacity-50" : ""}`}>
            {saving ? "Sauvegarde..." : editClient ? "Modifier" : "Créer le client"}
          </button>
        </div>
      </AdminModal>

      {/* Grant test access modal */}
      <AdminModal open={!!testAccessClient} onClose={() => setTestAccessClient(null)} title="Accorder un accès test">
        {testAccessClient && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <p className="text-emerald-800 text-sm">
                Accorder un accès test temporaire à <strong>{testAccessClient.full_name}</strong>
                {testAccessClient.company_name && <> ({testAccessClient.company_name})</>}
              </p>
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Application</label>
              <select
                value={testAccessForm.appId}
                onChange={e => setTestAccessForm(p => ({ ...p, appId: e.target.value }))}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
              >
                <option value="">-- Choisir une application --</option>
                {appList.map(app => (
                  <option key={app.id} value={app.id}>{app.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-body text-[13px] font-semibold mb-1.5">Durée de l'accès</label>
              <select
                value={testAccessForm.duration}
                onChange={e => setTestAccessForm(p => ({ ...p, duration: e.target.value }))}
                className="w-full px-4 py-3 bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors"
              >
                <option value="3">3 jours</option>
                <option value="7">7 jours</option>
                <option value="14">14 jours</option>
                <option value="30">30 jours</option>
              </select>
            </div>

            <div className="p-3 bg-warm-bg rounded-lg text-[13px] text-neutral-muted">
              <p className="mb-1">Expire le : <strong className="text-neutral-text">
                {new Date(Date.now() + parseInt(testAccessForm.duration) * 86400000).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </strong></p>
              <p className="mb-0">Plan : <strong className="text-neutral-text">test</strong> (gratuit)</p>
            </div>

            <button
              onClick={handleGrantTestAccess}
              disabled={grantingAccess || !testAccessForm.appId}
              className={`btn-gold w-full flex items-center justify-center gap-2 ${grantingAccess || !testAccessForm.appId ? "opacity-50" : ""}`}
            >
              <FlaskConical size={14} />
              {grantingAccess ? "Attribution en cours..." : "Accorder l'accès test"}
            </button>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
