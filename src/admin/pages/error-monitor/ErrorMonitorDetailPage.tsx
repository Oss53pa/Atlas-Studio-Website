import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { SeverityBadge } from '../../components/error-monitor/SeverityBadge';
import { StatusBadge } from '../../components/error-monitor/StatusBadge';
import { ErrorDetailPanel } from '../../components/error-monitor/ErrorDetailPanel';
import type { ErrorLog } from '../../hooks/useErrorLogs';

/**
 * Page standalone pour le détail d'une erreur, accessible via URL directe.
 * Utile pour partager un lien vers une erreur précise.
 */
export default function ErrorMonitorDetailPage() {
  const { appSlug, errorId } = useParams<{ appSlug: string; errorId: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<ErrorLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchLog = async () => {
    if (!errorId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('error_logs')
      .select('*')
      .eq('id', errorId)
      .maybeSingle();

    if (error || !data) {
      setNotFound(true);
    } else {
      setLog(data as ErrorLog);
    }
    setLoading(false);
  };

  useEffect(() => { void fetchLog(); }, [errorId]);

  const backHref = appSlug ? `/admin/error-monitor/${appSlug}` : '/admin/error-monitor';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-neutral-muted dark:text-admin-muted text-sm">Chargement…</div>
      </div>
    );
  }

  if (notFound || !log) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <h2 className="text-xl font-semibold text-neutral-text dark:text-admin-text mb-2">
          Erreur introuvable
        </h2>
        <p className="text-sm text-neutral-muted dark:text-admin-muted mb-6">
          Cette erreur n'existe plus ou a été supprimée.
        </p>
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold dark:bg-admin-accent text-black text-sm font-semibold"
        >
          <ArrowLeft size={14} /> Retour
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        to={backHref}
        className="inline-flex items-center gap-2 text-[12px] text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Retour à la liste
      </Link>

      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-2xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <SeverityBadge severity={log.severity} size="md" />
          <StatusBadge status={log.status} />
          <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono">
            {log.environment}
          </span>
          <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono ml-auto">
            {log.occurrence_count}× · dernière vue {new Date(log.last_seen_at).toLocaleString('fr-FR')}
          </span>
        </div>
        <h1 className="text-lg font-semibold text-neutral-text dark:text-admin-text leading-snug break-words mb-1">
          {log.message}
        </h1>
        {log.component_name && (
          <div className="text-[12px] text-neutral-muted dark:text-admin-muted font-mono">
            {log.component_name}
          </div>
        )}
      </div>

      {/* Panel latéral ouvert automatiquement */}
      <ErrorDetailPanel
        log={log}
        onClose={() => navigate(backHref)}
        onUpdated={fetchLog}
      />
    </div>
  );
}
