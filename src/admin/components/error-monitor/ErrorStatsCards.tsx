import { AlertTriangle, Activity, CheckCircle2, Calendar } from 'lucide-react';
import { useErrorStats } from '../../hooks/useErrorStats';
import type { ErrorSeverity } from '../../hooks/useErrorLogs';

interface ErrorStatsCardsProps {
  appId?: string;
}

const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  critical: 'bg-[#E24B4A]',
  error:    'bg-[#EF9F27]',
  warning:  'bg-[#FAC775]',
  info:     'bg-[#378ADD]',
};

const SEVERITY_LABELS: Record<ErrorSeverity, string> = {
  critical: 'Crit', error: 'Err', warning: 'Warn', info: 'Info',
};

interface StatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'danger' | 'warning' | 'success' | 'neutral';
}

function Stat({ label, value, icon, accent = 'neutral' }: StatProps) {
  const accentClass =
    accent === 'danger'   ? 'text-red-500' :
    accent === 'warning'  ? 'text-amber-500' :
    accent === 'success'  ? 'text-green-500' :
                            'text-gold dark:text-admin-accent';
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl">
      <div className={`${accentClass} flex-shrink-0`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted leading-none mb-1">
          {label}
        </div>
        <div className="text-lg font-bold text-neutral-text dark:text-admin-text leading-none">
          {value}
        </div>
      </div>
    </div>
  );
}

export function ErrorStatsCards({ appId }: ErrorStatsCardsProps) {
  const { stats, loading } = useErrorStats(appId);

  const maxSeverity = Math.max(
    stats.bySeverity.critical,
    stats.bySeverity.error,
    stats.bySeverity.warning,
    stats.bySeverity.info,
    1,
  );
  const maxDaily = Math.max(...stats.dailyLast7.map(d => d.count), 1);

  return (
    <div className="mb-5">
      {/* Ligne compacte : 4 stats + distribution sévérité + sparkline 7j, tout sur une grille */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <Stat
          label="Total"
          value={loading ? '—' : stats.total}
          icon={<Activity size={18} strokeWidth={1.8} />}
        />
        <Stat
          label="Critiques actives"
          value={loading ? '—' : stats.critical}
          icon={<AlertTriangle size={18} strokeWidth={1.8} />}
          accent={stats.critical > 0 ? 'danger' : 'neutral'}
        />
        <Stat
          label="Résolution"
          value={loading ? '—' : `${stats.resolutionRate}%`}
          icon={<CheckCircle2 size={18} strokeWidth={1.8} />}
          accent="success"
        />
        <Stat
          label="Aujourd'hui"
          value={loading ? '—' : stats.today}
          icon={<Calendar size={18} strokeWidth={1.8} />}
          accent={stats.today > 0 ? 'warning' : 'neutral'}
        />

        {/* Distribution par sévérité — barres horizontales fines */}
        <div className="col-span-2 md:col-span-2 xl:col-span-1 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-2 leading-none">
            Sévérité
          </div>
          <div className="space-y-1">
            {(['critical','error','warning','info'] as ErrorSeverity[]).map(sev => {
              const count = stats.bySeverity[sev];
              const pct = Math.round((count / maxSeverity) * 100);
              return (
                <div key={sev} className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold text-neutral-muted dark:text-admin-muted w-7 uppercase">
                    {SEVERITY_LABELS[sev]}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-warm-bg dark:bg-admin-surface-alt overflow-hidden">
                    <div
                      className={`h-full ${SEVERITY_COLORS[sev]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-neutral-muted dark:text-admin-muted w-6 text-right">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sparkline 7 derniers jours */}
        <div className="col-span-2 md:col-span-2 xl:col-span-1 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-2 leading-none">
            7 derniers jours
          </div>
          <div className="flex items-end justify-between gap-1 h-10">
            {stats.dailyLast7.map(d => {
              const heightPct = (d.count / maxDaily) * 100;
              const day = new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'narrow' });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-0.5 h-full" title={`${d.count} erreurs le ${d.date}`}>
                  <div
                    className="w-full bg-gold/70 dark:bg-admin-accent/70 rounded-t transition-all duration-500"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    aria-label={`${d.count} erreurs le ${d.date}`}
                  />
                  <div className="text-[8px] text-neutral-muted dark:text-admin-muted uppercase leading-none">
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
