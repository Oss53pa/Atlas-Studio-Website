import { useState, useEffect, useMemo } from "react";
import { CreditCard, DollarSign, AlertTriangle, CheckCircle2, XCircle, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminCard } from "../components/AdminCard";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilterPills } from "../components/AdminFilterPills";
import { AdminButton } from "../components/AdminButton";
import { AdminModal } from "../components/AdminModal";
import { useToast } from "../contexts/ToastContext";
import { useAppFilter } from "../contexts/AppFilterContext";
import { exportToCSV } from "../../lib/csvExport";

interface Payment {
  id: string;
  invoice_id: string | null;
  amount_fcfa: number;
  method: string;
  status: string;
  gateway_ref: string | null;
  gateway_response: any;
  created_at: string;
  invoices?: { invoice_number: string; app_id?: string; profiles?: { full_name: string; email: string } | null } | null;
}

const METHOD_LABELS: Record<string, string> = {
  orange_money: "Orange Money", mtn_momo: "MTN MoMo", wave: "Wave",
  wire_transfer: "Virement bancaire", manual: "Manuel", card: "Carte bancaire",
};

const METHOD_COLORS: Record<string, string> = {
  orange_money: "bg-orange-500/20 text-orange-400", mtn_momo: "bg-yellow-500/20 text-yellow-400",
  wave: "bg-blue-500/20 text-blue-400", wire_transfer: "bg-emerald-500/20 text-emerald-400",
  manual: "bg-neutral-500/20 text-neutral-400", card: "bg-purple-500/20 text-purple-400",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle2 size={14} className="text-green-500" />,
  failed: <XCircle size={14} className="text-red-500" />,
  pending: <CreditCard size={14} className="text-amber-500" />,
  refunded: <CreditCard size={14} className="text-purple-500" />,
};

