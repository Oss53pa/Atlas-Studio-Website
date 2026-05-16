import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Rocket, ExternalLink, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { supabase } from '../../../lib/supabase';
import { timeAgoFr } from './hooks';

interface DeploymentRow {
  id: string;
  pr_id: string | null;
  environment: string;
  app_name: string;
  vercel_deployment_id: string | null;
  deployment_url: string | null;
  supabase_migrations: Array<{ file: string; status: string; notes: string }>;
  migration_dry_run_passed: boolean | null;
  migration_executed: boolean;
  rollback_plan: string | null;
  rollback_tested: boolean;
  previous_version_tag: string | null;
  status: string;
  error_rate_percent: number | null;
  alerts_triggered: number;
  monitoring_window_minutes: number;
  approved_by_ceo: boolean;
  approved_at: string | null;
  deployed_at: string | null;
  created_at: string;
}

interface IncidentRow {
  id: string;
  severity: string;
  title: string;
  description: string | null;
  status: string;
  detected_at: string;
  resolved_at: string | null;
}

export default function AsvcDeploymentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [deployment, setDeployment] = useState<DeploymentRow | null>(null);
  const [incidents, setIncidents] = useState<IncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: d }, { data: inc }] = await Promise.all([
        supabase.from('asvc_deployments').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('asvc_production_incidents')
          .select('id, severity, title, description, status, detected_at, resolved_at')
          .eq('related_deployment_id', id)
          .order('detected_at', { ascending: false }),
      ]);
      setDeployment((d as unknown as DeploymentRow | null) ?? null);
      setIncidents((inc as unknown as IncidentRow[] | null) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const envColor = (env: string) =>
    env === 'production'
      ? 'border-red-500/40 bg-red-500/10 text-red-200'
      : env === 'staging'
        ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
        : 'border-blue-500/40 bg-blue-500/10 text-blue-300';

  return (
    <div className="max-w-5xl">
      <Link
        to="/admin/asvc/pipeline"
        className="inline-flex items-center gap-1.5 text-neutral-500 hover:text-neutral-300 text-[12px] mb-4 transition"
      >
        <ArrowLeft size={13} />
        Retour au Pipeline
      </Link>

      <AdminPageHeader
        title={deployment ? `Deploy ${deployment.app_name}` : 'Déploiement'}
        subtitle={deployment ? `${deployment.environment.toUpperCase()} · ${deployment.status}` : id ? `Deploy ${id.slice(0, 8)}…` : ''}
      />

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
      {!loading && !deployment && <p className="text-neutral-500 text-sm">Déploiement introuvable.</p>}

      {deployment && (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4 flex flex-wrap gap-4">
            <div className="text-[11.5px]">
              <div className="text-neutral-500 text-[10.5px]">Environnement</div>
              <div className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] uppercase font-semibold ${envColor(deployment.environment)}`}>
                {deployment.environment}
              </div>
            </div>
            <Stat label="Statut" value={deployment.status} accent={deployment.status === 'success' ? 'emerald' : deployment.status === 'failed' || deployment.status === 'rolled_back' ? 'red' : 'amber'} />
            <Stat label="App" value={deployment.app_name} />
            <Stat label="CEO approved" value={deployment.approved_by_ceo ? 'Oui' : 'Non'} accent={deployment.approved_by_ceo ? 'emerald' : undefined} />
            {deployment.deployed_at && <Stat label="Déployé" value={timeAgoFr(deployment.deployed_at)} />}
            {deployment.error_rate_percent !== null && (
              <Stat
                label="error_rate"
                value={`${deployment.error_rate_percent.toFixed(2)}/min`}
                accent={deployment.error_rate_percent > 0.5 ? 'red' : undefined}
              />
            )}
            {deployment.alerts_triggered > 0 && (
              <Stat label="Alertes" value={String(deployment.alerts_triggered)} accent="red" />
            )}
          </section>

          {deployment.deployment_url && (
            <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
              <a
                href={deployment.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-admin-accent hover:underline text-[13px]"
              >
                <Rocket size={13} />
                Ouvrir le déploiement
                <ExternalLink size={11} />
              </a>
            </section>
          )}

          {/* Migrations */}
          {deployment.supabase_migrations && deployment.supabase_migrations.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
              <h3 className="text-neutral-light text-[12.5px] font-semibold mb-2">
                Migrations Supabase ({deployment.supabase_migrations.length})
              </h3>
              <div className="space-y-1">
                {deployment.supabase_migrations.map((m, i) => (
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
              <div className="flex gap-3 mt-2 text-[10.5px] text-neutral-500">
                <span>Dry-run: {deployment.migration_dry_run_passed ? '✓' : '✗'}</span>
                <span>Exécutées: {deployment.migration_executed ? '✓' : '✗'}</span>
              </div>
            </section>
          )}

          {/* Rollback */}
          {deployment.rollback_plan && (
            <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
              <h3 className="text-neutral-light text-[12.5px] font-semibold mb-2">Plan de rollback</h3>
              {deployment.previous_version_tag && (
                <div className="text-neutral-400 text-[11.5px] mb-2">
                  Tag previous : <code className="text-admin-accent font-mono">{deployment.previous_version_tag}</code>
                </div>
              )}
              <pre className="text-[11px] text-neutral-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded max-h-72 overflow-auto">
                {deployment.rollback_plan}
              </pre>
            </section>
          )}

          {/* Incidents liés */}
          {incidents.length > 0 && (
            <section className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertOctagon size={14} className="text-red-300" />
                <h3 className="text-red-200 text-[12.5px] font-semibold">
                  Incidents liés ({incidents.length})
                </h3>
              </div>
              <div className="space-y-2">
                {incidents.map((inc) => (
                  <div key={inc.id} className="rounded border border-red-500/20 bg-onyx-light/30 px-3 py-2 text-[11.5px]">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-red-300 font-semibold">{inc.severity}</span>
                      <span className="text-neutral-300">{inc.title}</span>
                      <span className="ml-auto text-neutral-600 text-[10.5px]">{timeAgoFr(inc.detected_at)}</span>
                    </div>
                    {inc.description && <p className="text-neutral-400 text-[11px]">{inc.description}</p>}
                    <div className="text-neutral-500 text-[10.5px] mt-0.5">Status : {inc.status}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {deployment.pr_id && (
            <Link
              to={`/admin/asvc/prs/${deployment.pr_id}`}
              className="inline-flex items-center gap-1.5 text-admin-accent hover:underline text-[12px]"
            >
              <ExternalLink size={12} />
              Voir la PR source
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'emerald' | 'amber' | 'red' }) {
  const cls = accent === 'emerald'
    ? 'text-emerald-300'
    : accent === 'amber'
      ? 'text-admin-accent'
      : accent === 'red'
        ? 'text-red-300'
        : 'text-neutral-300';
  return (
    <div className="text-[11.5px]">
      <div className="text-neutral-500 text-[10.5px]">{label}</div>
      <div className={`font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
