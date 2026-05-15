import { useMemo, useState } from 'react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { ArbitrationCard } from './components/ArbitrationCard';
import { useArbitrations } from './hooks';
import { CRITICALITY_LABELS, type Criticality } from './types';

type CritFilter = 'all' | Criticality;

const FILTERS: { id: CritFilter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'critical', label: CRITICALITY_LABELS.critical },
  { id: 'high', label: CRITICALITY_LABELS.high },
  { id: 'normal', label: CRITICALITY_LABELS.normal },
  { id: 'low', label: CRITICALITY_LABELS.low },
];

export default function AsvcArbitrationsPage() {
  const { actions, loading, approve, reject } = useArbitrations();
  const [filter, setFilter] = useState<CritFilter>('all');

  const filtered = useMemo(
    () => (filter === 'all' ? actions : actions.filter((a) => a.criticality === filter)),
    [actions, filter],
  );

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Arbitrages"
        subtitle="Toutes les actions proposées par les agents en attente de ta validation"
      />

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
    </div>
  );
}
