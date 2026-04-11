import { useState, useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { ErrorMonitorNav } from '../../components/error-monitor/ErrorMonitorNav';
import { ErrorStatsCards } from '../../components/error-monitor/ErrorStatsCards';
import { ErrorTable } from '../../components/error-monitor/ErrorTable';
import { ErrorDetailPanel } from '../../components/error-monitor/ErrorDetailPanel';
import { useErrorLogs, type ErrorLog } from '../../hooks/useErrorLogs';
import { useAppCatalog } from '../../../hooks/useAppCatalog';

export default function ErrorMonitorAppPage() {
  const { appSlug } = useParams<{ appSlug: string }>();
  const { appList, loading: appsLoading } = useAppCatalog();
  const activeApps = useMemo(
    () => appList.filter(a => a.status !== 'unavailable'),
    [appList],
  );

  const currentApp = useMemo(
    () => appList.find(a => a.id === appSlug),
    [appList, appSlug],
  );

  const { logs, loading, refetch } = useErrorLogs({ appId: appSlug });
  const [selected, setSelected] = useState<ErrorLog | null>(null);

  // Si l'app n'existe pas (et qu'on a fini de charger la liste) : redirect
  if (!appsLoading && appList.length > 0 && !currentApp) {
    return <Navigate to="/admin/error-monitor" replace />;
  }

  return (
    <div>
      {/* Header compact */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-gold dark:text-admin-accent" />
        <h1 className="text-neutral-text dark:text-admin-text text-lg font-bold">
          Error Monitor
        </h1>
        <span className="text-neutral-muted dark:text-admin-muted text-[12px]">
          · {currentApp?.name || appSlug}
        </span>
      </div>

      <ErrorMonitorNav apps={activeApps} loading={appsLoading} currentAppSlug={appSlug} />
      <ErrorStatsCards appId={appSlug} />
      <ErrorTable
        logs={logs}
        loading={loading}
        apps={activeApps}
        showAppColumn={false}
        lockedAppId={appSlug}
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
