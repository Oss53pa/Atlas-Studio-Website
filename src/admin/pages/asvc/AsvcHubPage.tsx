import { Sunrise, AlertCircle, Inbox, RefreshCw, Loader2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { ArbitrationCard } from './components/ArbitrationCard';
import { useArbitrations, useLatestBrief, timeAgoFr } from './hooks';

export default function AsvcHubPage() {
  const { actions, loading, approve, reject } = useArbitrations();
  const { brief, generating, error: briefError, generate } = useLatestBrief('morning');

  const urgentCount = actions.filter((a) => a.criticality === 'critical').length;
  const normalCount = actions.length - urgentCount;

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="ASVC — Virtual Company"
        subtitle="Brief matinal + inbox d'arbitrages CEO"
      />

      {/* ─── Brief matinal ─── */}
      <section className="mb-8 rounded-2xl border border-white/10 bg-gradient-to-br from-onyx-light/50 to-onyx-light/20 p-6">
        <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Sunrise size={16} className="text-admin-accent" />
            <h2 className="text-neutral-light text-sm font-semibold">
              Brief matinal
            </h2>
            <span className="text-neutral-500 text-[11px] truncate">
              {brief
                ? new Date(brief.brief_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) +
                  ` · généré ${timeAgoFr(brief.created_at)}`
                : 'En attente du premier brief'}
            </span>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-300 text-[11px] rounded-md transition"
          >
            {generating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {generating ? 'Génération...' : 'Générer maintenant'}
          </button>
        </div>

        {briefError && (
          <p className="mb-2 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
            Erreur génération brief : {briefError}
          </p>
        )}

        {brief ? (
          <p className="text-neutral-300 text-[13.5px] leading-relaxed whitespace-pre-line">
            {brief.summary}
          </p>
        ) : (
          <p className="text-neutral-500 text-[13px] italic">
            Aucun brief publié pour le moment. Clique sur "Générer maintenant" pour
            produire le premier brief, ou attends le cron de 7h00 quand le COO sera planifié.
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-[11px]">
          <Stat label="Arbitrages en attente" value={actions.length} accent />
          <Stat label="Urgents" value={urgentCount} danger={urgentCount > 0} />
          <Stat label="Normaux" value={normalCount} />
        </div>
      </section>

      {/* ─── Inbox arbitrages ─── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Inbox size={15} className="text-admin-accent" />
            <h2 className="text-neutral-light text-sm font-semibold">
              Inbox arbitrages
            </h2>
          </div>
          {actions.length > 0 && (
            <span className="text-neutral-500 text-[11px]">
              {actions.length} action{actions.length > 1 ? 's' : ''} à valider
            </span>
          )}
        </div>

        {loading && (
          <div className="text-neutral-500 text-sm py-12 text-center">
            Chargement des arbitrages...
          </div>
        )}

        {!loading && actions.length === 0 && (
          <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
            <AlertCircle size={20} className="text-neutral-600 mx-auto mb-2" />
            <p className="text-neutral-400 text-sm">
              Aucun arbitrage en attente.
            </p>
            <p className="text-neutral-600 text-[11px] mt-1">
              Les agents te solliciteront ici dès qu'une action externe nécessitera ta validation.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {actions.map((action) => (
            <ArbitrationCard
              key={action.id}
              action={action}
              onApprove={approve}
              onReject={reject}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  accent = false,
  danger = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
  danger?: boolean;
}) {
  const cls = danger
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : accent
      ? 'border-admin-accent/30 bg-admin-accent/10 text-admin-accent'
      : 'border-white/10 bg-white/5 text-neutral-300';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${cls}`}>
      <span className="font-semibold">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}
