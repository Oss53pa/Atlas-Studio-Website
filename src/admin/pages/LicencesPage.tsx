import { useState, useMemo, useEffect } from "react";
import {
  Key, Shield, ShieldOff, ShieldAlert, Clock, Users, Search, Plus,
  Eye, EyeOff, Ban, Copy, Link2, FileText, Activity, ChevronDown,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { apiCall } from "../../lib/api";
import { useToast } from "../contexts/ToastContext";
import { formatSupabaseError } from "../../lib/errorMessages";
import { useLicences } from "../../hooks/useLicences";
import { AdminCard } from "../components/AdminCard";
import { AdminModal } from "../components/AdminModal";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import type {
  Licence, LicenceSeat, LicenceActivation, AdminDelegateLink,
  LicenceAuditEntry, STATUS_LABELS as StatusLabelsType,
} from "../../types/licences";
import { STATUS_LABELS, ROLE_LABELS } from "../../types/licences";

type DetailTab = "summary" | "seats" | "activations" | "admin_link" | "audit";

/* ── Helpers ── */
const maskKey = (k: string) => k.slice(0, 6) + "****" + k.slice(-4);
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const pct = (a: number, b: number) => b === 0 ? 0 : Math.round((a / b) * 100);

export default function LicencesPage() {
  const { licences, loading, kpis, fetchLicences } = useLicences();
  const { success, error: showError } = useToast();

  /* Filters */
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Licence["status"]>("all");

  /* Modals */
  const [selected, setSelected] = useState<Licence | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("summary");
  const [showGenerate, setShowGenerate] = useState(false);
  const [genForm, setGenForm] = useState({ tenant_id: "", product_id: "", plan_id: "" });
  const [genLoading, setGenLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ open: boolean; title: string; message: string; variant: "danger" | "warning"; onConfirm: () => void }>({
    open: false, title: "", message: "", variant: "danger", onConfirm: () => {},
  });
  const [actionLoading, setActionLoading] = useState(false);

  /* Detail sub-data */
  const [seats, setSeats] = useState<LicenceSeat[]>([]);
  const [activations, setActivations] = useState<LicenceActivation[]>([]);
  const [adminLinks, setAdminLinks] = useState<AdminDelegateLink[]>([]);
  const [auditLog, setAuditLog] = useState<LicenceAuditEntry[]>([]);

  /* Fetch detail sub-data on tab change */
  useEffect(() => {
    if (!selected) return;
    const id = selected.id;
    if (detailTab === "seats") {
      supabase.from("licence_seats").select("*").eq("licence_id", id).order("created_at", { ascending: false })
        .then(({ data }) => setSeats((data as LicenceSeat[]) || []));
    } else if (detailTab === "activations") {
      supabase.from("licence_activations").select("*").eq("licence_id", id).order("created_at", { ascending: false })
        .then(({ data }) => setActivations((data as LicenceActivation[]) || []));
    } else if (detailTab === "admin_link") {
      supabase.from("admin_delegate_links").select("*").eq("licence_id", id).order("created_at", { ascending: false })
        .then(({ data }) => setAdminLinks((data as AdminDelegateLink[]) || []));
    } else if (detailTab === "audit") {
      supabase.from("licence_audit_log").select("*").eq("licence_id", id).order("created_at", { ascending: false }).limit(50)
        .then(({ data }) => setAuditLog((data as LicenceAuditEntry[]) || []));
    }
  }, [selected, detailTab]);

  /* Filtered list */
  const filtered = useMemo(() => licences.filter(l => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = l.tenants?.name?.toLowerCase() || "";
      const prod = l.products?.name?.toLowerCase() || "";
      const key = l.activation_key?.toLowerCase() || "";
      if (!name.includes(q) && !prod.includes(q) && !key.includes(q)) return false;
    }
    return true;
  }), [licences, search, statusFilter]);

  /* ── Actions ── */
  const handleSuspend = (l: Licence) => setConfirm({
    open: true, title: "Suspendre la licence", variant: "warning",
    message: `Suspendre la licence de ${l.tenants?.name || l.tenant_id} ? L'accès sera coupé immédiatement.`,
    onConfirm: async () => {
      setActionLoading(true);
      try {
        await apiCall("licence-action", { method: "POST", body: { licence_id: l.id, action: "suspend" } });
        success("Licence suspendue");
        fetchLicences();
      } catch (e: unknown) { showError(formatSupabaseError(e)); }
      setActionLoading(false);
      setConfirm(c => ({ ...c, open: false }));
    },
  });

  const handleRevoke = (l: Licence) => setConfirm({
    open: true, title: "Révoquer la licence", variant: "danger",
    message: `Révoquer définitivement la licence de ${l.tenants?.name || l.tenant_id} ? Cette action est irréversible.`,
    onConfirm: async () => {
      setActionLoading(true);
      try {
        await apiCall("licence-action", { method: "POST", body: { licence_id: l.id, action: "revoke" } });
        success("Licence révoquée");
        fetchLicences();
      } catch (e: unknown) { showError(formatSupabaseError(e)); }
      setActionLoading(false);
      setConfirm(c => ({ ...c, open: false }));
    },
  });

  const handleGenerate = async () => {
    if (!genForm.tenant_id || !genForm.product_id || !genForm.plan_id) { showError("Tous les champs sont requis"); return; }
    setGenLoading(true);
    try {
      await apiCall("licence-generate", { method: "POST", body: genForm });
      success("Licence générée avec succès");
      setShowGenerate(false);
      setGenForm({ tenant_id: "", product_id: "", plan_id: "" });
      fetchLicences();
    } catch (e: unknown) { showError(formatSupabaseError(e)); }
    setGenLoading(false);
  };

  const openDetail = (l: Licence) => { setSelected(l); setDetailTab("summary"); };
  const copyKey = (key: string) => { navigator.clipboard.writeText(key); success("Clé copiée"); };

  /* Status badge */
  const Badge = ({ status }: { status: string }) => {
    const s = STATUS_LABELS[status] || { label: status, color: "#888" };
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.color + "22", color: s.color }}>{s.label}</span>;
  };

  /* Seats bar */
  const SeatsBar = ({ used, max }: { used: number; max: number }) => (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#2A2A3A" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct(used, max)}%`, background: pct(used, max) > 90 ? "#EF4444" : "#EF9F27" }} />
      </div>
      <span className="text-xs text-[#888] whitespace-nowrap">{used}/{max}</span>
    </div>
  );

  /* ── Tab content renderers ── */
  const renderSummary = (l: Licence) => (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {[
        ["Client", l.tenants?.name || l.tenant_id],
        ["Email", l.tenants?.email || "—"],
        ["Produit", l.products?.name || l.product_id],
        ["Plan", l.plans?.name || l.plan_id],
        ["Statut", null],
        ["Sièges", `${l.used_seats} / ${l.max_seats}`],
        ["Date d'activation", fmtDate(l.activated_at)],
        ["Date d'expiration", fmtDate(l.expires_at)],
        ["Date de création", fmtDate(l.created_at)],
        ["Validité hors-ligne (jours)", String(l.offline_valid_days)],
      ].map(([label, val], i) => (
        <div key={i}>
          <div className="text-[#888] text-xs mb-1">{label}</div>
          {label === "Statut" ? <Badge status={l.status} /> : <div className="text-[#F5F5F5]">{val}</div>}
        </div>
      ))}
      <div className="col-span-2">
        <div className="text-[#888] text-xs mb-1">Clé d'activation</div>
        <div className="flex items-center gap-2">
          <code className="font-mono text-[#EF9F27] text-sm bg-[#2A2A3A] px-2 py-1 rounded">{l.activation_key}</code>
          <button onClick={() => copyKey(l.activation_key)} className="p-1 rounded hover:bg-[#2A2A3A]"><Copy size={14} className="text-[#888]" /></button>
        </div>
      </div>
    </div>
  );

  const renderSeats = () => (
    <div className="space-y-2">
      {seats.length === 0 ? <p className="text-[#888] text-sm">Aucun siège attribué.</p> : (
        <table className="w-full text-sm"><thead><tr className="text-left text-[#888] text-xs border-b border-[#2A2A3A]">
          <th className="pb-2">Email</th><th className="pb-2">Nom</th><th className="pb-2">Rôle</th><th className="pb-2">Statut</th><th className="pb-2">Dernier login</th>
        </tr></thead><tbody>
          {seats.map(s => (
            <tr key={s.id} className="border-b border-[#2A2A3A]/50 hover:bg-[#2A2A3A]/30">
              <td className="py-2 text-[#F5F5F5]">{s.email}</td>
              <td className="py-2 text-[#F5F5F5]">{s.full_name || "—"}</td>
              <td className="py-2"><span className="text-xs px-1.5 py-0.5 rounded bg-[#2A2A3A] text-[#EF9F27]">{ROLE_LABELS[s.role] || s.role}</span></td>
              <td className="py-2"><Badge status={s.status} /></td>
              <td className="py-2 text-[#888]">{fmtDate(s.last_login)}</td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  );

  const renderActivations = () => (
    <div className="space-y-2">
      {activations.length === 0 ? <p className="text-[#888] text-sm">Aucune tentative d'activation.</p> : (
        <table className="w-full text-sm"><thead><tr className="text-left text-[#888] text-xs border-b border-[#2A2A3A]">
          <th className="pb-2">Date</th><th className="pb-2">IP</th><th className="pb-2">Succès</th><th className="pb-2">Raison</th>
        </tr></thead><tbody>
          {activations.map(a => (
            <tr key={a.id} className="border-b border-[#2A2A3A]/50">
              <td className="py-2 text-[#F5F5F5]">{fmtDate(a.created_at)}</td>
              <td className="py-2 font-mono text-xs text-[#888]">{a.ip_address || "—"}</td>
              <td className="py-2">{a.success ? <span className="text-green-400 text-xs">Oui</span> : <span className="text-red-400 text-xs">Non</span>}</td>
              <td className="py-2 text-[#888] text-xs">{a.failure_reason || "—"}</td>
            </tr>
          ))}
        </tbody></table>
      )}
    </div>
  );

  const renderAdminLinks = () => (
    <div className="space-y-2">
      {adminLinks.length === 0 ? <p className="text-[#888] text-sm">Aucun lien admin délégué.</p> : adminLinks.map(link => (
        <div key={link.id} className="p-3 rounded-lg border border-[#2A2A3A] bg-[#2A2A3A]/30 space-y-2">
          <div className="flex items-center justify-between">
            <Badge status={link.status} />
            <span className="text-xs text-[#888]">Expire : {fmtDate(link.expires_at)}</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="font-mono text-xs text-[#EF9F27] bg-[#1E1E2E] px-2 py-1 rounded flex-1 truncate">{link.token}</code>
            <button onClick={() => { navigator.clipboard.writeText(link.token); success("Token copié"); }} className="p-1 rounded hover:bg-[#2A2A3A]"><Copy size={14} className="text-[#888]" /></button>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {link.can_invite_users && <span className="px-1.5 py-0.5 rounded bg-[#2A2A3A] text-[#F5F5F5]">Inviter</span>}
            {link.can_manage_roles && <span className="px-1.5 py-0.5 rounded bg-[#2A2A3A] text-[#F5F5F5]">Rôles</span>}
            {link.can_view_billing && <span className="px-1.5 py-0.5 rounded bg-[#2A2A3A] text-[#F5F5F5]">Facturation</span>}
            {link.can_revoke_users && <span className="px-1.5 py-0.5 rounded bg-[#2A2A3A] text-[#F5F5F5]">Révoquer</span>}
          </div>
        </div>
      ))}
    </div>
  );

  const renderAudit = () => (
    <div className="space-y-1 max-h-[360px] overflow-y-auto">
      {auditLog.length === 0 ? <p className="text-[#888] text-sm">Aucune entrée.</p> : auditLog.map(e => (
        <div key={e.id} className="flex items-start gap-3 py-2 border-b border-[#2A2A3A]/50 text-sm">
          <Activity size={14} className="text-[#EF9F27] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[#F5F5F5]">{e.action}</span>
            <span className="text-[#888] text-xs ml-2">{e.actor_type}</span>
            {e.ip_address && <span className="text-[#888] text-xs ml-2 font-mono">{e.ip_address}</span>}
          </div>
          <span className="text-[#888] text-xs whitespace-nowrap">{fmtDate(e.created_at)}</span>
        </div>
      ))}
    </div>
  );

  const TABS: { key: DetailTab; label: string; icon: typeof Key }[] = [
    { key: "summary", label: "Résumé", icon: FileText },
    { key: "seats", label: "Sièges", icon: Users },
    { key: "activations", label: "Activations", icon: Key },
    { key: "admin_link", label: "Lien admin", icon: Link2 },
    { key: "audit", label: "Audit", icon: Activity },
  ];

  /* Input helper */
  const Input = ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) => (
    <div>
      <label className="block text-xs text-[#888] mb-1">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg bg-[#2A2A3A] border border-[#2A2A3A] text-[#F5F5F5] text-sm focus:border-[#EF9F27] focus:outline-none" />
    </div>
  );

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F5F5F5]">Licences</h1>
          <p className="text-sm text-[#888]">Gestion des licences, sièges et activations</p>
        </div>
        <button onClick={() => setShowGenerate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-[#0A0A0A] transition-colors"
          style={{ background: "#EF9F27" }}>
          <Plus size={16} /> Générer manuellement
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AdminCard label="Total" value={kpis.total_licences} icon={Key} loading={loading} />
        <AdminCard label="Actives" value={kpis.active_licences} icon={Shield} loading={loading} />
        <AdminCard label="En attente" value={kpis.pending_activation} icon={Clock} loading={loading} />
        <AdminCard label="Expirent bientôt" value={kpis.expiring_soon} icon={ShieldAlert} loading={loading} />
        <AdminCard label="Sièges" value={`${kpis.total_seats_used} / ${kpis.total_seats_max}`} sub={`${pct(kpis.total_seats_used, kpis.total_seats_max)}% utilisés`} icon={Users} loading={loading} />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par clé, client, produit..."
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-[#1E1E2E] border border-[#2A2A3A] text-[#F5F5F5] text-sm placeholder-[#888] focus:border-[#EF9F27] focus:outline-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-[#1E1E2E] border border-[#2A2A3A] text-[#F5F5F5] text-sm focus:border-[#EF9F27] focus:outline-none cursor-pointer">
            <option value="all">Tous les statuts</option>
            <option value="active">Active</option>
            <option value="pending">En attente</option>
            <option value="suspended">Suspendue</option>
            <option value="revoked">Révoquée</option>
            <option value="expired">Expirée</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888] pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#2A2A3A] overflow-hidden" style={{ background: "#1E1E2E" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[#888] border-b border-[#2A2A3A]">
                <th className="px-4 py-3">Clé</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Produit / Plan</th>
                <th className="px-4 py-3">Sièges</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Activation</th>
                <th className="px-4 py-3">Expiration</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#2A2A3A]/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 w-20 bg-[#2A2A3A] rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[#888]">Aucune licence trouvée.</td></tr>
              ) : filtered.map(l => (
                <tr key={l.id} className="border-b border-[#2A2A3A]/50 hover:bg-[#2A2A3A]/20 transition-colors">
                  <td className="px-4 py-3">
                    <code className="font-mono text-xs text-[#EF9F27]">{maskKey(l.activation_key)}</code>
                  </td>
                  <td className="px-4 py-3 text-[#F5F5F5]">{l.tenants?.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-[#F5F5F5]">{l.products?.name || "—"}</span>
                    {l.plans?.name && <span className="text-[#888] text-xs ml-1.5">/ {l.plans.name}</span>}
                  </td>
                  <td className="px-4 py-3"><SeatsBar used={l.used_seats} max={l.max_seats} /></td>
                  <td className="px-4 py-3"><Badge status={l.status} /></td>
                  <td className="px-4 py-3 text-[#888] text-xs">{fmtDate(l.activated_at)}</td>
                  <td className="px-4 py-3 text-[#888] text-xs">{fmtDate(l.expires_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(l)} title="Détails" className="p-1.5 rounded-lg hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors"><Eye size={15} /></button>
                      {l.status === "active" && (
                        <button onClick={() => handleSuspend(l)} title="Suspendre" className="p-1.5 rounded-lg hover:bg-orange-500/10 text-[#888] hover:text-orange-400 transition-colors"><ShieldOff size={15} /></button>
                      )}
                      {(l.status === "active" || l.status === "suspended") && (
                        <button onClick={() => handleRevoke(l)} title="Révoquer" className="p-1.5 rounded-lg hover:bg-red-500/10 text-[#888] hover:text-red-400 transition-colors"><Ban size={15} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-4 py-2 border-t border-[#2A2A3A] text-xs text-[#888]">{filtered.length} licence{filtered.length > 1 ? "s" : ""}</div>}
      </div>

      {/* ── Detail Modal ── */}
      <AdminModal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Licence \— ${selected.tenants?.name || ""}` : ""} size="lg">
        {selected && (
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-1 border-b border-[#2A2A3A] pb-px overflow-x-auto">
              {TABS.map(t => (
                <button key={t.key} onClick={() => setDetailTab(t.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-lg transition-colors whitespace-nowrap ${detailTab === t.key ? "text-[#EF9F27] border-b-2 border-[#EF9F27] -mb-px" : "text-[#888] hover:text-[#F5F5F5]"}`}>
                  <t.icon size={14} />{t.label}
                </button>
              ))}
            </div>
            {/* Tab content */}
            <div className="min-h-[200px]">
              {detailTab === "summary" && renderSummary(selected)}
              {detailTab === "seats" && renderSeats()}
              {detailTab === "activations" && renderActivations()}
              {detailTab === "admin_link" && renderAdminLinks()}
              {detailTab === "audit" && renderAudit()}
            </div>
          </div>
        )}
      </AdminModal>

      {/* ── Generate Modal ── */}
      <AdminModal open={showGenerate} onClose={() => setShowGenerate(false)} title="Générer une licence"
        footer={
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowGenerate(false)} className="px-4 py-2 rounded-lg text-sm text-[#888] hover:text-[#F5F5F5] border border-[#2A2A3A] hover:bg-[#2A2A3A] transition-colors">Annuler</button>
            <button onClick={handleGenerate} disabled={genLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#0A0A0A] disabled:opacity-50 transition-colors" style={{ background: "#EF9F27" }}>
              {genLoading ? "Génération..." : "Générer"}
            </button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Client (Tenant ID)" value={genForm.tenant_id} onChange={v => setGenForm(f => ({ ...f, tenant_id: v }))} placeholder="UUID du client" />
          <Input label="Produit (Product ID)" value={genForm.product_id} onChange={v => setGenForm(f => ({ ...f, product_id: v }))} placeholder="UUID du produit" />
          <Input label="Plan (Plan ID)" value={genForm.plan_id} onChange={v => setGenForm(f => ({ ...f, plan_id: v }))} placeholder="UUID du plan" />
        </div>
      </AdminModal>

      {/* ── Confirm Dialog ── */}
      <AdminConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        variant={confirm.variant}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm(c => ({ ...c, open: false }))}
        loading={actionLoading}
      />
    </div>
  );
}
