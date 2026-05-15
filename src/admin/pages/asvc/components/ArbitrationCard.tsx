import { useState } from 'react';
import { Check, X, Edit3, Loader2 } from 'lucide-react';
import {
  type AgentActionWithAgent,
  CRITICALITY_CLASSES,
  CRITICALITY_BADGE_CLASSES,
  CRITICALITY_LABELS,
  DEPARTMENT_LABELS,
} from '../types';
import { timeAgoFr } from '../hooks';

interface Props {
  action: AgentActionWithAgent;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
  onModify?: (id: string) => void;
}

export function ArbitrationCard({ action, onApprove, onReject, onModify }: Props) {
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);
  const [expanded, setExpanded] = useState(false);

  const runAction = async (fn: () => Promise<void>, kind: 'approve' | 'reject') => {
    setPending(kind);
    try {
      await fn();
    } finally {
      setPending(null);
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${CRITICALITY_CLASSES[action.criticality]}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <span className="font-medium text-neutral-400">
              {action.agent?.name ?? action.agent_id.slice(0, 8)}
            </span>
            {action.agent?.department && (
              <>
                <span>·</span>
                <span>{DEPARTMENT_LABELS[action.agent.department]}</span>
              </>
            )}
            <span>·</span>
            <span>{timeAgoFr(action.created_at)}</span>
          </div>
          <h3 className="text-neutral-light text-sm font-medium mt-1 truncate">
            {action.title}
          </h3>
        </div>
        <span
          className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${CRITICALITY_BADGE_CLASSES[action.criticality]}`}
        >
          {CRITICALITY_LABELS[action.criticality]}
        </span>
      </div>

      {action.description && (
        <p className="text-neutral-400 text-[12.5px] leading-relaxed mb-3">
          {action.description}
        </p>
      )}

      <div className="bg-black/30 border border-white/5 rounded-lg p-3 mb-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[11px] text-neutral-500 hover:text-neutral-300 transition mb-1"
        >
          {expanded ? '— Réduire le payload' : '+ Voir le payload proposé'}
        </button>
        {expanded && (
          <pre className="text-[11px] text-neutral-300 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto">
            {JSON.stringify(action.proposed_payload, null, 2)}
          </pre>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => runAction(() => onApprove(action.id), 'approve')}
          className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] py-2 rounded-lg transition"
        >
          {pending === 'approve' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Check size={13} strokeWidth={2.5} />
          )}
          Approuver
        </button>

        {onModify && (
          <button
            type="button"
            disabled={pending !== null}
            onClick={() => onModify(action.id)}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-white/10 text-neutral-300 hover:bg-white/5 disabled:opacity-50 text-[12px] rounded-lg transition"
          >
            <Edit3 size={13} />
            Modifier
          </button>
        )}

        <button
          type="button"
          disabled={pending !== null}
          onClick={() => runAction(() => onReject(action.id), 'reject')}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-white/10 text-neutral-500 hover:bg-white/5 hover:text-red-300 disabled:opacity-50 text-[12px] rounded-lg transition"
        >
          {pending === 'reject' ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <X size={13} />
          )}
          Rejeter
        </button>
      </div>
    </div>
  );
}
