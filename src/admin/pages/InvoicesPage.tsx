import { useState, useEffect } from "react";
import { Loader2, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AdminTable } from "../components/AdminTable";
import { AdminBadge } from "../components/AdminBadge";
import { AdminCard } from "../components/AdminCard";
import { APP_INFO } from "../../config/apps";
import type { Invoice } from "../../lib/database.types";

interface InvoiceWithProfile extends Invoice {
  profiles?: { full_name: string; email: string } | null;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("invoices")
        .select("*, profiles(full_name, email)")
        .order("created_at", { ascending: false });
      if (data) setInvoices(data as InvoiceWithProfile[]);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = filter === "all" ? invoices : invoices.filter(i => i.status === filter);

  const monthlyRevenue = invoices
    .filter(i => i.status === "paid" && new Date(i.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const pendingAmount = invoices
    .filter(i => i.status === "pending")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  const failedAmount = invoices
    .filter(i => i.status === "failed")
    .reduce((sum, i) => sum + Number(i.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Factures</h1>
      <p className="text-neutral-muted text-sm mb-7">{invoices.length} factures</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <AdminCard label="Revenus du mois" value={`${monthlyRevenue.toFixed(2)} FCFA`} icon={DollarSign} />
        <AdminCard label="En attente" value={`${pendingAmount.toFixed(2)} FCFA`} icon={Clock} />
        <AdminCard label="Échouées" value={`${failedAmount.toFixed(2)} FCFA`} icon={AlertTriangle} />
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { label: "Toutes", value: "all" },
          { label: "Payées", value: "paid" },
          { label: "En attente", value: "pending" },
          { label: "Échouées", value: "failed" },
          { label: "Remboursées", value: "refunded" },
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              filter === f.value ? "bg-gold text-onyx" : "bg-white border border-warm-border text-neutral-body hover:border-gold/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <AdminTable
        keyExtractor={(r: InvoiceWithProfile) => r.id}
        columns={[
          { key: "invoice_number", label: "Facture", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="font-mono text-neutral-text">{r.invoice_number}</span>
          )},
          { key: "user", label: "Client", render: (r: InvoiceWithProfile) => (
            <div>
              <span className="font-medium text-neutral-text">{r.profiles?.full_name || "—"}</span>
              <div className="text-neutral-muted text-[11px]">{r.profiles?.email || "—"}</div>
            </div>
          )},
          { key: "app_id", label: "Application", render: (r: InvoiceWithProfile) => (
            <span>{APP_INFO[r.app_id]?.name || r.app_id} &middot; {r.plan}</span>
          )},
          { key: "amount", label: "Montant", sortable: true, render: (r: InvoiceWithProfile) => (
            <span className="text-gold font-semibold">{Number(r.amount).toFixed(2)} {r.currency}</span>
          )},
          { key: "status", label: "Statut", render: (r: InvoiceWithProfile) => <AdminBadge status={r.status} /> },
          { key: "created_at", label: "Date", sortable: true, render: (r: InvoiceWithProfile) => new Date(r.created_at).toLocaleDateString("fr-FR") },
        ]}
        data={filtered}
      />
    </div>
  );
}
