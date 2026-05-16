import { useMemo, useState } from 'react';
import { ClipboardCheck, Play, Loader2, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { ArbitrationCard } from './components/ArbitrationCard';
import { useArbitrations, usePendingExecutions, timeAgoFr } from './hooks';
import {
  CRITICALITY_LABELS,
  CRITICALITY_BADGE_CLASSES,
  type Criticality,
  type PendingExecution,
} from './types';

type Tab = 'pending_validation' | 'pending_execution';
type CritFilter = 'all' | Criticality;

const FILTERS: { id: CritFilter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'critical', label: CRITICALITY_LABELS.critical },
  { id: 'high', label: CRITICALITY_LABELS.high },
  { id: 'normal', label: CRITICALITY_LABELS.normal },
  { id: 'low', label: CRITICALITY_LABELS.low },
];

export default function AsvcArbitrationsPage() {
  const [tab, setTab] = useState<Tab>('pending_validation');

  const validation = useArbitrations();
  const execution = usePendingExecutions();

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Arbitrages"
        subtitle="Actions proposées par les agents — validation puis exécution"
      />

      <div className="flex gap-1 border-b border-white/10 mb-5">
        <TabButton
          active={tab === 'pending_validation'}
          onClick={() => setTab('pending_validation')}
          icon={<ClipboardCheck size={13} />}
          label="À valider"
          count={validation.actions.length}
        />
        <TabButton
          active={tab === 'pending_execution'}
          onClick={() => setTab('pending_execution')}
          icon={<Play size={13} />}
          label="À exécuter"
          count={execution.rows.length}
          accent
        />
      </div>

      {tab === 'pending_validation' && (
        <ValidationTab
          actions={validation.actions}
          loading={validation.loading}
          approve={validation.approve}
          reject={validation.reject}
        />
      )}

      {tab === 'pending_execution' && (
        <ExecutionTab
          rows={execution.rows}
          loading={execution.loading}
          executing={execution.executing}
          error={execution.error}
          lastSummary={execution.lastSummary}
          onExecuteOne={execution.executeOne}
          onExecuteBatch={execution.executeBatch}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  accent = false,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px] border-b-2 -mb-px transition ${
        active
          ? 'border-admin-accent text-admin-accent font-semibold'
          : 'border-transparent text-neutral-400 hover:text-neutral-200'
      }`}
    >
      {icon}
      {label}
      <span
        className={`ml-1 text-[10.5px] px-1.5 py-0.5 rounded ${
          active
            ? 'bg-admin-accent/15'
            : accent && count > 0
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-white/5'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ValidationTab({
  actions,
  loading,
  approve,
  reject,
}: {
  actions: ReturnType<typeof useArbitrations>['actions'];
  loading: boolean;
  approve: ReturnType<typeof useArbitrations>['approve'];
  reject: ReturnType<typeof useArbitrations>['reject'];
}) {
  const [filter, setFilter] = useState<CritFilter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? actions : actions.filter((a) => a.criticality === filter)),
    [actions, filter],
  );

  return (
    <>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTERS.map((f) => {
          const count =
            f.id === 'all'
              ? actions.length
              : actions.filter((a) => a.criticality === f.id).length;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition ${
                active
                  ? 'bg-admin-accent/15 text-admin-accent border-admin-accent/30'
                  : 'border-white/10 text-neutral-400 hover:bg-white/5'
              }`}
            >
              {f.label}
              <span className="ml-1.5 opacity-70 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {!loading && filtered.length === 0 && (
        <p className="text-neutral-500 text-sm py-12 text-center">
          Aucun arbitrage pour ce filtre.
        </p>
      )}

      <div className="space-y-3">
        {filtered.map((action) => (
          <ArbitrationCard
            key={action.id}
            action={action}
            onApprove={approve}
            onReject={reject}
          />
        ))}
      </div>
    </>
  );
}

function ExecutionTab({
  rows,
  loading,
  executing,
  error,
  lastSummary,
  onExecuteOne,
  onExecuteBatch,
}: {
  rows: PendingExecution[];
  loading: boolean;
  executing: boolean;
  error: string | null;
  lastSummary: ReturnType<typeof usePendingExecutions>['lastSummary'];
  onExecuteOne: (id: string) => void;
  onExecuteBatch: (ids: string[]) => void;
}) {
  const internalRows = rows.filter((r) => r.execution_kind === 'internal');
  const externalRows = rows.filter((r) => r.execution_kind === 'external');

  return (
    <>
      <div className="mb-4 rounded-lg border border-white/5 bg-onyx-light/20 p-3 text-[12px] text-neutral-400">
        <Play size={13} className="inline mr-1.5" />
        Une fois <span className="text-emerald-300 font-medium">approuvée</span>, une action passe ici pour <span className="text-admin-accent font-medium">exécution</span>.
        Les actions <em>internal</em> s'exécutent intégralement en base (réponse ticket → insérée dans le fil, lead → score mis à jour, etc.).
        Les actions <em>external</em> (envoi email, push GitHub, deploy prod) restent en attente jusqu'à câblage du connecteur correspondant.
      </div>

      {error && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {lastSummary && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-[12px] flex flex-wrap items-center gap-4">
          <CheckCircle2 size={13} className="text-emerald-300" />
          <span className="text-emerald-300 font-semibold">Dernier batch :</span>
          <span className="text-emerald-200">{lastSummary.succeeded_internal} exécutées</span>
          {lastSummary.pending_external > 0 && (
            <span className="text-amber-300">{lastSummary.pending_external} en attente connecteur</span>
          )}
          {lastSummary.failed > 0 && (
            <span className="text-red-300">{lastSummary.failed} en échec</span>
          )}
          <span className="text-emerald-300/60">sur {lastSummary.total} action{lastSummary.total > 1 ? 's' : ''}</span>
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {!loading && rows.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
          <CheckCircle2 size={20} className="text-emerald-300 mx-auto mb-2" />
          <p className="text-neutral-400 text-sm">Aucune action en attente d'exécution.</p>
          <p className="text-neutral-600 text-[11px] mt-1">
            Tout ce qui est approuvé a déjà été exécuté ou attend un connecteur externe.
          </p>
        </div>
      )}

      {internalRows.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              In-system ({internalRows.length})
            </h2>
            <button
              type="button"
              onClick={() => onExecuteBatch(internalRows.map((r) => r.action_id))}
              disabled={executing || internalRows.length === 0}
              className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] px-3 py-1.5 rounded-lg transition"
            >
              {executing ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Tout exécuter ({internalRows.length})
            </button>
          </div>
          <div className="space-y-2">
            {internalRows.map((r) => (
              <ExecutionRow
                key={r.action_id}
                row={r}
                executing={executing}
                onExecute={() => onExecuteOne(r.action_id)}
              />
            ))}
          </div>
        </section>
      )}

      {externalRows.length > 0 && (
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-3">
            En attente connecteur externe ({externalRows.length})
          </h2>
          <div className="space-y-2">
            {externalRows.map((r) => (
              <ExecutionRow
                key={r.action_id}
                row={r}
                executing={false}
                onExecute={() => undefined}
                disabled
              />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ExecutionRow({
  row,
  executing,
  onExecute,
  disabled = false,
}: {
  row: PendingExecution;
  executing: boolean;
  onExecute: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/30 px-3 py-2.5 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${CRITICALITY_BADGE_CLASSES[row.criticality]}`}>
            {row.criticality}
          </span>
          {row.agent_code && (
            <span className="text-neutral-500 text-[11px] font-mono">{row.agent_code}</span>
          )}
          <span className="text-neutral-700 text-[10.5px]">·</span>
          <span className="text-neutral-600 text-[10.5px] font-mono">{row.action_type}</span>
        </div>
        <div className="text-neutral-light text-[12.5px] truncate">{row.title}</div>
        {row.approved_at && (
          <div className="text-neutral-600 text-[10.5px] mt-0.5">
            approuvée {timeAgoFr(row.approved_at)}
          </div>
        )}
      </div>
      {disabled ? (
        <span className="inline-flex items-center gap-1 text-neutral-500 text-[11px]">
          <ExternalLink size={11} />
          Connecteur requis
        </span>
      ) : (
        <button
          type="button"
          onClick={onExecute}
          disabled={executing}
          className="inline-flex items-center gap-1.5 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[11.5px] px-2.5 py-1.5 rounded-md transition"
        >
          {executing ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
          Exécuter
        </button>
      )}
    </div>
  );
}
