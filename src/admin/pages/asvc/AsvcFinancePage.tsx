import { useState } from 'react';
import { Receipt, BookOpenCheck, Wallet, Loader2, RefreshCw, AlertCircle, Send, Calculator } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useOverdueInvoices, useTreasury, timeAgoFr } from './hooks';
import {
  REMINDER_LEVEL_LABELS,
  REMINDER_LEVEL_CLASSES,
  type OverdueInvoice,
  type ReminderLevel,
  type AccountingFlowKind,
} from './types';

type Tab = 'billing' | 'accounting' | 'treasury';

function fcfaFmt(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
}

const TABS: { id: Tab; label: string; Icon: typeof Receipt }[] = [
  { id: 'billing', label: 'Factures', Icon: Receipt },
  { id: 'accounting', label: 'Compta SYSCOHADA', Icon: BookOpenCheck },
  { id: 'treasury', label: 'Trésorerie', Icon: Wallet },
];

export default function AsvcFinancePage() {
  const [tab, setTab] = useState<Tab>('billing');

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Finance"
        subtitle="Facturation · Compta SYSCOHADA · Trésorerie — par les 3 agents Finance"
      />

      <div className="flex gap-1 border-b border-white/10 mb-5">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] border-b-2 -mb-px transition ${
                active
                  ? 'border-admin-accent text-admin-accent font-semibold'
                  : 'border-transparent text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <t.Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'billing' && <BillingTab />}
      {tab === 'accounting' && <AccountingTab />}
      {tab === 'treasury' && <TreasuryTab />}
    </div>
  );
}

// ─── Billing Tab ────────────────────────────────────────────────────────────
function BillingTab() {
  const { rows, loading, draftReminder, pendingId, actionError } = useOverdueInvoices();

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
        <Receipt size={20} className="text-neutral-600 mx-auto mb-2" />
        <p className="text-neutral-400 text-sm">Aucune facture à relancer 🎉</p>
        <p className="text-neutral-600 text-[11px] mt-1">
          Le Facturation Agent surveille les échéances. Une carte apparaîtra ici dès qu'une relance est suggérée.
        </p>
      </div>
    );
  }

  return (
    <>
      {actionError && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          {actionError}
        </div>
      )}

      <div className="space-y-2">
        {rows.map((inv) => (
          <InvoiceCard
            key={inv.invoice_id}
            inv={inv}
            pending={pendingId === inv.invoice_id}
            onDraft={(level) => draftReminder(inv.invoice_id, level)}
          />
        ))}
      </div>
    </>
  );
}

