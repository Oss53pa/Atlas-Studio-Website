import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  SkipForward,
  Zap,
  Shield,
  Loader2,
  ChevronRight,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { AdminModal } from '../../components/AdminModal';
import {
  useAgentReadiness,
  useTestCases,
  timeAgoFr,
} from './hooks';
import {
  DEPARTMENT_LABELS,
  READINESS_STAGE_CLASSES,
  READINESS_STAGE_LABELS,
  TEST_CATEGORY_CLASSES,
  TEST_CATEGORY_LABELS,
  TEST_STATUS_CLASSES,
  TEST_STATUS_LABELS,
  type AgentReadiness,
  type Department,
  type TestCase,
  type TestStatus,
} from './types';

const DEPT_ORDER: Department[] = [
  'direction',
  'rd',
  'production',
  'sav',
  'marketing',
  'ventes',
  'finance',
];

const TRANSVERSE_VIRTUAL: AgentReadiness = {
  agent_code: '_transverse',
  name: 'Tests transverses',
  department: 'direction' as Department,
  agent_status: 'active',
  total_tests: 0,
  passed: 0,
  failed: 0,
  pending: 0,
  skipped: 0,
  flaky: 0,
  critical_pending: 0,
  readiness_pct: 0,
  stage_recommended: 'needs_work',
};

