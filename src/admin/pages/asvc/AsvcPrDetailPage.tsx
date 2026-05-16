import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Code2, ExternalLink, FlaskConical, CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { supabase } from '../../../lib/supabase';
import { timeAgoFr } from './hooks';

interface PrRow {
  id: string;
  spec_id: string | null;
  github_pr_number: number | null;
  github_pr_url: string | null;
  repo: string;
  branch_name: string;
  title: string;
  description: string | null;
  files_changed: number;
  lines_added: number;
  lines_removed: number;
  qa_status: string;
  qa_report_url: string | null;
  tests_added: number;
  test_coverage_percent: number | null;
  status: string;
  preview_url: string | null;
  approved_by_ceo: boolean;
  approved_at: string | null;
  merged_at: string | null;
  created_at: string;
  updated_at: string;
}

interface TestRunRow {
  id: string;
  test_type: string;
  framework: string | null;
  total_tests: number;
  passed: number;
  failed: number;
  status: string;
  started_at: string;
  finished_at: string | null;
}

export default function AsvcPrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<PrRow | null>(null);
  const [tests, setTests] = useState<TestRunRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from('asvc_code_pull_requests').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('asvc_test_runs')
          .select('id, test_type, framework, total_tests, passed, failed, status, started_at, finished_at')
          .eq('pr_id', id)
          .order('started_at', { ascending: false }),
      ]);
      setPr((p as unknown as PrRow | null) ?? null);
      setTests((t as unknown as TestRunRow[] | null) ?? []);
      setLoading(false);
    })();
  }, [id]);

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
        title={pr?.title ?? 'Pull Request'}
        subtitle={pr ? `${pr.repo} · ${pr.branch_name}` : id ? `PR ${id.slice(0, 8)}…` : ''}
      />

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
      {!loading && !pr && <p className="text-neutral-500 text-sm">PR introuvable.</p>}

      {pr && (
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4 flex flex-wrap gap-4">
            <Stat label="Status" value={pr.status} />
            <Stat label="QA" value={pr.qa_status} accent={pr.qa_status === 'passed' ? 'emerald' : pr.qa_status === 'failed' ? 'red' : undefined} />
            <Stat label="Approuvée CEO" value={pr.approved_by_ceo ? 'Oui' : 'Non'} accent={pr.approved_by_ceo ? 'emerald' : undefined} />
            {pr.test_coverage_percent !== null && <Stat label="Coverage" value={`${pr.test_coverage_percent}%`} />}
            <Stat label="Fichiers" value={String(pr.files_changed)} />
            <Stat label="+/-" value={`+${pr.lines_added} / -${pr.lines_removed}`} />
            <Stat label="Tests ajoutés" value={String(pr.tests_added)} />
            <Stat label="Créée" value={timeAgoFr(pr.created_at)} />
          </section>

          {(pr.github_pr_url || pr.preview_url) && (
            <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
              <h3 className="text-neutral-light text-[12.5px] font-semibold mb-2">Liens externes</h3>
              <div className="flex flex-wrap gap-3 text-[12px]">
                {pr.github_pr_url && (
                  <a
                    href={pr.github_pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-admin-accent hover:underline"
                  >
                    <Code2 size={12} />
                    GitHub PR #{pr.github_pr_number}
                    <ExternalLink size={10} />
                  </a>
                )}
                {pr.preview_url && (
                  <a
                    href={pr.preview_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-admin-accent hover:underline"
                  >
                    <ExternalLink size={12} />
                    Preview deployment
                  </a>
                )}
              </div>
            </section>
          )}

          {pr.description && (
            <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
              <h3 className="text-neutral-light text-[12.5px] font-semibold mb-2">Description</h3>
              <pre className="text-[12px] text-neutral-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded max-h-96 overflow-auto">
                {pr.description}
              </pre>
            </section>
          )}

          {tests.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <FlaskConical size={14} className="text-admin-accent" />
                <h3 className="text-neutral-light text-[12.5px] font-semibold">
                  Test runs ({tests.length})
                </h3>
              </div>
              <div className="space-y-1.5">
                {tests.map((t) => (
                  <div key={t.id} className="rounded border border-white/5 bg-onyx-light/40 px-3 py-2 flex flex-wrap items-center gap-3 text-[11.5px]">
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                        t.status === 'passed'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : t.status === 'failed'
                            ? 'bg-red-500/15 text-red-300'
                            : 'bg-amber-500/15 text-admin-accent'
                      }`}
                    >
                      {t.status === 'passed' && <CheckCircle2 size={9} />}
                      {t.status}
                    </span>
                    <span className="text-neutral-300 font-mono">{t.test_type}</span>
                    {t.framework && <span className="text-neutral-500">{t.framework}</span>}
                    <span className="text-neutral-500">
                      {t.passed}/{t.total_tests} passed
                      {t.failed > 0 && <span className="text-red-300"> · {t.failed} failed</span>}
                    </span>
                    <span className="ml-auto text-neutral-600 text-[10.5px]">
                      {timeAgoFr(t.started_at)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pr.spec_id && (
            <Link
              to={`/admin/asvc/specs/${pr.spec_id}`}
              className="inline-flex items-center gap-1.5 text-admin-accent hover:underline text-[12px]"
            >
              <ExternalLink size={12} />
              Voir la spec source
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
