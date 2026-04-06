import { useState, useEffect } from "react";
import {
  DollarSign, Clock, CreditCard, ArrowUpDown, Search, Eye, CheckCircle,
  RotateCcw, AlertTriangle, Filter, Banknote
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { apiCall } from "../../lib/api";
import { useToast } from "../contexts/ToastContext";
import { AdminCard } from "../components/AdminCard";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  reference: string;
  created_at: string;
  profiles?: { full_name: string; email: string } | null;
}

const STATUS_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "Succès", value: "succeeded" },
  { label: "En attente", value: "pending" },
  { label: "Échoué", value: "failed" },
  { label: "Remboursé", value: "refunded" },
];

const METHOD_FILTERS = [
  { label: "Tous", value: "all" },
  { label: "Mobile Money", value: "mobile_money" },
  { label: "CinetPay", value: "cinetpay" },
  { label: "Stripe", value: "stripe" },
  { label: "Virement", value: "wire" },
];

const PERIOD_FILTERS = [
  { label: "Tout", value: "all" },
  { label: "Aujourd'hui", value: "today" },
  { label: "7 jours", value: "7" },
  { label: "30 jours", value: "30" },
  { label: "90 jours", value: "90" },
];

const METHOD_COLORS: Record<string, string> = {
  mobile_money: "bg-green-500/20 text-green-400 border-green-500/30",
  cinetpay: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  stripe: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  wire: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

const CHART_COLORS = ["#22c55e", "#3b82f6", "#a855f7", "#EF9F27", "#ef4444"];

const fmt = (n: number) => n.toLocaleString("fr-FR");
const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function PaymentsPage() {
  const { success, error: showError } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("payment_transactions")
      .select("*, profiles(full_name, email)")
      .order("created_at", { ascending: false });
    if (data) setTransactions(data as Transaction[]);
    if (error) showError("Erreur chargement paiements");
    setLoading(false);
  };

  useEffect(() => { fetchTransactions(); }, []);

  // KPI calculations
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayTx = transactions.filter(t => new Date(t.created_at) >= today);
  const receivedToday = todayTx.filter(t => t.status === "succeeded").reduce((s, t) => s + t.amount, 0);
  const txCountToday = todayTx.length;
  const receivedMonth = transactions.filter(t => t.status === "succeeded" && new Date(t.created_at) >= monthStart).reduce((s, t) => s + t.amount, 0);
  const pendingWires = transactions.filter(t => t.payment_method === "wire" && t.status === "pending");
  const pendingWireTotal = pendingWires.reduce((s, t) => s + t.amount, 0);

  // Donut chart data
  const methodBreakdown = transactions
    .filter(t => t.status === "succeeded")
    .reduce((acc, t) => {
      acc[t.payment_method] = (acc[t.payment_method] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const chartData = Object.entries(methodBreakdown).map(([name, value]) => ({ name, value }));

  // Filtering
  const filtered = transactions.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (methodFilter !== "all" && t.payment_method !== methodFilter) return false;
    if (periodFilter !== "all") {
      const cutoff = new Date();
      if (periodFilter === "today") cutoff.setHours(0, 0, 0, 0);
      else cutoff.setDate(cutoff.getDate() - Number(periodFilter));
      if (new Date(t.created_at) < cutoff) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const name = t.profiles?.full_name?.toLowerCase() || "";
      const email = t.profiles?.email?.toLowerCase() || "";
      if (!name.includes(q) && !email.includes(q) && !t.reference?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const confirmWire = async (tx: Transaction) => {
    setConfirming(tx.id);
    try {
      await supabase.from("payment_transactions").update({ status: "succeeded" }).eq("id", tx.id);
      success("Virement confirmé");
      fetchTransactions();
    } catch { showError("Erreur confirmation"); }
    setConfirming(null);
  };

  const refundTx = async (tx: Transaction) => {
    try {
      await apiCall("admin-refund", { method: "POST", body: { transactionId: tx.id } });
      success("Remboursement initié");
      fetchTransactions();
    } catch { showError("Erreur remboursement"); }
  };

  const columns = [
    { key: "date", label: "Date", sortable: true, render: (t: Transaction) => <span className="text-[13px] text-[#F5F5F5]">{fmtDate(t.created_at)}</span> },
    { key: "tenant", label: "Client", render: (t: Transaction) => (
      <div>
        <div className="text-[13px] text-[#F5F5F5]">{t.profiles?.full_name || "—"}</div>
        <div className="text-[11px] text-[#888]">{t.profiles?.email || ""}</div>
      </div>
    )},
    { key: "amount", label: "Montant", sortable: true, render: (t: Transaction) => (
      <span className="font-mono text-[14px] font-semibold text-[#EF9F27]">{fmt(t.amount)} FCFA</span>
    )},
    { key: "method", label: "Méthode", render: (t: Transaction) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${METHOD_COLORS[t.payment_method] || "bg-[#2A2A3A] text-[#888] border-[#2A2A3A]"}`}>
        {t.payment_method}
      </span>
    )},
    { key: "status", label: "Statut", render: (t: Transaction) => <AdminBadge status={t.status === "succeeded" ? "paid" : t.status} /> },
    { key: "reference", label: "Référence", render: (t: Transaction) => <span className="font-mono text-[12px] text-[#888]">{t.reference || "—"}</span> },
    { key: "actions", label: "", render: (t: Transaction) => (
      <div className="flex items-center gap-1">
        <button className="p-1.5 rounded hover:bg-[#2A2A3A] text-[#888] hover:text-[#F5F5F5] transition-colors" title="Voir">
          <Eye size={14} />
        </button>
        {t.payment_method === "wire" && t.status === "pending" && (
          <button onClick={(e) => { e.stopPropagation(); confirmWire(t); }}
            disabled={confirming === t.id}
            className="p-1.5 rounded hover:bg-green-500/20 text-green-400 transition-colors" title="Confirmer virement">
            <CheckCircle size={14} />
          </button>
        )}
        {t.status === "succeeded" && (
          <button onClick={(e) => { e.stopPropagation(); refundTx(t); }}
            className="p-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors" title="Rembourser">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F5F5F5]">Paiements</h1>
        <p className="text-[#888] text-sm mt-1">Transactions, virements et encaissements</p>
      </div>

      {/* Pending wires alert */}
      {pendingWires.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-amber-400 shrink-0" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-amber-300">{pendingWires.length} virement(s) en attente de confirmation</div>
            <div className="text-[12px] text-amber-400/70 mt-0.5">Montant total : <span className="font-mono font-semibold">{fmt(pendingWireTotal)} FCFA</span></div>
          </div>
          <button onClick={() => { setMethodFilter("wire"); setStatusFilter("pending"); }}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[12px] font-medium rounded-lg transition-colors">
            Voir les virements
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminCard label="Reçu aujourd'hui" value={`${fmt(receivedToday)} FCFA`} icon={DollarSign} />
        <AdminCard label="Transactions aujourd'hui" value={txCountToday} icon={CreditCard} />
        <AdminCard label="Reçu ce mois" value={`${fmt(receivedMonth)} FCFA`} icon={Banknote} />
        <AdminCard label="Virements en attente" value={pendingWires.length} sub={`${fmt(pendingWireTotal)} FCFA`} icon={Clock} />
      </div>

      {/* Chart + Filters row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut */}
        <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5">
          <h3 className="text-[13px] font-semibold text-[#888] uppercase tracking-wider mb-4">Répartition par méthode</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {chartData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `${fmt(v)} FCFA`} contentStyle={{ background: "#1E1E2E", border: "1px solid #2A2A3A", borderRadius: 8, color: "#F5F5F5", fontSize: 12 }} />
                <Legend formatter={(v) => <span className="text-[12px] text-[#888]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[#888] text-sm">Aucune donnée</div>
          )}
        </div>

        {/* Filters */}
        <div className="lg:col-span-2 bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-[#888]">
            <Filter size={14} />
            <span className="text-[13px] font-semibold uppercase tracking-wider">Filtres</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#888] font-medium uppercase mb-1 block">Statut</label>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-[13px] text-[#F5F5F5] focus:border-[#EF9F27] outline-none">
                {STATUS_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#888] font-medium uppercase mb-1 block">Méthode</label>
              <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-[13px] text-[#F5F5F5] focus:border-[#EF9F27] outline-none">
                {METHOD_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#888] font-medium uppercase mb-1 block">Période</label>
              <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg px-3 py-2 text-[13px] text-[#F5F5F5] focus:border-[#EF9F27] outline-none">
                {PERIOD_FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#888] font-medium uppercase mb-1 block">Recherche</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, email, référence..."
                  className="w-full bg-[#0A0A0A] border border-[#2A2A3A] rounded-lg pl-8 pr-3 py-2 text-[13px] text-[#F5F5F5] placeholder-[#888] focus:border-[#EF9F27] outline-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions table */}
      <div className="bg-[#1E1E2E] border border-[#2A2A3A] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#2A2A3A] flex items-center justify-between">
          <h3 className="text-[13px] font-semibold text-[#888] uppercase tracking-wider">Transactions ({filtered.length})</h3>
        </div>
        <AdminTable
          columns={columns}
          data={filtered}
          keyExtractor={(t) => t.id}
          loading={loading}
          emptyMessage="Aucune transaction trouvée"
          pageSize={15}
        />
      </div>
    </div>
  );
}
