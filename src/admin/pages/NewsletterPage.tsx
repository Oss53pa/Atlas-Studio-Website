import { useState, useEffect, useRef, useMemo } from "react";
import { Download, Search, Users, UserCheck, UserPlus, UserX, Upload, Trash2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminCard } from "../components/AdminCard";
import { AdminConfirmDialog } from "../components/AdminConfirmDialog";
import { useToast } from "../contexts/ToastContext";
import { exportToCSV } from "../../lib/csvExport";
import type { NewsletterSubscriber } from "../../lib/database.types";

export default function NewsletterPage() {
  const { success, error: showError } = useToast();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: "", message: "", onConfirm: () => {} });
  const importRef = useRef<HTMLInputElement>(null);

  const fetchSubscribers = async () => {
    const { data } = await supabase.from("newsletter_subscribers").select("*").order("subscribed_at", { ascending: false });
    setSubscribers(data as NewsletterSubscriber[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  // ─── KPIs ───
  const totalCount = subscribers.length;
  const activeCount = subscribers.filter(s => s.is_active).length;
  const inactiveCount = totalCount - activeCount;
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const newThisMonth = subscribers.filter(s => new Date(s.subscribed_at) >= monthStart).length;

  // ─── Growth chart data (last 12 months) ───
  const chartData = useMemo(() => {
    const months: { label: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const cutoff = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      const count = subscribers.filter(s => s.is_active && new Date(s.subscribed_at) <= cutoff).length;
      months.push({ label, count });
    }
    return months;
  }, [subscribers]);

  // ─── Filtered data ───
  const filtered = useMemo(() => {
    return subscribers.filter(s => {
      if (statusFilter === "active" && !s.is_active) return false;
      if (statusFilter === "inactive" && s.is_active) return false;
      if (search && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [subscribers, search, statusFilter]);

  // ─── Actions ───
  const toggleActive = async (sub: NewsletterSubscriber) => {
    await supabase.from("newsletter_subscribers").update({ is_active: !sub.is_active }).eq("id", sub.id);
    fetchSubscribers();
    success(sub.is_active ? "Abonné désactivé" : "Abonné réactivé");
  };

  const deleteSub = (sub: NewsletterSubscriber) => {
    setConfirmDialog({
      open: true, title: "Supprimer cet abonné ?",
      message: `L'abonné ${sub.email} sera définitivement supprimé.`,
      onConfirm: async () => {
        await supabase.from("newsletter_subscribers").delete().eq("id", sub.id);
        fetchSubscribers();
        success("Abonné supprimé");
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  const bulkDeactivate = async (ids: string[]) => {
    await supabase.from("newsletter_subscribers").update({ is_active: false }).in("id", ids);
    fetchSubscribers();
    success(`${ids.length} abonné(s) désactivé(s)`);
  };

  const bulkDelete = (ids: string[]) => {
    setConfirmDialog({
      open: true, title: `Supprimer ${ids.length} abonné(s) ?`,
      message: "Cette action est irréversible.",
      onConfirm: async () => {
        await supabase.from("newsletter_subscribers").delete().in("id", ids);
        fetchSubscribers();
        success(`${ids.length} abonné(s) supprimé(s)`);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      },
    });
  };

  // ─── Import CSV ───
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = text.split(/[\n,;]+/).map(s => s.trim().toLowerCase()).filter(s => emailRegex.test(s));
    const unique = [...new Set(emails)];
    const existing = new Set(subscribers.map(s => s.email.toLowerCase()));
    const newEmails = unique.filter(e => !existing.has(e));

    if (newEmails.length === 0) {
      showError("Aucun nouvel email trouvé dans le fichier");
      return;
    }

    const { error: err } = await supabase.from("newsletter_subscribers").insert(newEmails.map(email => ({ email })));
    if (err) { showError(`Erreur: ${err.message}`); return; }
    fetchSubscribers();
    success(`${newEmails.length} abonné(s) importé(s)`);
    if (importRef.current) importRef.current.value = "";
  };

  // ─── Export CSV ───
  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "email", label: "Email" },
      { key: "subscribed_at", label: "Date d'inscription", render: (r: any) => new Date(r.subscribed_at).toLocaleDateString("fr-FR") },
      { key: "is_active", label: "Actif", render: (r: any) => r.is_active ? "Oui" : "Non" },
    ], "newsletter-abonnes");
    success("Export CSV téléchargé");
  };

  const statusFilters: { label: string; value: typeof statusFilter; count: number }[] = [
    { label: "Tous", value: "all", count: totalCount },
    { label: "Actifs", value: "active", count: activeCount },
    { label: "Inactifs", value: "inactive", count: inactiveCount },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
        <div>
          <h1 className="text-neutral-text text-2xl font-bold mb-1">Newsletter</h1>
          <p className="text-neutral-muted text-sm">Gestion des abonnés à la newsletter</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={importRef} type="file" accept=".csv,.txt" onChange={handleImport} className="hidden" />
          <button onClick={() => importRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 border border-warm-border rounded-lg bg-white text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors">
            <Upload size={14} /> Importer CSV
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 border border-warm-border rounded-lg bg-white text-neutral-body text-[13px] font-medium hover:border-gold/40 transition-colors">
            <Download size={14} /> Exporter CSV
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <AdminCard label="Total abonnés" value={totalCount} icon={Users} loading={loading} />
        <AdminCard label="Actifs" value={activeCount} icon={UserCheck} loading={loading} />
        <AdminCard label="Nouveaux ce mois" value={newThisMonth} icon={UserPlus} loading={loading} />
        <AdminCard label="Désabonnés" value={inactiveCount} icon={UserX} loading={loading} />
      </div>

      {/* Growth chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-warm-border rounded-xl p-6 mb-6">
          <h2 className="text-neutral-text text-sm font-semibold mb-4">Croissance des abonnés (12 mois)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C8A960" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C8A960" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#a3a3a3" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip contentStyle={{ fontSize: 13, borderRadius: 8, border: "1px solid #e5e5e5" }} />
              <Area type="monotone" dataKey="count" name="Abonnés" stroke="#C8A960" fill="url(#goldGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex gap-2">
          {statusFilters.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                statusFilter === f.value ? "bg-gold text-onyx" : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
              }`}>
              {f.label} <span className="ml-1 opacity-60">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par email..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-warm-border rounded-lg text-sm text-neutral-text outline-none focus:border-gold transition-colors" />
        </div>
      </div>

      {/* Table */}
      <AdminTable
        keyExtractor={(r: NewsletterSubscriber) => r.id}
        loading={loading}
        selectable
        bulkActions={[
          { label: "Désactiver", onClick: bulkDeactivate },
          { label: "Supprimer", onClick: bulkDelete, variant: "danger" },
        ]}
        emptyMessage="Aucun abonné trouvé"
        columns={[
          { key: "email", label: "Email", sortable: true },
          { key: "subscribed_at", label: "Inscrit le", sortable: true, render: (r: NewsletterSubscriber) => new Date(r.subscribed_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) },
          { key: "is_active", label: "Statut", render: (r: NewsletterSubscriber) => (
            <button onClick={(e) => { e.stopPropagation(); toggleActive(r); }}>
              <AdminBadge status={r.is_active ? "active" : "suspended"} label={r.is_active ? "Actif" : "Inactif"} />
            </button>
          )},
          { key: "actions", label: "", render: (r: NewsletterSubscriber) => (
            <button onClick={(e) => { e.stopPropagation(); deleteSub(r); }} className="text-neutral-300 hover:text-red-400 transition-colors p-1">
              <Trash2 size={14} />
            </button>
          )},
        ]}
        data={filtered}
      />

      <AdminConfirmDialog {...confirmDialog} onCancel={() => setConfirmDialog(prev => ({ ...prev, open: false }))} />
    </div>
  );
}
