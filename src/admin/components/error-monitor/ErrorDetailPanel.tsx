import { useEffect, useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import { updateErrorStatus, type ErrorLog, type ErrorStatus } from '../../hooks/useErrorLogs';
import { useAuth } from '../../../lib/auth';

interface ErrorDetailPanelProps {
  log: ErrorLog | null;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_OPTIONS: Array<{ value: ErrorStatus; label: string }> = [
  { value: 'open',        label: 'Ouverte' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved',    label: 'Résolue' },
  { value: 'ignored',     label: 'Ignorée' },
];

export function ErrorDetailPanel({ log, onClose, onUpdated }: ErrorDetailPanelProps) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ErrorStatus>('open');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (log) {
      setStatus(log.status);
      setNote(log.resolution_note || '');
      setSaveError(null);
    }
  }, [log]);

  // Ferme le panel sur Escape
  useEffect(() => {
    if (!log) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [log, onClose]);

  if (!log) return null;

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const { error } = await updateErrorStatus(log.id, {
      status,
      resolution_note: note.trim() || null,
      resolved_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) {
      setSaveError(error);
      return;
    }
    onUpdated();
    onClose();
  };

  const handleCopyStack = async () => {
    if (!log.stack_trace) return;
    try {
      await navigator.clipboard.writeText(log.stack_trace);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className="fixed top-0 right-0 z-50 h-full w-full md:w-[600px] bg-white dark:bg-admin-surface border-l border-warm-border dark:border-admin-surface-alt shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="Détail de l'erreur"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-warm-border dark:border-admin-surface-alt gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <SeverityBadge severity={log.severity} size="md" />
              <StatusBadge status={log.status} />
              <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono">
                {log.environment}
              </span>
              {log.app_version && (
                <span className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono">
                  v{log.app_version}
                </span>
              )}
            </div>
            <h2 className="text-[15px] font-semibold text-neutral-text dark:text-admin-text leading-snug break-words">
              {log.message}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted flex-shrink-0"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <Field label="Occurrences" value={`${log.occurrence_count}×`} mono />
            <Field label="App" value={log.app_id} mono />
            <Field label="Première vue" value={new Date(log.first_seen_at).toLocaleString('fr-FR')} />
            <Field label="Dernière vue" value={new Date(log.last_seen_at).toLocaleString('fr-FR')} />
            {log.component_name && <Field label="Composant" value={log.component_name} mono />}
            {log.action_context && <Field label="Contexte" value={log.action_context} />}
            {log.url && <Field label="URL" value={log.url} mono truncate />}
          </div>

          {/* Stack trace */}
          {log.stack_trace && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted">
                  Stack trace
                </div>
                <button
                  type="button"
                  onClick={handleCopyStack}
                  className="inline-flex items-center gap-1 text-[11px] text-neutral-muted dark:text-admin-muted hover:text-gold dark:hover:text-admin-accent transition-colors"
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>
              <pre className="bg-warm-bg dark:bg-admin-surface-alt rounded-lg p-4 text-[11px] text-neutral-text dark:text-admin-text font-mono overflow-auto max-h-[320px] whitespace-pre-wrap break-words">
                {log.stack_trace}
              </pre>
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-2">
                Metadata
              </div>
              <pre className="bg-warm-bg dark:bg-admin-surface-alt rounded-lg p-4 text-[11px] text-neutral-text dark:text-admin-text font-mono overflow-auto max-h-[200px] whitespace-pre-wrap">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}

          {/* User agent */}
          {log.user_agent && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-1">
                User agent
              </div>
              <div className="text-[11px] text-neutral-muted dark:text-admin-muted font-mono break-all">
                {log.user_agent}
              </div>
            </div>
          )}
        </div>

        {/* Footer : résolution */}
        <div className="p-5 border-t border-warm-border dark:border-admin-surface-alt bg-warm-bg/30 dark:bg-admin-surface-alt/30 space-y-3">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted block mb-1.5">
              Statut
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ErrorStatus)}
              className="w-full px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent"
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted block mb-1.5">
              Note de résolution
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder="Cause, correctif, lien vers le ticket…"
              className="w-full px-3 py-2 bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-lg text-[13px] text-neutral-text dark:text-admin-text outline-none focus:border-gold dark:focus:border-admin-accent resize-y"
            />
          </div>

          {saveError && (
            <div className="text-[12px] text-red-500">{saveError}</div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-warm-border dark:border-admin-surface-alt text-[13px] font-medium text-neutral-body dark:text-admin-text hover:bg-warm-bg dark:hover:bg-admin-surface-alt transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gold dark:bg-admin-accent text-black text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function Field({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-muted dark:text-admin-muted mb-0.5">
        {label}
      </div>
      <div
        className={`text-neutral-text dark:text-admin-text ${mono ? 'font-mono' : ''} ${truncate ? 'truncate' : ''}`}
        title={truncate ? value : undefined}
      >
        {value}
      </div>
    </div>
  );
}
