import { Bot, PauseCircle, PlayCircle } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useAgents } from './hooks';
import { DEPARTMENT_LABELS, type Department } from './types';

const DEPT_ORDER: Department[] = ['direction', 'sav', 'marketing', 'ventes', 'finance'];

export default function AsvcAgentsPage() {
  const { agents, loading } = useAgents();

  const grouped = DEPT_ORDER.map((dept) => ({
    dept,
    items: agents.filter((a) => a.department === dept),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="Agents ASVC"
        subtitle={`${agents.length} agents virtuels — supervision et monitoring`}
      />

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      <div className="space-y-6">
        {grouped.map(({ dept, items }) => (
          <section key={dept}>
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
              {DEPARTMENT_LABELS[dept]}
              <span className="ml-2 text-neutral-700">{items.length}</span>
            </h2>
            <div className="grid gap-2.5 md:grid-cols-2">
              {items.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-xl border border-white/10 bg-onyx-light/30 p-4 flex items-start gap-3"
                >
                  <div className="w-9 h-9 rounded-lg bg-admin-accent/15 text-admin-accent flex items-center justify-center flex-shrink-0">
                    <Bot size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-neutral-light text-[13px] font-medium truncate">
                        {agent.name}
                      </h3>
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
                    </div>
                    <p className="text-neutral-400 text-[11.5px] leading-snug mb-2">
                      {agent.role_description}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-600 font-mono">
                      <span>{agent.code}</span>
                      <span>·</span>
                      <span className="truncate">{agent.llm_primary}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled
                    title="Pause agent (à venir)"
                    className="text-neutral-500 hover:text-neutral-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {agent.is_active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