export default function PaymentsPage() {
  const { success: toastSuccess } = useToast();
  const { selectedApp } = useAppFilter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null);

  const fetchPayments = async () => {
    const { data } = await supabase.from("payments").select("*, invoices(invoice_number, app_id, profiles(full_name, email))").order("created_at", { ascending: false });
    setPayments(data as Payment[] || []);
    setLoading(false);
  };

  useEffect(() => { fetchPayments(); }, []);

  const filtered = useMemo(() => payments.filter(p => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    if (selectedApp !== "all" && (p.invoices as any)?.app_id !== selectedApp) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(p.gateway_ref || "").toLowerCase().includes(q) && !((p.invoices as any)?.invoice_number || "").toLowerCase().includes(q) && !((p.invoices as any)?.profiles?.full_name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [payments, statusFilter, methodFilter, selectedApp, search]);

  const totalSuccess = payments.filter(p => p.status === "success").reduce((s, p) => s + p.amount_fcfa, 0);
  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount_fcfa, 0);
  const totalFailed = payments.filter(p => p.status === "failed").reduce((s, p) => s + p.amount_fcfa, 0);
  const successRate = payments.length > 0 ? Math.round((payments.filter(p => p.status === "success").length / payments.length) * 100) : 0;

  const methodChart = useMemo(() => {
    const byMethod: Record<string, number> = {};
    payments.filter(p => p.status === "success").forEach(p => { byMethod[p.method] = (byMethod[p.method] || 0) + p.amount_fcfa; });
    return Object.entries(byMethod).map(([method, amount]) => ({ method: METHOD_LABELS[method] || method, amount })).sort((a, b) => b.amount - a.amount);
  }, [payments]);

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const handleExport = () => {
    exportToCSV(filtered, [
      { key: "gateway_ref", label: "Référence" },
      { key: "amount_fcfa", label: "Montant FCFA" },
      { key: "method", label: "Méthode", render: (r: any) => METHOD_LABELS[r.method] || r.method },
      { key: "status", label: "Statut" },
      { key: "created_at", label: "Date", render: (r: any) => new Date(r.created_at).toLocaleDateString("fr-FR") },
    ], "paiements");
    toastSuccess("Export CSV téléchargé");
  };

  const statusFilters = [
    { label: "Tous", value: "all", count: payments.length },
    { label: "Réussis", value: "success", count: payments.filter(p => p.status === "success").length },
    { label: "En attente", value: "pending", count: payments.filter(p => p.status === "pending").length },
    { label: "Échoués", value: "failed", count: payments.filter(p => p.status === "failed").length },
    { label: "Remboursés", value: "refunded", count: payments.filter(p => p.status === "refunded").length },
  ];

  return (
    <div>
      <AdminPageHeader title="Paiements" subtitle={`${payments.length} transactions — Taux de succès ${successRate}%`}>
        <AdminButton icon={Download} variant="secondary" onClick={handleExport}>Export CSV</AdminButton>
      </AdminPageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <AdminCard label="Reçus" value={`${fmt(totalSuccess)} FCFA`} icon={CheckCircle2} loading={loading} />
        <AdminCard label="En attente" value={`${fmt(totalPending)} FCFA`} icon={CreditCard} loading={loading} />
        <AdminCard label="Échoués" value={`${fmt(totalFailed)} FCFA`} icon={AlertTriangle} loading={loading} />
        <AdminCard label="Taux de succès" value={`${successRate}%`} icon={DollarSign} loading={loading} />
      </div>

      {methodChart.length > 0 && (
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-6 mb-6">
          <h2 className="text-neutral-text dark:text-admin-text text-sm font-semibold mb-4">Revenus par méthode de paiement</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={methodChart} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
              <YAxis type="category" dataKey="method" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} width={120} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => [`${fmt(v)} FCFA`, "Revenus"]} />
              <Bar dataKey="amount" fill="#C8A960" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <AdminFilterPills filters={statusFilters} value={statusFilter} onChange={setStatusFilter} />
        <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] text-neutral-text dark:text-admin-text outline-none cursor-pointer">
          <option value="all">Toutes méthodes</option>
          {[...new Set(payments.map(p => p.method))].map(m => <option key={m} value={m}>{METHOD_LABELS[m] || m}</option>)}
        </select>
        <AdminSearch value={search} onChange={setSearch} placeholder="Référence, client..." />
      </div>

      <AdminTable
        keyExtractor={(r: Payment) => r.id}
        loading={loading}
        emptyMessage="Aucun paiement"
        emptyIcon={<CreditCard size={32} />}
        onRowClick={setDetailPayment}
        columns={[
          { key: "gateway_ref", label: "Référence", render: (r: Payment) => <span className="font-mono text-neutral-text dark:text-admin-text text-[13px]">{r.gateway_ref || "—"}</span> },
          { key: "client", label: "Client", render: (r: Payment) => {
            const inv = r.invoices as any;
            return <div><div className="text-neutral-text dark:text-admin-text text-[13px]">{inv?.profiles?.full_name || "—"}</div><div className="text-neutral-muted dark:text-admin-muted text-[11px]">{inv?.invoice_number || "—"}</div></div>;
          }},
          { key: "amount_fcfa", label: "Montant", sortable: true, render: (r: Payment) => <span className="text-gold dark:text-admin-accent font-mono font-semibold">{fmt(r.amount_fcfa)} FCFA</span> },
          { key: "method", label: "Méthode", render: (r: Payment) => <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${METHOD_COLORS[r.method] || METHOD_COLORS.manual}`}>{METHOD_LABELS[r.method] || r.method}</span> },
          { key: "status", label: "Statut", render: (r: Payment) => <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">{STATUS_ICONS[r.status]} {r.status === "success" ? "Réussi" : r.status === "pending" ? "En attente" : r.status === "failed" ? "Échoué" : "Remboursé"}</span> },
          { key: "created_at", label: "Date", sortable: true, render: (r: Payment) => <span className="text-[12px] text-neutral-muted dark:text-admin-muted">{new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span> },
        ]}
        data={filtered}
      />

      <AdminModal open={!!detailPayment} onClose={() => setDetailPayment(null)} title="Détail du paiement" size="md"
        subtitle={detailPayment ? `${METHOD_LABELS[detailPayment.method] || detailPayment.method} — ${fmt(detailPayment.amount_fcfa)} FCFA` : undefined}>
        {detailPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Montant</div>
                <div className="text-gold dark:text-admin-accent text-xl font-mono font-semibold">{fmt(detailPayment.amount_fcfa)} FCFA</div></div>
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Statut</div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium">{STATUS_ICONS[detailPayment.status]} {detailPayment.status}</span></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Méthode</div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${METHOD_COLORS[detailPayment.method] || ""}`}>{METHOD_LABELS[detailPayment.method] || detailPayment.method}</span></div>
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Date</div>
                <div className="text-neutral-text dark:text-admin-text text-sm">{new Date(detailPayment.created_at).toLocaleString("fr-FR")}</div></div>
            </div>
            {detailPayment.gateway_ref && (
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Référence gateway</div>
                <div className="text-neutral-text dark:text-admin-text text-sm font-mono">{detailPayment.gateway_ref}</div></div>
            )}
            {detailPayment.gateway_response && (
              <div><div className="text-neutral-muted dark:text-admin-muted text-[11px] font-semibold uppercase mb-1">Réponse gateway</div>
                <pre className="bg-warm-bg dark:bg-admin-surface-alt rounded-lg p-4 text-[12px] font-mono text-neutral-text dark:text-admin-text overflow-auto max-h-[200px] whitespace-pre-wrap">{JSON.stringify(detailPayment.gateway_response, null, 2)}</pre></div>
            )}
          </div>
        )}
      </AdminModal>
    </div>
  );
}
