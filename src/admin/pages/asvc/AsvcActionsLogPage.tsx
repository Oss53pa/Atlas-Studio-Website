import { Plane, ScrollText } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { AdminTable } from '../../components/AdminTable';
import { useActionsLog, timeAgoFr } from './hooks';
import {
  STATUS_LABELS,
  CRITICALITY_BADGE_CLASSES,
  CRITICALITY_LABELS,
  type ActionStatus,
} from './types';
import type { AgentAction } from './types';

const STATUS_COLOR: Record<ActionStatus, string> = {
  proposed: 'text-neutral-400 bg-neutral-500/10',
  consolidated: 'text-neutral-300 bg-neutral-500/15',
  approved: 'text-emerald-400 bg-emerald-500/10',
  modified: 'text-amber-400 bg-amber-500/10',
  rejected: 'text-red-400 bg-red-500/10',
  executed: 'text-admin-accent bg-admin-accent/10',
  failed: 'text-red-300 bg-red-500/15',
  cancelled: 'text-neutral-500 bg-neutral-500/5',
};

const VACATION_SILENCED_ERROR = 'silenced_during_vacation';

const isSilenced = (a: AgentAction) =>
  a.status === 'cancelled' && a.execution_error === VACATION_SILENCED_ERROR;

export default function AsvcActionsLogPage() {
  const { actions, loading } = useActionsLog(200);

  const columns = [
    {
      key: 'created_at',
      label: 'Quand',
      sortable: true,
      className: 'whitespace-nowrap',
      render: (a: AgentAction) => (
        <span className="text-admin-muted text-[11px]">{timeAgoFr(a.created_at)}</span>
      ),
    },
    {
      key: 'title',
      label: 'Action',
      sortable: true,
      render: (a: AgentAction) => {
        const silenced = isSilenced(a);
        return (
          <div className={silenced ? 'italic opacity-70' : ''}>
            <div className="flex items-center gap-2">
              <div className="text-admin-text truncate max-w-md">{a.title}</div>
              {silenced && (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold border border-sky-500/30 bg-sky-500/10 text-sky-300"
                  title="Action silencée pendant le mode vacances — non notifiée au CEO"
                >
                  <Plane size={10} />
                  Vacances
                </span>
              )}
            </div>
            <div className="text-admin-muted text-[10.5px] font-mono">{a.action_type}</div>
          </div>
        );
      },
    },
    {
      key: 'criticality',
      label: 'Criticité',
      sortable: true,
      render: (a: AgentAction) => (
        <span
          className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${CRITICALITY_BADGE_CLASSES[a.criticality]}`}
        >
          {CRITICALITY_LABELS[a.criticality]}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (a: AgentAction) => (
        <span className={`text-[11px] px-2 py-0.5 rounded ${STATUS_COLOR[a.status]}`}>
          {isSilenced(a) ? 'Silencée (vacances)' : STATUS_LABELS[a.status]}
        </span>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Journal des actions"
        subtitle="Toutes les actions des agents — proposées, validées, exécutées"
      />

      <AdminTable
        columns={columns}
        data={actions}
        keyExtractor={(a) => a.id}
        loading={loading}
        pageSize={25}
        stickyHeader
        emptyMessage="Aucune action enregistrée pour le moment."
        emptyIcon={<ScrollText size={32} strokeWidth={1.5} />}
      />
    </div>
  );
}
