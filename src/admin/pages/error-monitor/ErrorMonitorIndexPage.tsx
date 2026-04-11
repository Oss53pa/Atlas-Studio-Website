import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ErrorMonitorNav } from '../../components/error-monitor/ErrorMonitorNav';
import { ErrorStatsCards } from '../../components/error-monitor/ErrorStatsCards';
import { ErrorTable } from '../../components/error-monitor/ErrorTable';
import { ErrorDetailPanel } from '../../components/error-monitor/ErrorDetailPanel';
import { useErrorLogs, type ErrorLog } from '../../hooks/useErrorLogs';
import { useAppCatalog } from '../../../hooks/useAppCatalog';

export default function ErrorMonitorIndexPage() {
  const { appList, loading: appsLoading } = useAppCatalog();
  const activeApps = appList.filter(a => a.status !== 'unavailable');

  const { logs, loading, refetch } = useErrorLogs({});
  const [selected, setSelected] = useState<ErrorLog | null>(null);

  return (
    <div>
      {/* Header compact */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-gold dark:text-admin-accent" />
        <h1 className="text-neutral-text dark:text-admin-text text-lg font-bold">
          Error Monitor
        </h1>
        <span className="text-neutral-muted dark:text-admin-muted text-[12px]">
          · Toutes les applications
        </span>
      </div>

      <ErrorMonitorNav apps={activeApps} loading={appsLoading} />
      <ErrorStatsCards />
      <ErrorTable
        logs={logs}
        loading={loading}
        apps={activeApps}
        showAppColumn
        onRowClick={setSelected}
      />

      <ErrorDetailPanel
        log={selected}
        onClose={() => setSelected(null)}
        onUpdated={() => { void refetch(); }}
      />
    </div>
  );
}
