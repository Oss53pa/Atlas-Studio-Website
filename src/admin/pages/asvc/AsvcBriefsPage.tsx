import { useState } from 'react';
import { Sunrise, Sunset, CalendarRange, AlertOctagon, ChevronDown, ChevronRight } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useBriefsHistory, timeAgoFr } from './hooks';
import type { CooBrief } from './types';

const BRIEF_ICONS = {
  morning: Sunrise,
  evening: Sunset,
  weekly: CalendarRange,
  alert: AlertOctagon,
} as const;

const BRIEF_LABELS = {
  morning: 'Matin',
  evening: 'Soir',
  weekly: 'Hebdo',
  alert: 'Alerte',
} as const;

const BRIEF_COLORS = {
  morning: 'text-admin-accent',
  evening: 'text-violet-300',
  weekly: 'text-blue-300',
  alert: 'text-red-300',
} as const;

type Filter = 'all' | 'morning' | 'evening' | 'weekly' | 'alert';

export default function AsvcBriefsPage() {
  const { briefs, loading } = useBriefsHistory(100);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = filter === 'all' ? briefs : briefs.filter((b) => b.brief_type === filter);

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="Historique briefs"
        subtitle="Tous les briefs produits par le COO Agent — consultable, exportable pour audit"
      />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {(['all', 'morning', 'evening', 'weekly', 'alert'] as const).map((f) => {
          const active = filter === f;
          const count = f === 'all' ? briefs.length : briefs.filter((b) => b.brief_type === f).length;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-[12px] border transition ${
                active
                  ? 'bg-admin-accent/15 text-admin-accent border-admin-accent/30'
                  : 'border-white/10 text-neutral-400 hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'Tout' : BRIEF_LABELS[f]}
              <span className="ml-1.5 opacity-70 text-[10px]">{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-onyx-light/20 py-12 px-6 text-center">
          <Sunrise size={20} className="text-neutral-600 mx-auto mb-2" />
          <p className="text-neutral-400 text-sm">Aucun brief pour ce filtre.</p>
          <p className="text-neutral-600 text-[11px] mt-1">
            Les briefs sont produits par le COO Agent. Déclenche-en un depuis le Hub.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((b) => (
          <BriefCard key={b.id} brief={b} />
        ))}
      </div>
    </div>
  );
}

function BriefCard({ brief }: { brief: CooBrief }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = BRIEF_ICONS[brief.brief_type] ?? Sunrise;
  const color = BRIEF_COLORS[brief.brief_type] ?? 'text-neutral-300';
  const label = BRIEF_LABELS[brief.brief_type] ?? brief.brief_type;

  const dateFmt = new Date(brief.brief_date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 text-left"
      >
        <Icon size={15} className={`${color} mt-0.5 flex-shrink-0`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className={`text-[10px] uppercase font-semibold ${color}`}>{label}</span>
            <span className="text-neutral-300 text-[13px] font-medium">{dateFmt}</span>
            <span className="text-neutral-600 text-[10.5px]">· créé {timeAgoFr(brief.created_at)}</span>
          </div>
          <div className="flex gap-3 text-[10.5px] text-neutral-500">
            {brief.arbitrations_pending > 0 && (
              <span>{brief.arbitrations_pending} arbitrages</span>
            )}
            {brief.arbitrations_urgent > 0 && (
              <span className="text-red-300">{brief.arbitrations_urgent} urgents</span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronDown size={14} className="text-neutral-500 mt-1" />
        ) : (
          <ChevronRight size={14} className="text-neutral-500 mt-1" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <p className="text-neutral-300 text-[13px] leading-relaxed whitespace-pre-line">
            {brief.summary}
          </p>
          {brief.kpis && Object.keys(brief.kpis).length > 0 && (
            <details className="mt-3">
              <summary className="text-neutral-500 text-[10.5px] cursor-pointer hover:text-neutral-300">
                Voir les KPIs source
              </summary>
              <pre className="text-[10px] text-neutral-400 font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto bg-black/30 p-2 rounded mt-1">
                {JSON.stringify(brief.kpis, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