function InvoiceCard({
  inv,
  pending,
  onDraft,
}: {
  inv: OverdueInvoice;
  pending: boolean;
  onDraft: (level: ReminderLevel) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <div className="flex flex-wrap items-start gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-neutral-500 font-mono text-[11px]">{inv.invoice_number}</span>
            <h3 className="text-neutral-light text-[13px] font-medium truncate">{inv.client_name}</h3>
            <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${REMINDER_LEVEL_CLASSES[inv.suggested_level]}`}>
              {REMINDER_LEVEL_LABELS[inv.suggested_level]}
            </span>
          </div>
          <div className="text-neutral-400 text-[12px] font-mono mt-1">
            {fcfaFmt(inv.amount_ttc_fcfa)}
          </div>
          <div className="text-neutral-600 text-[10.5px] mt-1 flex flex-wrap gap-x-3">
            <span>échéance {inv.due_date}</span>
            {inv.days_overdue > 0 ? (
              <span className="text-red-300/80">{inv.days_overdue}j de retard</span>
            ) : (
              <span className="text-blue-300/80">avant échéance</span>
            )}
            <span>{inv.reminder_count} relance{inv.reminder_count > 1 ? 's' : ''}</span>
            {inv.last_reminder_at && <span>dernière {timeAgoFr(inv.last_reminder_at)}</span>}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onDraft(inv.suggested_level)}
          disabled={pending}
          className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 text-onyx font-semibold text-[11.5px] px-2.5 py-1.5 rounded-md transition"
        >
          {pending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          Drafter relance
        </button>
      </div>
    </div>
  );
}

// ─── Accounting Tab ─────────────────────────────────────────────────────────
function AccountingTab() {
  const { rows, loading, suggestJournal, pendingId, actionError } = useOverdueInvoices();

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;

  return (
    <>
      <div className="mb-4 rounded-lg border border-white/5 bg-onyx-light/20 p-3 text-[12px] text-neutral-400">
        <BookOpenCheck size={13} className="inline mr-1.5" />
        Le Compta Agent propose des écritures SYSCOHADA équilibrées (déb=créd). Tu valides avant
        import dans Atlas Finance. Aucune écriture n'est passée automatiquement.
      </div>

      {actionError && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          {actionError}
        </div>
      )}

      {rows.length === 0 && (
        <p className="text-neutral-500 text-sm">Aucune facture à passer en compta pour l'instant.</p>
      )}

      <div className="space-y-2">
        {rows.map((inv) => (
          <div key={inv.invoice_id} className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-neutral-500 font-mono text-[11px]">{inv.invoice_number}</span>
                  <span className="text-neutral-light text-[13px] font-medium truncate">{inv.client_name}</span>
                  <span className="text-neutral-500 text-[11px]">· {inv.status}</span>
                </div>
                <div className="text-neutral-400 text-[12px] font-mono">{fcfaFmt(inv.amount_ttc_fcfa)}</div>
              </div>

              <div className="flex gap-1 flex-wrap">
                {(['invoice_issued', 'invoice_paid'] as AccountingFlowKind[]).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => suggestJournal(inv.invoice_id, kind)}
                    disabled={pendingId === inv.invoice_id}
                    className="inline-flex items-center gap-1 px-2 py-1.5 border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-50 text-[11px] rounded-md transition"
                    title={kind === 'invoice_issued' ? 'Écriture émission (411/706/4431)' : 'Écriture encaissement (521/411)'}
                  >
                    {pendingId === inv.invoice_id ? <Loader2 size={10} className="animate-spin" /> : <Calculator size={11} />}
                    {kind === 'invoice_issued' ? 'Émission' : 'Encaissement'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Treasury Tab ───────────────────────────────────────────────────────────
function TreasuryTab() {
  const { dashboard, loading, generating, genError, triggerBrief } = useTreasury();

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;
  if (!dashboard) return <p className="text-neutral-500 text-sm">Aucune donnée disponible.</p>;

  const overdueRatio =
    dashboard.receivables.outstanding_fcfa > 0
      ? dashboard.receivables.overdue_fcfa / dashboard.receivables.outstanding_fcfa
      : 0;

  return (
    <>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-neutral-500 text-[11px]">
          Snapshot · {new Date(dashboard.as_of).toLocaleString('fr-FR')}
        </p>
        <button
          type="button"
          onClick={triggerBrief}
          disabled={generating}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 hover:bg-white/5 disabled:opacity-50 text-neutral-300 text-[11px] rounded-md transition"
        >
          {generating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          {generating ? 'Trésorerie Agent en cours...' : 'Demander un brief Trésorerie'}
        </button>
      </div>

      {genError && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          {genError}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-3 mb-5">
        <KpiCard
          label="Encours total"
          value={fcfaFmt(dashboard.receivables.outstanding_fcfa)}
          sub={`dont ${fcfaFmt(dashboard.receivables.overdue_fcfa)} en retard (${dashboard.receivables.overdue_count} factures)`}
          accent={overdueRatio > 0.3}
          danger={overdueRatio > 0.5}
        />
        <KpiCard
          label="DSO 90j"
          value={`${dashboard.receivables.dso_avg_days}j`}
          sub="Days Sales Outstanding moyens"
          accent={dashboard.receivables.dso_avg_days > 45}
          danger={dashboard.receivables.dso_avg_days > 60}
        />
        <KpiCard
          label="Encaissé 30j"
          value={fcfaFmt(dashboard.revenue.paid_last_30d_fcfa)}
          sub={`${fcfaFmt(dashboard.revenue.paid_last_90d_fcfa)} sur 90j`}
        />
        <KpiCard
          label="MRR estimé"
          value={fcfaFmt(dashboard.mrr_estimate_fcfa)}
          sub={`pipeline propal+nego: ${fcfaFmt(dashboard.pipeline_potential_fcfa)}`}
        />
        <KpiCard
          label="Échéances 7j"
          value={fcfaFmt(dashboard.receivables.due_next_7d_fcfa)}
          sub="à venir cette semaine"
        />
        <KpiCard
          label="Facturé MTD"
          value={fcfaFmt(dashboard.revenue.invoiced_mtd_fcfa)}
          sub={`encaissé MTD: ${fcfaFmt(dashboard.revenue.paid_mtd_fcfa)}`}
        />
      </div>

      {dashboard.recent_overdue.length > 0 && (
        <>
          <h3 className="text-neutral-light text-[12px] font-semibold mb-2">
            Top retards
          </h3>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-[12px]">
              <thead className="bg-onyx-light/40">
                <tr className="text-neutral-500 text-[10.5px] uppercase tracking-wider">
                  <th className="text-left px-3 py-2 font-semibold">Facture</th>
                  <th className="text-left px-3 py-2 font-semibold">Client</th>
                  <th className="text-right px-3 py-2 font-semibold">Montant</th>
                  <th className="text-right px-3 py-2 font-semibold">Retard</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recent_overdue.map((o) => (
                  <tr key={o.invoice_number} className="border-t border-white/5">
                    <td className="px-3 py-2 text-neutral-500 font-mono text-[11px]">{o.invoice_number}</td>
                    <td className="px-3 py-2 text-neutral-300">{o.client_name}</td>
                    <td className="px-3 py-2 text-right font-mono text-neutral-300">{fcfaFmt(o.amount_ttc_fcfa)}</td>
                    <td className="px-3 py-2 text-right text-red-300/80">{o.days_overdue}j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent = false,
  danger = false,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const borderClass = danger
    ? 'border-red-500/30 bg-red-500/5'
    : accent
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-white/10 bg-onyx-light/30';
  return (
    <div className={`rounded-xl border p-4 ${borderClass}`}>
      <div className="text-neutral-500 text-[10.5px] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-neutral-light text-[15px] font-semibold font-mono">{value}</div>
      {sub && <div className="text-neutral-600 text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}