export default function AsvcTestsReadinessPage() {
  const { rows, loading, error } = useAgentReadiness();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return DEPT_ORDER.map((dept) => ({
      dept,
      items: rows.filter((r) => r.department === dept),
    })).filter((g) => g.items.length > 0);
  }, [rows]);

  const globalStats = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.total_tests, 0);
    const passed = rows.reduce((s, r) => s + r.passed, 0);
    const failed = rows.reduce((s, r) => s + r.failed, 0);
    const critical = rows.reduce((s, r) => s + r.critical_pending, 0);
    const pct = total === 0 ? 0 : Math.round((passed / total) * 1000) / 10;
    return { total, passed, failed, critical, pct };
  }, [rows]);

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Tests readiness ASVC"
        subtitle={`État de préparation pré-production des ${rows.length || 20} agents — source Annexe C`}
      />

      {/* Stats globales */}
      <section className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Tests catalogués" value={globalStats.total} icon={Shield} />
        <StatCard label="Passés" value={globalStats.passed} accent="emerald" icon={CheckCircle2} />
        <StatCard label="Échoués" value={globalStats.failed} accent="red" icon={XCircle} />
        <StatCard
          label="Critical pending"
          value={globalStats.critical}
          accent={globalStats.critical > 0 ? 'red' : 'neutral'}
          icon={AlertTriangle}
        />
        <StatCard
          label="% global"
          value={`${globalStats.pct}%`}
          accent={globalStats.pct >= 90 ? 'emerald' : globalStats.pct >= 50 ? 'amber' : 'red'}
          icon={Zap}
        />
      </section>

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[12px]">
          Erreur readiness : {error}
        </div>
      )}

      {loading && (
        <p className="text-neutral-500 text-sm py-10 text-center">Chargement readiness...</p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-neutral-500 text-sm py-10 text-center">
          Aucune donnée readiness (0 agents retournés par la vue).
        </p>
      )}

      {/* Agents par département */}
      <div className="space-y-6">
        {grouped.map(({ dept, items }) => (
          <section key={dept}>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
              {DEPARTMENT_LABELS[dept]}
              <span className="ml-2 text-neutral-700">{items.length}</span>
            </h2>
            <div className="grid gap-2.5 md:grid-cols-2">
              {items.map((agent) => (
                <AgentReadinessCard
                  key={agent.agent_code}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent.agent_code)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Tests transverses */}
        <section>
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
            Tests transverses (système)
          </h2>
          <AgentReadinessCard
            agent={TRANSVERSE_VIRTUAL}
            onClick={() => setSelectedAgent('_transverse')}
            isVirtual
          />
        </section>
      </div>

      {selectedAgent && (
        <TestCasesModal
          agentCode={selectedAgent}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Carte agent readiness
// ───────────────────────────────────────────────────────────────────────────
function AgentReadinessCard({
  agent,
  onClick,
  isVirtual = false,
}: {
  agent: AgentReadiness;
  onClick: () => void;
  isVirtual?: boolean;
}) {
  const pct = Number(agent.readiness_pct) || 0;
  const barColor =
    pct >= 100 ? 'bg-emerald-500' : pct >= 90 ? 'bg-blue-500' : pct >= 50 ? 'bg-amber-500' : pct > 0 ? 'bg-red-500' : 'bg-neutral-700';

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-white/10 bg-onyx-light/30 hover:bg-onyx-light/50 hover:border-admin-accent/30 p-4 transition group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-neutral-light text-[13px] font-medium truncate">
              {agent.name}
            </h3>
            {agent.critical_pending > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] text-red-300">
                <AlertTriangle size={10} />
                {agent.critical_pending} ⭐
              </span>
            )}
          </div>
          <p className="text-neutral-500 text-[10.5px] font-mono">
            {isVirtual ? 'tests transverses' : agent.agent_code}
          </p>
        </div>
        <ChevronRight size={14} className="text-neutral-600 group-hover:text-admin-accent transition flex-shrink-0 mt-0.5" />
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-[11px] mb-1">
          <span
            className={`px-1.5 py-0.5 rounded-md border text-[10px] ${READINESS_STAGE_CLASSES[agent.stage_recommended]}`}
          >
            {READINESS_STAGE_LABELS[agent.stage_recommended]}
          </span>
          <span className="text-neutral-400 font-mono">
            {agent.passed}/{agent.total_tests}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-[10.5px] text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <CheckCircle2 size={10} className="text-emerald-500" /> {agent.passed}
        </span>
        <span className="inline-flex items-center gap-1">
          <XCircle size={10} className="text-red-500" /> {agent.failed}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={10} className="text-neutral-500" /> {agent.pending}
        </span>
        {agent.flaky > 0 && (
          <span className="inline-flex items-center gap-1">
            <AlertTriangle size={10} className="text-amber-500" /> {agent.flaky}
          </span>
        )}
      </div>
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Modal : liste des test cases pour un agent
// ───────────────────────────────────────────────────────────────────────────
function TestCasesModal({
  agentCode,
  onClose,
}: {
  agentCode: string;
  onClose: () => void;
}) {
  const { cases, loading, error, recordResult, pendingId } = useTestCases(agentCode);

  const grouped = useMemo(() => {
    const order: TestCase['category'][] = [
      'syscohada',
      'security',
      'compliance',
      'nominal',
      'edge',
      'resilience',
      'performance',
    ];
    return order
      .map((cat) => ({ cat, items: cases.filter((c) => c.category === cat) }))
      .filter((g) => g.items.length > 0);
  }, [cases]);

  const title =
    agentCode === '_transverse'
      ? 'Tests transverses (système)'
      : `Tests pour ${cases[0]?.test_id?.split('-')[0] ?? agentCode}`;

  return (
    <AdminModal
      open
      onClose={onClose}
      title={title}
      subtitle={`${cases.length} cas définis — Annexe C`}
      size="xl"
    >
      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[12px]">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-neutral-500 text-sm py-8 text-center">Chargement...</p>
      )}

      <div className="space-y-5">
        {grouped.map(({ cat, items }) => (
          <section key={cat}>
            <h3 className="flex items-center gap-2 mb-2 text-[11px] font-bold uppercase tracking-widest text-neutral-500">
              <span
                className={`px-1.5 py-0.5 rounded-md border text-[10px] normal-case tracking-normal ${TEST_CATEGORY_CLASSES[cat]}`}
              >
                {TEST_CATEGORY_LABELS[cat]}
              </span>
              <span className="text-neutral-700">{items.length}</span>
            </h3>

            <div className="space-y-2">
              {items.map((tc) => (
                <TestCaseRow
                  key={tc.id}
                  testCase={tc}
                  onRecord={(status, notes) => recordResult(tc, status, notes)}
                  pending={pendingId === tc.id}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </AdminModal>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Ligne test case avec actions
// ───────────────────────────────────────────────────────────────────────────
function TestCaseRow({
  testCase,
  onRecord,
  pending,
}: {
  testCase: TestCase;
  onRecord: (status: TestStatus, notes?: string) => void;
  pending: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        testCase.is_critical
          ? 'border-admin-accent/30 bg-admin-accent/5'
          : 'border-white/10 bg-onyx-light/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[10.5px] text-neutral-500 font-mono">{testCase.test_id}</span>
            {testCase.is_critical && (
              <span className="text-[9px] text-admin-accent">⭐ CRITIQUE</span>
            )}
            <span
              className={`px-1.5 py-0.5 rounded-md border text-[9px] ${TEST_STATUS_CLASSES[testCase.last_status]}`}
            >
              {TEST_STATUS_LABELS[testCase.last_status]}
            </span>
            {testCase.last_run_at && (
              <span className="text-[10px] text-neutral-600">
                {timeAgoFr(testCase.last_run_at)}
              </span>
            )}
          </div>
          <p className="text-neutral-300 text-[12px] leading-snug">
            <span className="text-neutral-200 font-medium">{testCase.scenario}</span>
            <span className="text-neutral-500"> → </span>
            <span className="text-neutral-400">{testCase.expected_outcome}</span>
          </p>
          {testCase.last_run_notes && (
            <p className="mt-1 text-neutral-500 text-[11px] italic border-l-2 border-white/10 pl-2">
              {testCase.last_run_notes}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <ActionButton
          icon={CheckCircle2}
          label="Passé"
          color="emerald"
          disabled={pending}
          onClick={() => onRecord('passed')}
        />
        <ActionButton
          icon={XCircle}
          label="Échoué"
          color="red"
          disabled={pending}
          onClick={() => onRecord('failed')}
        />
        <ActionButton
          icon={SkipForward}
          label="Ignoré"
          color="neutral"
          disabled={pending}
          onClick={() => onRecord('skipped')}
        />
        <ActionButton
          icon={AlertTriangle}
          label="Flaky"
          color="amber"
          disabled={pending}
          onClick={() => onRecord('flaky')}
        />
        <ActionButton
          icon={Clock}
          label="Reset"
          color="neutral"
          disabled={pending}
          onClick={() => onRecord('pending')}
        />
        {pending && <Loader2 size={11} className="animate-spin text-neutral-500 ml-1" />}
      </div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: typeof CheckCircle2;
  label: string;
  color: 'emerald' | 'red' | 'neutral' | 'amber';
  onClick: () => void;
  disabled?: boolean;
}) {
  const colorClasses: Record<typeof color, string> = {
    emerald: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10',
    red: 'border-red-500/30 text-red-300 hover:bg-red-500/10',
    neutral: 'border-white/10 text-neutral-400 hover:bg-white/5',
    amber: 'border-amber-500/30 text-amber-300 hover:bg-amber-500/10',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] disabled:opacity-40 disabled:cursor-not-allowed transition ${colorClasses[color]}`}
    >
      <Icon size={10} />
      {label}
    </button>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Carte stat globale
// ───────────────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent = 'neutral',
  icon: Icon,
}: {
  label: string;
  value: number | string;
  accent?: 'neutral' | 'emerald' | 'red' | 'amber';
  icon: typeof Shield;
}) {
  const colorClasses: Record<typeof accent, string> = {
    neutral: 'text-neutral-300',
    emerald: 'text-emerald-300',
    red: 'text-red-300',
    amber: 'text-amber-300',
  };
  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-3">
      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-500 uppercase tracking-wider">
        <Icon size={10} />
        {label}
      </div>
      <div className={`text-xl font-bold ${colorClasses[accent]}`}>{value}</div>
    </div>
  );
}
