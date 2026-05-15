import { useMemo, useState } from 'react';
import { Sparkles, Loader2, Users, AlertCircle } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useClientsLifecycle, timeAgoFr } from './hooks';
import {
  LIFECYCLE_LABELS,
  LIFECYCLE_CLASSES,
  STAGE_TO_GOAL,
  type LifecycleStage,
  type OutreachGoal,
} from './types';

type StageFilter = 'all' | 'actionable' | LifecycleStage;

const FILTERS: { id: StageFilter; label: string }[] = [
  { id: 'actionable', label: 'Actionnables' },
  { id: 'all', label: 'Tout' },
  { id: 'churn_risk', label: LIFECYCLE_LABELS.churn_risk },
  { id: 'trial_ending', label: LIFECYCLE_LABELS.trial_ending },
  { id: 'd1', label: 'J+1' },
  { id: 'd7', label: 'J+7' },
  { id: 'd30', label: 'J+30' },
  { id: 'upsell', label: LIFECYCLE_LABELS.upsell },
];

const ACTIONABLE: LifecycleStage[] = ['churn_risk', 'trial_ending', 'd1', 'd7', 'd30', 'upsell'];

export default function AsvcCustomersPage() {
  const { rows, loading, error, triggerOutreach, pendingClientId, outreachError } = useClientsLifecycle(100);
  const [filter, setFilter] = useState<StageFilter>('actionable');

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    if (filter === 'actionable') return rows.filter((r) => ACTIONABLE.includes(r.stage));
    return rows.filter((r) => r.stage === filter);
  }, [rows, filter]);

  const counts = useMemo(() => {
    const c = { actionable: 0 } as Record<string, number>;
    for (const r of rows) {
      c[r.stage] = (c[r.stage] ?? 0) + 1;
      if (ACTIONABLE.includes(r.stage)) c.actionable++;
    }
    return c;
  }, [rows]);

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Customer Lifecycle"
        subtitle="Étape de cycle de vie de chaque client — l'agent Customer Success peut drafter l'outreach approprié"
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const count =
            f.id === 'actionable'
              ? counts.actionable ?? 0
              : f.id === 'all'
                ? rows.length
                : counts[f.id] ?? 0;
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

      {outreachError && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          Outreach échoué : {outreachError}
        </div>
      )}

      {error && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          Erreur de chargement : {error}
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
          <Users size={20} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-400 text-sm">Aucun client pour ce filtre.</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((r) => {
          const goal = STAGE_TO_GOAL[r.stage];
          const isPending = pendingClientId === r.client_id;
          const daysSinceSignup = r.signal_payload.days_since_signup ?? null;
          const sentiment = r.last_ticket_sentiment;
          return (
            <div
              key={r.client_id}
              className="rounded-xl border border-white/10 bg-onyx-light/30 p-4 flex flex-wrap items-start gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="text-neutral-light text-[13px] font-medium truncate">
                    {r.company_name || r.full_name || r.email}
                  </h3>
                  <span
                    className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${LIFECYCLE_CLASSES[r.stage]}`}
                  >
                    {LIFECYCLE_LABELS[r.stage]}
                  </span>
                </div>
                <div className="text-neutral-500 text-[11px]">
                  {r.full_name && r.company_name ? `${r.full_name} · ` : ''}
                  {r.email}
                </div>
                <div className="text-neutral-600 text-[10.5px] mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {daysSinceSignup !== null && <span>{daysSinceSignup}j depuis inscription</span>}
                  <span>{r.active_subs} sub{r.active_subs > 1 ? 's' : ''} active{r.active_subs > 1 ? 's' : ''}</span>
                  {sentiment !== null && (
                    <span className={sentiment < -0.3 ? 'text-red-400' : sentiment > 0.3 ? 'text-emerald-400' : ''}>
                      sentiment ticket {sentiment.toFixed(2)}
                    </span>
                  )}
                  {r.last_outreach_at && (
                    <span>dernier outreach {timeAgoFr(r.last_outreach_at)}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {goal ? (
                  <button
                    type="button"
                    onClick={() => triggerOutreach(r.client_id, goal as OutreachGoal)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[11.5px] px-2.5 py-1.5 rounded-md transition"
                    title={`Demander à Customer Success Agent un draft d'email "${goal}"`}
                  >
                    {isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    Drafter outreach
                  </button>
                ) : (
                  <span className="text-neutral-600 text-[11px] italic">Pas d'action requise</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
