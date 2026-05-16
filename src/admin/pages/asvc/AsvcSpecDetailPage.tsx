import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, CheckCircle2 } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { supabase } from '../../../lib/supabase';
import { timeAgoFr } from './hooks';

interface SpecRow {
  id: string;
  opportunity_id: string | null;
  spec_version: string;
  title: string;
  vision: string | null;
  user_stories: Array<{ role: string; goal: string; benefit: string; story_points?: number }>;
  acceptance_criteria: Array<{ story_idx?: number; given: string; when: string; then: string }>;
  technical_architecture: string | null;
  wireframes_mermaid: string | null;
  api_endpoints: Array<Record<string, unknown>>;
  database_schema: string | null;
  story_points: number | null;
  estimated_weeks: number | null;
  markdown_content: string;
  status: string;
  approved_by_ceo: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function AsvcSpecDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [spec, setSpec] = useState<SpecRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error: err } = await supabase
        .from('asvc_product_specs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (err) setError(err.message);
      else setSpec((data as unknown as SpecRow | null) ?? null);
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
        title={spec?.title ?? 'Spec produit'}
        subtitle={
          spec
            ? `v${spec.spec_version} · ${spec.story_points ?? '?'} SP · ${spec.estimated_weeks ?? '?'}sem`
            : id
              ? `Spec ${id.slice(0, 8)}…`
              : ''
        }
      />

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
      {error && (
        <p className="text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2">{error}</p>
      )}
      {!loading && !spec && (
        <p className="text-neutral-500 text-sm">Spec introuvable.</p>
      )}

      {spec && (
        <div className="space-y-6">
          {/* Header info */}
          <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4 flex flex-wrap gap-4">
            <Stat label="Statut" value={spec.status} accent={spec.status === 'approved' ? 'emerald' : 'amber'} />
            <Stat label="Approuvée CEO" value={spec.approved_by_ceo ? 'Oui' : 'Non'} accent={spec.approved_by_ceo ? 'emerald' : undefined} />
            {spec.approved_at && <Stat label="Approuvée" value={timeAgoFr(spec.approved_at)} />}
            <Stat label="Story points" value={String(spec.story_points ?? '?')} />
            <Stat label="Effort estimé" value={`${spec.estimated_weeks ?? '?'} sem`} />
            <Stat label="Créée" value={timeAgoFr(spec.created_at)} />
          </section>

          {/* Vision */}
          {spec.vision && (
            <Section title="Vision" Icon={FileText}>
              <p className="text-neutral-300 text-[13px] leading-relaxed">{spec.vision}</p>
            </Section>
          )}

          {/* User stories */}
          {spec.user_stories && spec.user_stories.length > 0 && (
            <Section title={`User stories (${spec.user_stories.length})`} Icon={CheckCircle2}>
              <div className="space-y-2">
                {spec.user_stories.map((s, i) => (
                  <div key={i} className="border-l-2 border-admin-accent/30 pl-3 py-1">
                    <div className="text-neutral-300 text-[12.5px]">
                      <strong className="text-admin-accent">As a {s.role}</strong>,{' '}
                      I want {s.goal}, so that {s.benefit}.
                    </div>
                    {s.story_points !== undefined && (
                      <div className="text-neutral-600 text-[10.5px] mt-0.5">
                        {s.story_points} SP
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Acceptance criteria */}
          {spec.acceptance_criteria && spec.acceptance_criteria.length > 0 && (
            <Section title="Acceptance criteria" Icon={CheckCircle2}>
              <div className="space-y-2">
                {spec.acceptance_criteria.map((ac, i) => (
                  <div key={i} className="rounded border border-white/5 bg-onyx-light/40 p-2.5 text-[12px]">
                    <div className="text-neutral-500 text-[10.5px] mb-1">
                      Story #{ac.story_idx ?? i + 1}
                    </div>
                    <div className="text-neutral-300">
                      <strong className="text-blue-300">GIVEN</strong> {ac.given}<br />
                      <strong className="text-blue-300">WHEN</strong> {ac.when}<br />
                      <strong className="text-blue-300">THEN</strong> {ac.then}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Technical architecture */}
          {spec.technical_architecture && (
            <Section title="Architecture technique" Icon={FileText}>
              <pre className="text-[11.5px] text-neutral-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded max-h-96 overflow-auto">
                {spec.technical_architecture}
              </pre>
            </Section>
          )}

          {/* Wireframes Mermaid */}
          {spec.wireframes_mermaid && (
            <Section title="Wireframes (Mermaid)" Icon={FileText}>
              <pre className="text-[11px] text-neutral-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded overflow-auto">
                {spec.wireframes_mermaid}
              </pre>
              <p className="text-neutral-600 text-[10.5px] mt-2 italic">
                Coller dans mermaid.live ou Notion pour visualiser.
              </p>
            </Section>
          )}

          {/* API endpoints */}
          {spec.api_endpoints && spec.api_endpoints.length > 0 && (
            <Section title={`API endpoints (${spec.api_endpoints.length})`} Icon={FileText}>
              <pre className="text-[11px] text-neutral-300 font-mono bg-black/30 p-3 rounded overflow-auto max-h-72">
                {JSON.stringify(spec.api_endpoints, null, 2)}
              </pre>
            </Section>
          )}

          {/* Database schema */}
          {spec.database_schema && (
            <Section title="Database schema (DDL)" Icon={FileText}>
              <pre className="text-[11px] text-neutral-300 font-mono bg-black/30 p-3 rounded overflow-auto max-h-96">
                {spec.database_schema}
              </pre>
            </Section>
          )}

          {/* Markdown complet */}
          <Section title="Spec Markdown complet" Icon={FileText} collapsed>
            <pre className="text-[11.5px] text-neutral-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded max-h-[600px] overflow-auto">
              {spec.markdown_content}
            </pre>
          </Section>
        </div>
      )}
    </div>
  );
}

function Section({
  title, Icon, children, collapsed = false,
}: {
  title: string;
  Icon: typeof FileText;
  children: React.ReactNode;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 mb-2 text-left"
      >
        <Icon size={14} className="text-admin-accent" />
        <h3 className="text-neutral-light text-[12.5px] font-semibold">{title}</h3>
        <span className="ml-auto text-neutral-600 text-[11px]">{open ? '−' : '+'}</span>
      </button>
      {open && children}
    </section>
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
