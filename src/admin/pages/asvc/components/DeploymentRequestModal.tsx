import { useState } from 'react';
import { Rocket, X as XIcon, AlertOctagon, CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import type { AgentActionWithAgent } from '../types';

interface Props {
  action: AgentActionWithAgent;
  onConfirm: (id: string) => Promise<void>;
  onCancel: () => void;
}

interface DeploymentPayload {
  deployment_id?: string;
  pr_id?: string;
  environment?: string;
  app_name?: string;
  previous_version_tag?: string;
  migrations_dry_run?: Array<{ file: string; status: string; notes: string }>;
  rollback_plan_markdown?: string;
  monitoring_plan?: {
    window_minutes?: number;
    error_rate_threshold_percent?: number;
    alerts?: string[];
  };
  deploy_window?: { recommended?: string; blocked_reason?: string | null };
  go_no_go?: string;
  blockers?: string[];
  typed_confirmation_phrase?: string | null;
  requires_typed_confirmation?: boolean;
}

interface RollbackPayload {
  deployment_id?: string;
  app_name?: string;
  incident_id?: string;
  error_rate?: number;
  top_issue?: { title: string; permalink: string; count: number; level: string } | null;
  sentry_org?: string;
}

export function DeploymentRequestModal({ action, onConfirm, onCancel }: Props) {
  const isRollback = action.action_type === 'trigger_rollback';
  const payload = (action.proposed_payload ?? {}) as DeploymentPayload & RollbackPayload;

  const expectedPhrase = isRollback
    ? `ROLLBACK ${(payload.app_name ?? '').toUpperCase()}`
    : (payload.typed_confirmation_phrase ?? `DEPLOY ${(payload.app_name ?? '').toUpperCase()}`);

  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canConfirm = confirmation.trim() === expectedPhrase;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm(action.id);
    } finally {
      setSubmitting(false);
    }
  };

  const borderColor = isRollback ? 'border-red-500/50' : 'border-violet-500/50';
  const headerColor = isRollback ? 'text-red-300' : 'text-violet-300';
  const buttonBg = isRollback
    ? 'bg-red-500/30 hover:bg-red-500/40 text-red-100 border-red-500/40'
    : 'bg-violet-500/30 hover:bg-violet-500/40 text-violet-100 border-violet-500/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-onyx border ${borderColor} rounded-2xl p-6`}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {isRollback ? <AlertOctagon size={18} className={headerColor} /> : <Rocket size={18} className={headerColor} />}
            <h2 className={`text-base font-semibold ${headerColor}`}>
              {isRollback
                ? `🚨 ROLLBACK production — ${payload.app_name}`
                : `🟣 Deploy production — ${payload.app_name}`}
            </h2>
          </div>
          <button type="button" onClick={onCancel} className="text-neutral-500 hover:text-neutral-300">
            <XIcon size={16} />
          </button>
        </div>

        <p className="text-neutral-400 text-[12.5px] mb-5">{action.description}</p>

        {/* Bloqueurs */}
        {payload.blockers && payload.blockers.length > 0 && (
          <section className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="text-red-200 text-[12px] font-semibold mb-1">🚨 Bloqueurs détectés</div>
            <ul className="text-red-200/80 text-[11.5px] list-disc list-inside">
              {payload.blockers.map((b, i) => <li key={i}>{b}</li>)}
            </ul>
          </section>
        )}

        {/* Go/no-go server */}
        {payload.go_no_go === 'no_go' && (
          <section className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="text-red-200 text-[12px]">
              ⛔ Le serveur recommande <strong>NO-GO</strong> sur ce déploiement.
              La validation forcée reste possible mais déconseillée.
            </div>
          </section>
        )}

        {/* Window de déploiement */}
        {!isRollback && payload.deploy_window && (
          <Section title="🗓 Fenêtre de déploiement">
            <KV label="Recommandée" value={payload.deploy_window.recommended ?? 'n/a'} />
            {payload.deploy_window.blocked_reason && (
              <KV label="Bloquée" value={payload.deploy_window.blocked_reason} accent="red" />
            )}
          </Section>
        )}

        {/* Migrations dry-run */}
        {!isRollback && payload.migrations_dry_run && payload.migrations_dry_run.length > 0 && (
          <Section title="🗃 Migrations Supabase (dry-run)">
            <div className="space-y-1">
              {payload.migrations_dry_run.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-[11.5px]">
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                      m.status === 'ok'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : m.status === 'warning'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-red-500/15 text-red-300'
                    }`}
                  >
                    {m.status === 'ok' ? <CheckCircle2 size={10} /> : <AlertOctagon size={10} />}
                    {m.status}
                  </span>
                  <span className="text-neutral-300 font-mono">{m.file}</span>
                  {m.notes && <span className="text-neutral-500 text-[10.5px]">{m.notes}</span>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Plan rollback */}
        {!isRollback && payload.rollback_plan_markdown && (
          <Section title="🔄 Plan de rollback">
            <pre className="text-[11px] text-neutral-300 whitespace-pre-wrap font-mono bg-black/40 p-3 rounded max-h-48 overflow-auto">
              {payload.rollback_plan_markdown}
            </pre>
            {payload.previous_version_tag && (
              <KV label="Tag previous" value={payload.previous_version_tag} />
            )}
          </Section>
        )}

        {/* Monitoring */}
        {!isRollback && payload.monitoring_plan && (
          <Section title="⏱ Monitoring post-deploy">
            <KV label="Fenêtre" value={`${payload.monitoring_plan.window_minutes ?? 30} minutes`} />
            <KV
              label="Seuil error_rate"
              value={`${payload.monitoring_plan.error_rate_threshold_percent ?? 5}% → rollback auto`}
            />
          </Section>
        )}

        {/* Rollback-specific: Sentry context */}
        {isRollback && payload.top_issue && (
          <Section title="🛡 Top issue Sentry">
            <KV label="Titre" value={payload.top_issue.title} />
            <KV label="Niveau" value={payload.top_issue.level} accent="red" />
            <KV label="Occurrences" value={String(payload.top_issue.count)} />
            <a
              href={payload.top_issue.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-admin-accent hover:underline text-[11.5px] mt-1"
            >
              <ExternalLink size={11} /> Voir sur Sentry
            </a>
          </Section>
        )}

        {isRollback && payload.error_rate !== undefined && (
          <Section title="📈 Métriques détectées">
            <KV label="error_rate (events/min)" value={payload.error_rate.toFixed(3)} accent="red" />
          </Section>
        )}

        {/* Confirmation typée */}
        <div className="mt-5 rounded-lg border border-white/10 bg-onyx-light/50 p-4">
          <div className="text-neutral-light text-[12px] font-semibold mb-2">
            ⚠️ Confirmation requise
          </div>
          <p className="text-neutral-400 text-[11.5px] mb-2">
            Tape exactement <code className="text-admin-accent font-mono">{expectedPhrase}</code> ci-dessous pour autoriser{' '}
            {isRollback ? "l'exécution du rollback" : 'le déploiement production'}.
          </p>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={expectedPhrase}
            autoComplete="off"
            spellCheck={false}
            className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-[13px] text-neutral-light font-mono outline-none focus:border-violet-500/40"
          />
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-2 border border-white/10 text-neutral-300 hover:bg-white/5 text-[12px] rounded-lg"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className={`inline-flex items-center gap-1.5 border font-semibold text-[12px] px-4 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed ${buttonBg}`}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : isRollback ? <AlertOctagon size={13} /> : <Rocket size={13} />}
            {isRollback ? 'Confirmer le rollback' : 'Approuver le déploiement'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="text-neutral-500 text-[10.5px] uppercase tracking-wider font-semibold mb-2">{title}</h3>
      <div className="rounded-lg border border-white/5 bg-onyx-light/30 p-3 space-y-1">{children}</div>
    </section>
  );
}

function KV({ label, value, accent }: { label: string; value: string; accent?: 'red' | 'green' }) {
  const cls = accent === 'red' ? 'text-red-300' : accent === 'green' ? 'text-emerald-300' : 'text-neutral-300';
  return (
    <div className="flex items-baseline gap-2 text-[11.5px]">
      <span className="text-neutral-500 min-w-[140px]">{label}</span>
      <span className={`font-mono ${cls}`}>{value}</span>
    </div>
  );
}
