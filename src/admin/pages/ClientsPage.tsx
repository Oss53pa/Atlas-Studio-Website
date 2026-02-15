import { useState, useEffect } from "react";
import { Search, Loader2, Check, UserX, UserCheck } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminModal } from "../components/AdminModal";
import type { Profile, Subscription } from "../../lib/database.types";
import { APP_INFO } from "../../config/apps";

export default function ClientsPage() {
  const [clients, setClients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Profile | null>(null);
  const [clientSubs, setClientSubs] = useState<Subscription[]>([]);

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
    setToast(client.is_active ? "Client suspendu" : "Client réactivé");
    setTimeout(() => setToast(null), 3000);
  };

  const openClientDetail = async (client: Profile) => {
    setSelectedClient(client);
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", client.id)
      .order("created_at", { ascending: false });
    setClientSubs(data as Subscription[] || []);
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
            <button
              onClick={(e) => { e.stopPropagation(); toggleActive(r); }}
              className={`p-1.5 rounded transition-colors ${r.is_active ? "hover:bg-red-50 text-red-400" : "hover:bg-green-50 text-green-600"}`}
              title={r.is_active ? "Suspendre" : "Réactiver"}
            >
              {r.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
            </button>
          )},
        ]}
        data={filtered}
        onRowClick={openClientDetail}
      />

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
                        <span className="text-neutral-text text-sm font-medium">{APP_INFO[sub.app_id]?.name || sub.app_id}</span>
                        <span className="text-neutral-muted text-[11px] ml-2">Plan {sub.plan}</span>
                      </div>
                      <AdminBadge status={sub.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
