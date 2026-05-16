import { Plane } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useActionsLog, timeAgoFr } from './hooks';
import {
  STATUS_LABELS,
  CRITICALITY_BADGE_CLASSES,
  CRITICALITY_LABELS,
  type ActionStatus,
} from './types';

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

export default function AsvcActionsLogPage() {
  const { actions, loading } = useActionsLog(200);

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Journal des actions"
        subtitle="Toutes les actions des agents — proposées, validées, exécutées"
      />

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      <div className="rounded-xl border border-white/10 overflow-hidden">
        <table className="w-full text-[12.5px]">
          <thead className="bg-onyx-light/40">
            <tr className="text-neutral-500 text-[10.5px] uppercase tracking-wider">
              <th className="text-left px-3 py-2 font-semibold">Quand</th>
              <th className="text-left px-3 py-2 font-semibold">Action</th>
              <th className="text-left px-3 py-2 font-semibold">Criticité</th>
              <th className="text-left px-3 py-2 font-semibold">Statut</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => {
              const silenced = a.status === 'cancelled' && a.execution_error === VACATION_SILENCED_ERROR;
              return (
                <tr
                  key={a.id}
                  className={`border-t border-white/5 hover:bg-white/[0.02] ${silenced ? 'italic opacity-70' : ''}`}
                >
                  <td className="px-3 py-2.5 text-neutral-500 text-[11px] whitespace-nowrap">
                    {timeAgoFr(a.created_at)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="text-neutral-light truncate max-w-md">{a.title}</div>
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
                    <div className="text-neutral-600 text-[10.5px] font-mono">{a.action_type}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${CRITICALITY_BADGE_CLASSES[a.criticality]}`}
                    >
                      {CRITICALITY_LABELS[a.criticality]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${STATUS_COLOR[a.status]}`}>
                      {silenced ? 'Silencée (vacances)' : STATUS_LABELS[a.status]}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!loading && actions.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-10 text-center text-neutral-500 text-sm">
                  Aucune action enregistrée pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
