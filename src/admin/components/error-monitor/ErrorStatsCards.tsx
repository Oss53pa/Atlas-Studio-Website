import { AlertTriangle, Activity, CheckCircle2, Calendar } from 'lucide-react';
import { useErrorStats } from '../../hooks/useErrorStats';
import type { ErrorSeverity } from '../../hooks/useErrorLogs';

interface ErrorStatsCardsProps {
  appId?: string;
}

interface CardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: 'danger' | 'warning' | 'success' | 'neutral';
  hint?: string;
}

function StatCard({ label, value, icon, accent = 'neutral', hint }: CardProps) {
  const accentClass =
    accent === 'danger'
      ? 'text-red-500'
      : accent === 'warning'
        ? 'text-amber-500'
        : accent === 'success'
          ? 'text-green-500'
          : 'text-gold dark:text-admin-accent';

  return (
    <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">
          {label}
        </div>
        <div className={accentClass}>{icon}</div>
      </div>
      <div className="text-2xl font-bold text-neutral-text dark:text-admin-text">{value}</div>
      {hint && (
        <div className="text-[11px] text-neutral-muted dark:text-admin-muted mt-1">{hint}</div>
      )}
    </div>
  );
}

const SEVERITY_COLORS: Record<ErrorSeverity, string> = {
  critical: 'bg-[#E24B4A]',
  error:    'bg-[#EF9F27]',
  warning:  'bg-[#FAC775]',
  info:     'bg-[#378ADD]',
};

const SEVERITY_LABELS: Record<ErrorSeverity, string> = {
  critical: 'Critical',
  error:    'Error',
  warning:  'Warning',
  info:     'Info',
};

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
    <div className="space-y-5 mb-7">
      {/* Cards principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total erreurs"
          value={loading ? '—' : stats.total}
          icon={<Activity size={18} strokeWidth={1.8} />}
        />
        <StatCard
          label="Critiques actives"
          value={loading ? '—' : stats.critical}
          icon={<AlertTriangle size={18} strokeWidth={1.8} />}
          accent={stats.critical > 0 ? 'danger' : 'neutral'}
          hint={stats.critical > 0 ? 'Intervention requise' : 'Tout est calme'}
        />
        <StatCard
          label="Taux de résolution"
          value={loading ? '—' : `${stats.resolutionRate}%`}
          icon={<CheckCircle2 size={18} strokeWidth={1.8} />}
          accent="success"
          hint={`${stats.resolved} / ${stats.total || 0} résolues`}
        />
        <StatCard
          label="Aujourd'hui"
          value={loading ? '—' : stats.today}
          icon={<Calendar size={18} strokeWidth={1.8} />}
          accent={stats.today > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Distribution par sévérité + 7 derniers jours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-2xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-4">
            Distribution par sévérité
          </div>
          <div className="space-y-3">
            {(['critical','error','warning','info'] as ErrorSeverity[]).map(sev => {
              const count = stats.bySeverity[sev];
              const pct = Math.round((count / maxSeverity) * 100);
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-medium text-neutral-text dark:text-admin-text">
                      {SEVERITY_LABELS[sev]}
                    </span>
                    <span className="text-[12px] font-mono text-neutral-muted dark:text-admin-muted">
                      {count}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-warm-bg dark:bg-admin-surface-alt overflow-hidden">
                    <div
                      className={`h-full ${SEVERITY_COLORS[sev]} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-2xl p-5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-4">
            7 derniers jours
          </div>
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.dailyLast7.map(d => {
              const heightPct = (d.count / maxDaily) * 100;
              const day = new Date(d.date).toLocaleDateString('fr-FR', { weekday: 'short' });
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <div className="text-[10px] font-mono text-neutral-muted dark:text-admin-muted">
                    {d.count}
                  </div>
                  <div
                    className="w-full bg-gold/70 dark:bg-admin-accent/70 rounded-t transition-all duration-500"
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                    aria-label={`${d.count} erreurs le ${d.date}`}
                  />
                  <div className="text-[10px] text-neutral-muted dark:text-admin-muted capitalize">
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
