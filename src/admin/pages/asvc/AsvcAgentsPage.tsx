import { useState, useMemo } from 'react';
import { Bot, PauseCircle, PlayCircle, Activity, TrendingUp, Clock } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useAgents, useAgentStats } from './hooks';
import { DEPARTMENT_LABELS, type Department, type Agent, type AgentActionStats } from './types';

const DEPT_ORDER: Department[] = ['direction', 'rd', 'production', 'sav', 'marketing', 'ventes', 'finance'];

export default function AsvcAgentsPage() {
  const { agents, loading } = useAgents();
  const { stats } = useAgentStats(7);
  const [activeDept, setActiveDept] = useState<Department | null>(null);

  const grouped = useMemo(
    () =>
      DEPT_ORDER.map((dept) => ({
        dept,
        items: agents.filter((a) => a.department === dept),
      })).filter((g) => g.items.length > 0),
    [agents],
  );

  // Onglet actif: premier département disponible par défaut
  const currentDept = activeDept ?? grouped[0]?.dept ?? null;
  const currentItems = grouped.find((g) => g.dept === currentDept)?.items ?? [];

  // Global stats footer
  const totals = Object.values(stats).reduce(
    (acc, s) => ({
      total: acc.total + Number(s.total),
      approved: acc.approved + Number(s.approved),
      rejected: acc.rejected + Number(s.rejected),
      executed: acc.executed + Number(s.executed),
      failed: acc.failed + Number(s.failed),
    }),
    { total: 0, approved: 0, rejected: 0, executed: 0, failed: 0 },
  );

  return (
    <div className="max-w-6xl">
      <AdminPageHeader
        title="Agents ASVC"
        subtitle={`${agents.length} agents virtuels — supervision, santé, KPIs sur 7 jours`}
      />

      {/* Global stats bar */}
      {Object.keys(stats).length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3 text-[11.5px]">
          <Stat label="Actions 7j" value={totals.total} />
          <Stat label="Approuvées" value={totals.approved} accent="emerald" />
          <Stat label="Rejetées" value={totals.rejected} accent="red" />
          <Stat label="Exécutées" value={totals.executed} accent="amber" />
          {totals.failed > 0 && <Stat label="Échec" value={totals.failed} accent="red" />}
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {/* Onglets par département */}
      {grouped.length > 0 && (
        <div className="flex gap-1 border-b border-white/10 mb-5 overflow-x-auto">
          {grouped.map(({ dept, items }) => {
            const active = dept === currentDept;
            return (
              <button
                key={dept}
                type="button"
                onClick={() => setActiveDept(dept)}
                className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  active
                    ? 'border-admin-accent text-admin-accent'
                    : 'border-transparent text-neutral-500 hover:text-neutral-300'
                }`}
              >
                {DEPARTMENT_LABELS[dept]}
                <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${active ? 'bg-admin-accent/15 text-admin-accent' : 'bg-white/5 text-neutral-500'}`}>
                  {items.length}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Agents du département actif */}
      <div className="grid gap-2.5 lg:grid-cols-2">
        {currentItems.map((agent) => (
          <AgentMonitorCard key={agent.id} agent={agent} stats={stats[agent.code] ?? null} />
        ))}
      </div>
    </div>
  );
}

function AgentMonitorCard({ agent, stats }: { agent: Agent; stats: AgentActionStats | null }) {
  // Health score: approval_rate (0-100) — penalty si rejets >30%
  const approvalRate = stats?.approval_rate ?? null;
  const total = stats?.total ?? 0;
  const healthScore = approvalRate !== null && total > 0
    ? Math.round(approvalRate)
    : null;

  const healthColor =
    healthScore === null
      ? 'bg-white/5 text-neutral-500'
      : healthScore >= 80
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : healthScore >= 50
          ? 'bg-admin-accent/15 text-admin-accent border-admin-accent/30'
          : 'bg-red-500/15 text-red-300 border-red-500/30';

  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-admin-accent/15 text-admin-accent flex items-center justify-center flex-shrink-0">
          <Bot size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-neutral-light text-[13px] font-medium truncate">{agent.name}</h3>
            {agent.is_active ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Actif
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-500" />
                Pause
              </span>
            )}
            {healthScore !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${healthColor}`}>
                ❤ {healthScore}
              </span>
            )}
          </div>
          <p className="text-neutral-400 text-[11.5px] leading-snug">{agent.role_description}</p>
          <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-mono mt-1">
            <span>{agent.code}</span>
            <span>·</span>
            <span className="truncate">{agent.llm_primary}</span>
          </div>
        </div>
        <button
          type="button"
          disabled
          title="Pause agent (à venir)"
          className="text-neutral-500 disabled:opacity-40"
        >
          {agent.is_active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
        </button>
      </div>

      {/* Stats 7j */}
      {stats && total > 0 ? (
        <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-white/5">
          <MiniStat icon={<Activity size={10} />} label="Actions" value={String(total)} />
          <MiniStat icon={<TrendingUp size={10} />} label="Approval" value={`${Math.round(approvalRate ?? 0)}%`} />
          <MiniStat label="Exécutées" value={String(stats.executed)} />
          <MiniStat icon={<Clock size={10} />} label="Délai val." value={`${Math.round(Number(stats.avg_validation_minutes))}m`} />
        </div>
      ) : (
        <p className="text-neutral-600 text-[10.5px] italic pt-2 border-t border-white/5">
          Aucune action sur 7 jours
        </p>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-onyx-light/40 rounded px-2 py-1.5">
      <div className="text-neutral-light text-[12px] font-semibold font-mono leading-none">{value}</div>
      <div className="text-neutral-600 text-[9.5px] mt-0.5 flex items-center gap-0.5">
        {icon}
        {label}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'amber' | 'emerald' | 'red';
}) {
  const cls = accent === 'red'
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : accent === 'emerald'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : accent === 'amber'
        ? 'border-admin-accent/30 bg-admin-accent/10 text-admin-accent'
        : 'border-white/10 bg-white/5 text-neutral-300';
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${cls}`}>
      <span className="font-semibold">{value}</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}
