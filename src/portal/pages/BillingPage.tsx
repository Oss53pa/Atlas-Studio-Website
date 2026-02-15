import { CreditCard, Loader2 } from "lucide-react";
import { APP_INFO } from "../../config/apps";
import { useSubscriptions } from "../../hooks/useSubscriptions";

interface BillingPageProps {
  userId: string | undefined;
}

export function BillingPage({ userId }: BillingPageProps) {
  const { subscriptions, invoices, loading } = useSubscriptions(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gold" />
      </div>
    );
  }

  const activeSubs = subscriptions.filter(s => s.status === "active" || s.status === "trial");
  const totalMonthly = activeSubs.reduce((sum, s) => sum + Number(s.price_at_subscription || 0), 0);

  const nextPaymentDate = activeSubs.length > 0
    ? new Date(Math.min(...activeSubs.map(s => new Date(s.current_period_end).getTime())))
    : null;

  return (
    <div>
      <h1 className="text-neutral-text text-2xl font-bold mb-1">Facturation</h1>
      <p className="text-neutral-muted text-sm mb-7">Gérez vos paiements et factures</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-warm-border rounded-2xl p-5">
          <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-1">Mensualité</div>
          <div className="text-gold text-3xl font-extrabold">{totalMonthly}</div>
          <div className="text-neutral-placeholder text-xs">/mois</div>
        </div>
        <div className="bg-white border border-warm-border rounded-2xl p-5">
          <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-1">Apps actives</div>
          <div className="text-gold text-3xl font-extrabold">{activeSubs.length}</div>
          <div className="text-neutral-placeholder text-xs">sur {subscriptions.length} abonnements</div>
        </div>
        <div className="bg-white border border-warm-border rounded-2xl p-5">
          <div className="text-neutral-muted text-xs font-bold uppercase tracking-wider mb-1">Prochain paiement</div>
          <div className="text-gold text-3xl font-extrabold">
            {nextPaymentDate ? `${String(nextPaymentDate.getDate()).padStart(2, '0')}/${String(nextPaymentDate.getMonth() + 1).padStart(2, '0')}` : '—'}
          </div>
          <div className="text-neutral-placeholder text-xs">
            {nextPaymentDate ? nextPaymentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'Aucun'}
          </div>
        </div>
      </div>

      <button className="flex items-center gap-2 px-5 py-3 border border-warm-border rounded-lg bg-white text-neutral-body text-sm font-medium hover:border-gold/40 transition-colors mb-8">
        <CreditCard size={16} strokeWidth={1.5} className="text-gold" />
        Gérer mes moyens de paiement
      </button>

      <h2 className="text-neutral-text text-lg font-bold mb-4">Historique des factures</h2>
      {invoices.length === 0 ? (
        <div className="bg-white border border-warm-border rounded-2xl p-8 text-center">
          <p className="text-neutral-muted text-sm">Aucune facture pour le moment.</p>
        </div>
      ) : (
        <div className="bg-white border border-warm-border rounded-2xl overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-warm-border">
                {["Facture", "Date", "Application", "Montant", "Statut"].map(h => (
                  <th key={h} className="text-neutral-muted text-[11px] font-bold uppercase tracking-wider p-4 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => {
                const appName = APP_INFO[inv.app_id]?.name || inv.app_id;
                return (
                  <tr key={inv.id} className="border-b border-warm-bg last:border-b-0 hover:bg-warm-bg/50 transition-colors">
                    <td className="text-neutral-body text-[13px] p-4 font-mono">{inv.invoice_number}</td>
                    <td className="text-neutral-muted text-[13px] p-4">{new Date(inv.created_at).toLocaleDateString('fr-FR')}</td>
                    <td className="text-neutral-text text-[13px] p-4">{appName} &middot; {inv.plan}</td>
                    <td className="text-gold text-[13px] p-4 font-semibold">{Number(inv.amount).toFixed(2)} {inv.currency}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        inv.status === "paid"
                          ? "bg-green-50 text-green-600 border-green-200"
                          : inv.status === "pending"
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-red-50 text-red-600 border-red-200"
                      }`}>
                        {inv.status === "paid" ? "\u2713 Payée" : inv.status === "pending" ? "En attente" : "\u2715 Échouée"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
