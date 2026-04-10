import { useState, useMemo } from 'react';
import { Search, Inbox } from 'lucide-react';
import { AdminTable } from '../AdminTable';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import type { ErrorLog, ErrorSeverity, ErrorStatus, ErrorLogFilters } from '../../hooks/useErrorLogs';
import type { AppRow } from '../../../lib/database.types';

interface ErrorTableProps {
  logs: ErrorLog[];
  loading: boolean;
  apps: AppRow[];
  showAppColumn?: boolean;
  /** Filtre app fixé (vue par app) — cache le filtre app dans la toolbar */
  lockedAppId?: string;
  onRowClick: (log: ErrorLog) => void;
  onFiltersChange?: (filters: ErrorLogFilters) => void;
}

const SEVERITIES: ErrorSeverity[] = ['critical', 'error', 'warning', 'info'];
const STATUSES: ErrorStatus[] = ['open', 'in_progress', 'resolved', 'ignored'];

const SEVERITY_LABELS: Record<ErrorSeverity, string> = {
  critical: 'Critical', error: 'Error', warning: 'Warning', info: 'Info',
};
const STATUS_LABELS: Record<ErrorStatus, string> = {
  open: 'Ouvertes', in_progress: 'En cours', resolved: 'Résolues', ignored: 'Ignorées',
};

function truncate(s: string, n = 80): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const days = Math.floor(h / 24);
  if (days < 7) return `il y a ${days} j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

export function ErrorTable({
  logs,
  loading,
  apps,
  showAppColumn = true,
  lockedAppId,
  onRowClick,
  onFiltersChange,
}: ErrorTableProps) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<ErrorSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ErrorStatus | 'all'>('all');
  const [appFilter, setAppFilter] = useState<string>('all');

  // Filtres locaux (côté client) — les gros filtres (app/date) passent par le hook
  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (severityFilter !== 'all' && log.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && log.status !== statusFilter) return false;
      if (!lockedAppId && appFilter !== 'all' && log.app_id !== appFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${log.message} ${log.component_name || ''} ${log.app_id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, severityFilter, statusFilter, appFilter, search, lockedAppId]);

  // Informer le parent des filtres (pour refetch serveur éventuel)
  useMemo(() => {
    onFiltersChange?.({
      appId: lockedAppId || (appFilter === 'all' ? undefined : appFilter),
      severities: severityFilter === 'all' ? [] : [severityFilter],
      statuses: statusFilter === 'all' ? [] : [statusFilter],
      search,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedAppId, appFilter, severityFilter, statusFilter, search]);

  const appsById = useMemo(() => {
    const m: Record<string, AppRow> = {};
    for (const a of apps) m[a.id] = a;
    return m;
  }, [apps]);

  const columns: Array<{
    key: string;
    label: string;
    sortable?: boolean;
    render?: (row: ErrorLog) => React.ReactNode;
    className?: string;
  }> = [
    {
      key: 'severity',
      label: 'Sévérité',
      render: (r) => <SeverityBadge severity={r.severity} />,
    },
    {
      key: 'message',
      label: 'Message',
      render: (r) => (
        <div className="max-w-md">
          <div className="text-[13px] text-neutral-text dark:text-admin-text font-medium truncate">
            {truncate(r.message, 80)}
          </div>
          {r.component_name && (
            <div className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono mt-0.5">
              {r.component_name}
            </div>
          )}
        </div>
      ),
    },
    ...(showAppColumn
      ? [{
          key: 'app_id',
          label: 'App',
          render: (r: ErrorLog) => {
            const app = appsById[r.app_id];
            return (
              <span className="text-[12px] text-neutral-body dark:text-admin-text">
                {app?.name || r.app_id}
              </span>
            );
          },
        }]
      : []),
    {
      key: 'component_name',
      label: 'Composant',
      render: (r) => (
        <span className="text-[12px] text-neutral-muted dark:text-admin-muted font-mono">
          {r.component_name || '—'}
        </span>
      ),
    },
    {
      key: 'occurrence_count',
      label: 'Occurrences',
      sortable: true,
      render: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-warm-bg dark:bg-admin-surface-alt text-[11px] font-mono font-semibold text-neutral-text dark:text-admin-text">
          {r.occurrence_count}×
        </span>
      ),
    },
    {
      key: 'last_seen_at',
      label: 'Dernière vue',
      sortable: true,
      render: (r) => (
        <span className="text-[11px] text-neutral-muted dark:text-admin-muted">
          {formatRelative(r.last_seen_at)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div>
      {/* Toolbar filtres */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-muted dark:text-admin-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un message..."
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-sm text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent transition-colors"
          />
        </div>

        <select
          value={severityFilter}
          onChange={e => setSeverityFilter(e.target.value as ErrorSeverity | 'all')}
          className="px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] text-neutral-text dark:text-admin-text outline-none cursor-pointer"
        >
          <option value="all">Toutes sévérités</option>
          {SEVERITIES.map(s => (
            <option key={s} value={s}>{SEVERITY_LABELS[s]}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ErrorStatus | 'all')}
          className="px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] text-neutral-text dark:text-admin-text outline-none cursor-pointer"
        >
          <option value="all">Tous statuts</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>

        {!lockedAppId && (
          <select
            value={appFilter}
            onChange={e => setAppFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[12px] text-neutral-text dark:text-admin-text outline-none cursor-pointer"
          >
            <option value="all">Toutes les apps</option>
            {apps.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        <div className="text-[12px] text-neutral-muted dark:text-admin-muted ml-auto">
          {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* Desktop : AdminTable */}
      <div className="hidden md:block">
        <AdminTable
          keyExtractor={(r: ErrorLog) => r.id}
          loading={loading}
          data={filtered}
          columns={columns}
          pageSize={25}
          pageSizeOptions={[25, 50, 100]}
          onRowClick={onRowClick}
          emptyMessage="Aucune erreur"
          emptyIcon={<Inbox size={32} />}
        />
      </div>

      {/* Mobile : liste de cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 animate-pulse h-24" />
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-muted dark:text-admin-muted text-sm">
            Aucune erreur
          </div>
        ) : (
          filtered.map(log => {
            const app = appsById[log.app_id];
            return (
              <button
                key={log.id}
                type="button"
                onClick={() => onRowClick(log)}
                className="w-full text-left bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4 hover:border-gold/40 dark:hover:border-admin-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <SeverityBadge severity={log.severity} />
                  <StatusBadge status={log.status} />
                </div>
                <div className="text-[13px] font-medium text-neutral-text dark:text-admin-text mb-1 line-clamp-2">
                  {log.message}
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-muted dark:text-admin-muted">
                  <span className="font-mono truncate">
                    {showAppColumn && (app?.name || log.app_id) + ' · '}
                    {log.component_name || '—'}
                  </span>
                  <span className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className="font-mono font-semibold">{log.occurrence_count}×</span>
                    <span>{formatRelative(log.last_seen_at)}</span>
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
