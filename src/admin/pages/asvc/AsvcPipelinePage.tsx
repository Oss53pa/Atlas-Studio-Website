import { useState } from 'react';
import {
  Lightbulb, Microscope, FileText, Code2, FlaskConical, Rocket,
  AlertOctagon, Plus, Loader2, AlertCircle, X as XIcon, Sparkles,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { usePipelineSummary, timeAgoFr } from './hooks';
import {
  SIGNAL_SOURCE_LABELS,
  type SignalSource,
  type PipelineIdea,
  type PipelineResearch,
  type PipelineSpec,
  type PipelinePr,
  type PipelineDeployment,
  type PipelineIncident,
} from './types';

export default function AsvcPipelinePage() {
  const {
    summary,
    loading,
    error,
    pending,
    actionError,
    detectSignal,
    launchResearch,
    draftSpec,
    draftDev,
    runQa,
    prepareDeploy,
  } = usePipelineSummary();

  const [signalModalOpen, setSignalModalOpen] = useState(false);

  return (
    <div className="max-w-[1600px]">
      <AdminPageHeader
        title="Pipeline Produit"
        subtitle="R&D → Build → Release — cycle de vie produit complet, géré par les 7 agents R&D + Production"
      >
        <button
          type="button"
          onClick={() => setSignalModalOpen(true)}
          className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 text-onyx font-semibold text-[12px] px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={13} />
          Nouveau signal
        </button>
      </AdminPageHeader>

      {error && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-3 py-2 flex items-center gap-2">
          <AlertCircle size={12} />
          {actionError}
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {summary && (
        <>
          {/* Incidents ouverts en haut */}
          {summary.recent_incidents.filter((i) => ['open', 'investigating'].includes(i.status)).length > 0 && (
            <IncidentsBanner incidents={summary.recent_incidents.filter((i) => ['open', 'investigating'].includes(i.status))} />
          )}

          {/* Kanban 6 colonnes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <Column
              Icon={Lightbulb}
              title="Ideas"
              count={summary.counts.ideas}
              accent="blue"
              empty="Ajoute un signal pour démarrer"
            >
              {summary.ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  idea={idea}
                  pending={pending}
                  onLaunchResearch={() => launchResearch(idea.id)}
                />
              ))}
            </Column>

            <Column
              Icon={Microscope}
              title="Research"
              count={summary.counts.research}
              accent="cyan"
            >
              {summary.research.map((r) => (
                <ResearchCard
                  key={r.id}
                  research={r}
                  pending={pending}
                  onDraftSpec={() => draftSpec(r.opportunity_id)}
                />
              ))}
            </Column>

            <Column
              Icon={FileText}
              title="Specs"
              count={summary.counts.specs}
              accent="violet"
            >
              {summary.specs.map((s) => (
                <SpecCard
                  key={s.id}
                  spec={s}
                  pending={pending}
                  onDraftDev={(repo) => draftDev(s.id, repo)}
                />
              ))}
            </Column>

            <Column
              Icon={Code2}
              title="Build"
              count={summary.counts.build}
              accent="amber"
            >
              {summary.build.map((pr) => (
                <PrCard
                  key={pr.id}
                  pr={pr}
                  pending={pending}
                  onRunQa={() => runQa(pr.id)}
                />
              ))}
            </Column>

            <Column
              Icon={FlaskConical}
              title="QA Passed"
              count={summary.counts.qa}
              accent="fuchsia"
            >
              {summary.qa.map((pr) => (
                <QaCard
                  key={pr.id}
                  pr={pr}
                  pending={pending}
                  onPrepareDeploy={(env, app) => prepareDeploy(pr.id, env, app)}
                />
              ))}
            </Column>

            <Column
              Icon={Rocket}
              title="Release"
              count={summary.counts.release}
              accent="emerald"
            >
              {summary.release.map((d) => (
                <DeploymentCard key={d.id} deployment={d} />
              ))}
            </Column>
          </div>
        </>
      )}

      {signalModalOpen && (
        <NewSignalModal
          onClose={() => setSignalModalOpen(false)}
          onSubmit={async (source, signalText) => {
            await detectSignal(source, signalText);
            setSignalModalOpen(false);
          }}
          pending={pending}
        />
      )}
    </div>
  );
}

// ─── Colonne Kanban ─────────────────────────────────────────────────────────
function Column({
  Icon,
  title,
  count,
  accent,
  empty = "Vide",
  children,
}: {
  Icon: typeof Lightbulb;
  title: string;
  count: number;
  accent: 'blue' | 'cyan' | 'violet' | 'amber' | 'fuchsia' | 'emerald';
  empty?: string;
  children: React.ReactNode;
}) {
  const accentClasses: Record<typeof accent, string> = {
    blue: 'text-blue-300 border-blue-500/30',
    cyan: 'text-cyan-300 border-cyan-500/30',
    violet: 'text-violet-300 border-violet-500/30',
    amber: 'text-admin-accent border-admin-accent/30',
    fuchsia: 'text-fuchsia-300 border-fuchsia-500/30',
    emerald: 'text-emerald-300 border-emerald-500/30',
  };

  return (
    <div className="bg-onyx-light/20 border border-white/5 rounded-xl p-3 min-h-[400px]">
      <div className={`flex items-center gap-2 mb-3 pb-2 border-b ${accentClasses[accent]}`}>
        <Icon size={14} />
        <span className="text-[12px] font-semibold uppercase tracking-wider">{title}</span>
        <span className="ml-auto text-[11px] opacity-70 font-mono">{count}</span>
      </div>
      <div className="space-y-2">
        {count === 0 && (
          <div className="text-neutral-600 text-[11px] italic text-center py-6">{empty}</div>
        )}
        {children}
      </div>
    </div>
  );
}

// ─── Cards par colonne ──────────────────────────────────────────────────────
function IdeaCard({
  idea,
  pending,
  onLaunchResearch,
}: {
  idea: PipelineIdea;
  pending: boolean;
  onLaunchResearch: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 p-2.5 text-[11.5px]">
      <div className="text-neutral-light font-medium leading-snug mb-1">{idea.title}</div>
      <div className="flex flex-wrap gap-2 text-neutral-600 text-[10px] mb-2">
        {idea.category && <span>{idea.category}</span>}
        {idea.effort_estimate && <span>· {idea.effort_estimate}</span>}
        {idea.rice_score !== null && (
          <span className="text-admin-accent font-mono">· RICE {Number(idea.rice_score).toFixed(0)}</span>
        )}
      </div>
      <button
        type="button"
        onClick={onLaunchResearch}
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-1 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[10.5px] py-1 rounded transition"
      >
        {pending ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
        Lancer recherche
      </button>
    </div>
  );
}

function ResearchCard({
  research,
  pending,
  onDraftSpec,
}: {
  research: PipelineResearch;
  pending: boolean;
  onDraftSpec: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 p-2.5 text-[11.5px]">
      <div className="text-neutral-light font-medium leading-snug mb-1">{research.title}</div>
      <div className="flex flex-wrap gap-2 text-neutral-600 text-[10px] mb-2">
        {research.has_brief ? (
          <span className="text-emerald-400">✓ Brief produit</span>
        ) : (
          <span className="text-neutral-500">En cours</span>
        )}
      </div>
      {research.has_brief && (
        <button
          type="button"
          onClick={onDraftSpec}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-1 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[10.5px] py-1 rounded transition"
        >
          {pending ? <Loader2 size={9} className="animate-spin" /> : <FileText size={9} />}
          Drafter spec
        </button>
      )}
    </div>
  );
}

function SpecCard({
  spec,
  pending,
  onDraftDev,
}: {
  spec: PipelineSpec;
  pending: boolean;
  onDraftDev: (repo: string) => void;
}) {
  const [showRepo, setShowRepo] = useState(false);
  const [repo, setRepo] = useState('atlas-studio/');

  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 p-2.5 text-[11.5px]">
      <div className="text-neutral-light font-medium leading-snug mb-1">{spec.title}</div>
      <div className="flex flex-wrap gap-2 text-neutral-600 text-[10px] mb-2">
        <span>v{spec.spec_version}</span>
        {spec.story_points && <span>· {spec.story_points} SP</span>}
        {spec.estimated_weeks && <span>· {spec.estimated_weeks}sem</span>}
        <span
          className={
            spec.status === 'approved' ? 'text-emerald-400' : 'text-admin-accent'
          }
        >
          · {spec.status}
        </span>
      </div>
      {spec.status === 'approved' && !showRepo && (
        <button
          type="button"
          onClick={() => setShowRepo(true)}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-1 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[10.5px] py-1 rounded transition"
        >
          <Code2 size={9} />
          Lancer Dev Agent
        </button>
      )}
      {showRepo && (
        <div className="space-y-1">
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo"
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-[10.5px] text-neutral-light"
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => onDraftDev(repo)}
              disabled={pending || !repo.includes('/')}
              className="flex-1 bg-admin-accent text-onyx text-[10.5px] py-1 rounded disabled:opacity-50"
            >
              {pending ? <Loader2 size={9} className="animate-spin inline" /> : 'Go'}
            </button>
            <button
              type="button"
              onClick={() => setShowRepo(false)}
              className="px-2 text-neutral-500 text-[10.5px]"
            >
              ×
            </button>
          </div>
        </div>
      )}
      {spec.status !== 'approved' && (
        <p className="text-neutral-600 text-[10px] italic">En attente validation CEO</p>
      )}
    </div>
  );
}

function PrCard({
  pr,
  pending,
  onRunQa,
}: {
  pr: PipelinePr;
  pending: boolean;
  onRunQa: () => void;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 p-2.5 text-[11.5px]">
      <div className="text-neutral-light font-medium leading-snug mb-1">{pr.title}</div>
      <div className="text-neutral-600 text-[10px] font-mono mb-1 truncate">{pr.repo}</div>
      <div className="flex flex-wrap gap-2 text-neutral-600 text-[10px] mb-2">
        <span>{pr.branch_name}</span>
      </div>
      <div className="flex items-center gap-1 mb-2">
        <span
          className={`text-[9.5px] uppercase px-1.5 py-0.5 rounded border ${
            pr.qa_status === 'passed'
              ? 'border-emerald-500/30 text-emerald-300'
              : pr.qa_status === 'failed'
                ? 'border-red-500/30 text-red-300'
                : pr.qa_status === 'running'
                  ? 'border-amber-500/30 text-admin-accent'
                  : 'border-white/10 text-neutral-500'
          }`}
        >
          QA {pr.qa_status}
        </span>
      </div>
      {pr.qa_status === 'pending' && (
        <button
          type="button"
          onClick={onRunQa}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-1 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[10.5px] py-1 rounded transition"
        >
          {pending ? <Loader2 size={9} className="animate-spin" /> : <FlaskConical size={9} />}
          Lancer QA
        </button>
      )}
    </div>
  );
}

function QaCard({
  pr,
  pending,
  onPrepareDeploy,
}: {
  pr: PipelinePr;
  pending: boolean;
  onPrepareDeploy: (env: 'preview' | 'staging' | 'production', app: string) => void;
}) {
  const [showDeploy, setShowDeploy] = useState(false);
  const [appName, setAppName] = useState(pr.repo.split('/').pop() ?? '');

  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 p-2.5 text-[11.5px]">
      <div className="text-neutral-light font-medium leading-snug mb-1">{pr.title}</div>
      <div className="text-neutral-600 text-[10px] font-mono mb-1 truncate">{pr.repo}</div>
      <div className="flex items-center gap-1 mb-2">
        <span className="text-[9.5px] uppercase px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300">
          QA passed
        </span>
        {pr.test_coverage_percent && (
          <span className="text-neutral-500 text-[10px]">{pr.test_coverage_percent}% cov</span>
        )}
      </div>
      {!showDeploy ? (
        <button
          type="button"
          onClick={() => setShowDeploy(true)}
          disabled={pending}
          className="w-full inline-flex items-center justify-center gap-1 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[10.5px] py-1 rounded transition"
        >
          <Rocket size={9} />
          Préparer deploy
        </button>
      ) : (
        <div className="space-y-1">
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="app-name"
            className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-[10.5px] text-neutral-light"
          />
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => onPrepareDeploy('preview', appName)}
              disabled={pending || !appName}
              className="bg-blue-500/20 text-blue-300 text-[10px] py-1 rounded disabled:opacity-50"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => onPrepareDeploy('staging', appName)}
              disabled={pending || !appName}
              className="bg-violet-500/20 text-violet-300 text-[10px] py-1 rounded disabled:opacity-50"
            >
              Staging
            </button>
            <button
              type="button"
              onClick={() => onPrepareDeploy('production', appName)}
              disabled={pending || !appName}
              className="bg-red-500/25 text-red-200 text-[10px] py-1 rounded disabled:opacity-50"
              title="Production = critical, validation typée"
            >
              🟣 Prod
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DeploymentCard({ deployment }: { deployment: PipelineDeployment }) {
  const envBadge = {
    preview: 'border-blue-500/30 text-blue-300',
    staging: 'border-violet-500/30 text-violet-300',
    production: 'border-red-500/30 text-red-200 bg-red-500/10',
  }[deployment.environment] ?? 'border-white/10 text-neutral-400';

  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 p-2.5 text-[11.5px]">
      <div className="text-neutral-light font-medium leading-snug mb-1">{deployment.app_name}</div>
      {deployment.pr_title && (
        <div className="text-neutral-500 text-[10px] mb-1 truncate">{deployment.pr_title}</div>
      )}
      <div className="flex flex-wrap gap-1 items-center mb-2">
        <span className={`text-[9.5px] uppercase px-1.5 py-0.5 rounded border ${envBadge}`}>
          {deployment.environment}
        </span>
        <span className="text-neutral-500 text-[10px]">{deployment.status}</span>
        {deployment.approved_by_ceo && (
          <span className="text-emerald-400 text-[10px]">✓ CEO</span>
        )}
      </div>
      {deployment.deployment_url && (
        <a
          href={deployment.deployment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-admin-accent text-[10px] truncate hover:underline"
        >
          {deployment.deployment_url}
        </a>
      )}
      <div className="text-neutral-600 text-[10px] mt-1">{timeAgoFr(deployment.created_at)}</div>
    </div>
  );
}

function IncidentsBanner({ incidents }: { incidents: PipelineIncident[] }) {
  return (
    <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertOctagon size={16} className="text-red-300" />
        <h3 className="text-red-200 font-semibold text-[13px]">
          {incidents.length} incident{incidents.length > 1 ? 's' : ''} production actif
          {incidents.length > 1 ? 's' : ''}
        </h3>
      </div>
      <div className="space-y-1">
        {incidents.map((i) => (
          <div key={i.id} className="text-red-200/80 text-[12px]">
            <span className="font-mono mr-2">{i.severity}</span>
            <span className="font-medium">{i.app_concerned}</span>
            <span className="mx-1">·</span>
            <span>{i.title}</span>
            <span className="mx-1">·</span>
            <span className="text-red-300/60 text-[11px]">{timeAgoFr(i.detected_at)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewSignalModal({
  onClose,
  onSubmit,
  pending,
}: {
  onClose: () => void;
  onSubmit: (source: SignalSource, signalText: string) => Promise<void>;
  pending: boolean;
}) {
  const [source, setSource] = useState<SignalSource>('customer_feedback');
  const [signalText, setSignalText] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (signalText.trim().length < 10) return;
    onSubmit(source, signalText.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-onyx border border-white/10 rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-neutral-light text-sm font-semibold">Nouveau signal — Veille Agent</h2>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <XIcon size={16} />
          </button>
        </div>

        <label className="block mb-3">
          <span className="text-neutral-400 text-[11px] mb-1 block">Source du signal</span>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as SignalSource)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light outline-none focus:border-admin-accent/50"
          >
            {Object.entries(SIGNAL_SOURCE_LABELS).map(([k, v]) => (
              <option key={k} value={k} className="bg-onyx">
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="block mb-4">
          <span className="text-neutral-400 text-[11px] mb-1 block">Description du signal</span>
          <textarea
            value={signalText}
            onChange={(e) => setSignalText(e.target.value)}
            placeholder="ex: 5 clients ont demandé une feature de suivi inventaire ce mois ; ou : Sage Africa lance une offre concurrente sur les cabinets compta..."
            rows={5}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light placeholder:text-neutral-600 outline-none focus:border-admin-accent/50"
            required
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 border border-white/10 text-neutral-300 hover:bg-white/5 text-[12px] rounded-lg transition"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={pending || signalText.trim().length < 10}
            className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] px-3 py-2 rounded-lg transition"
          >
            {pending ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            Détecter l'opportunité
          </button>
        </div>
      </form>
    </div>
  );
}
