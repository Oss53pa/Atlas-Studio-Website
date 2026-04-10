import { useState } from 'react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
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
      <AdminPageHeader
        title="Error Monitor — Toutes les applications"
        subtitle="Vue consolidée des erreurs remontées par les apps Atlas Studio"
      />

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
