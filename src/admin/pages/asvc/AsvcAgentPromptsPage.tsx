import { useMemo, useState } from 'react';
import { BookOpen, Check, FileText, Loader2, RotateCcw, Save, X, Power } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useAgents, useAgentPromptVersions, timeAgoFr } from './hooks';
import type { AgentPromptVersion } from './types';

export default function AsvcAgentPromptsPage() {
  const { agents, loading: agentsLoading } = useAgents();
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  // Agents triés par département puis nom
  const sortedAgents = useMemo(() => {
    return [...agents].sort((a, b) => {
      if (a.department === b.department) return a.name.localeCompare(b.name);
      return a.department.localeCompare(b.department);
    });
  }, [agents]);

  const selected = sortedAgents.find((a) => a.code === selectedCode) ?? null;

  return (
    <div className="max-w-7xl">
      <AdminPageHeader
        title="System prompts agents"
        subtitle="Édite les system prompts en DB — itère sans redéploiement. Fallback hardcodé si aucune version active."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Sidebar agents */}
        <aside className="rounded-xl border border-white/10 bg-onyx-light/30 p-2">
          {agentsLoading && <p className="text-neutral-500 text-[12px] p-2">Chargement...</p>}
          <ul className="space-y-0.5">
            {sortedAgents.map((a) => {
              const active = a.code === selectedCode;
              return (
                <li key={a.id}>
                  <button
                    onClick={() => setSelectedCode(a.code)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-[12px] transition ${
                      active
                        ? 'bg-admin-accent/15 text-admin-accent border border-admin-accent/30'
                        : 'hover:bg-white/[0.04] text-neutral-300 border border-transparent'
                    }`}
                  >
                    <div className="font-semibold truncate">{a.name}</div>
                    <div className="text-[10.5px] text-neutral-500 truncate">
                      {a.department} · {a.code}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Panel */}
        <main>
          {!selected && (
            <div className="rounded-xl border border-white/10 bg-onyx-light/20 p-8 text-center text-neutral-500 text-[13px]">
              <BookOpen size={28} className="mx-auto mb-2 text-neutral-600" />
              Sélectionne un agent pour éditer son system prompt.
            </div>
          )}
          {selected && <AgentPromptPanel agentCode={selected.code} agentName={selected.name} />}
        </main>
      </div>
    </div>
  );
}

// ─── Panel par agent ────────────────────────────────────────────────────────
function AgentPromptPanel({ agentCode, agentName }: { agentCode: string; agentName: string }) {
  const { versions, loading, saving, error, createVersion, activateVersion, deactivateActive } =
    useAgentPromptVersions(agentCode);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [viewing, setViewing] = useState<AgentPromptVersion | null>(null);

  const activeVersion = versions.find((v) => v.is_active) ?? null;

  const handleSave = async () => {
    if (!draft.trim()) return;
    await createVersion(draft, notes.trim() || null);
    setDraft('');
    setNotes('');
    setShowEditor(false);
  };

  const handleStartFromActive = () => {
    setDraft(activeVersion?.content ?? '');
    setNotes('');
    setShowEditor(true);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-4 flex items-start justify-between gap-3">
        <div>
          <div className="text-neutral-light text-[13px] font-semibold">{agentName}</div>
          <div className="text-neutral-500 text-[11px] font-mono">{agentCode}</div>
          <div className="mt-1.5 text-[11.5px]">
            {activeVersion ? (
              <span className="text-emerald-300">
                Version <strong>v{activeVersion.version}</strong> active —{' '}
                {timeAgoFr(activeVersion.created_at)}
              </span>
            ) : (
              <span className="text-neutral-500">
                Aucune version DB active — fallback hardcodé utilisé par l'agent.
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          {!showEditor && (
            <button
              onClick={handleStartFromActive}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-admin-accent/15 hover:bg-admin-accent/25 text-admin-accent text-[11.5px] font-semibold transition"
            >
              <FileText size={12} />
              Nouvelle version
            </button>
          )}
          {activeVersion && !showEditor && (
            <button
              onClick={deactivateActive}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[11.5px] transition disabled:opacity-50"
              title="Désactive la version DB → retour au prompt hardcodé"
            >
              <Power size={12} />
              Retour fallback
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
          {error}
        </p>
      )}

      {/* Editor */}
      {showEditor && (
        <div className="rounded-xl border border-admin-accent/30 bg-onyx-light/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-neutral-light text-[12.5px] font-semibold">
              Nouvelle version (deviendra active immédiatement)
            </h3>
            <button
              onClick={() => {
                setShowEditor(false);
                setDraft('');
                setNotes('');
              }}
              className="text-neutral-500 hover:text-neutral-300"
            >
              <X size={14} />
            </button>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={20}
            spellCheck={false}
            className="w-full bg-onyx border border-white/10 rounded p-2.5 text-[12.5px] text-neutral-200 font-mono leading-relaxed focus:outline-none focus:border-admin-accent/50"
            placeholder="Tu es ... Agent de Atlas Studio..."
          />
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (changelog) — ex: ajout règle anti-emoji"
            className="w-full bg-onyx border border-white/10 rounded px-2.5 py-1.5 text-[12px] text-neutral-200 focus:outline-none focus:border-admin-accent/50"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowEditor(false);
                setDraft('');
                setNotes('');
              }}
              className="px-3 py-1.5 rounded text-[12px] text-neutral-400 hover:bg-white/[0.04]"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !draft.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-admin-accent text-onyx text-[12px] font-semibold hover:bg-admin-accent/90 disabled:opacity-50"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Activer cette version
            </button>
          </div>
        </div>
      )}

      {/* Historique */}
      <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-4">
        <h3 className="text-neutral-light text-[12.5px] font-semibold mb-2">
          Historique ({versions.length})
        </h3>
        {loading && <p className="text-neutral-500 text-[12px]">Chargement...</p>}
        {!loading && versions.length === 0 && (
          <p className="text-neutral-500 text-[12px] italic">
            Aucune version éditée pour le moment. L'agent utilise le prompt hardcodé par défaut.
          </p>
        )}
        <ul className="space-y-1.5">
          {versions.map((v) => (
            <li
              key={v.id}
              className={`flex items-center gap-2 px-3 py-2 rounded border ${
                v.is_active
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-white/10 bg-onyx-light/20'
              }`}
            >
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  v.is_active
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-neutral-500/15 text-neutral-400'
                }`}
              >
                v{v.version}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] text-neutral-300 truncate">
                  {v.notes ?? <span className="text-neutral-500 italic">sans note</span>}
                </div>
                <div className="text-[10.5px] text-neutral-600">{timeAgoFr(v.created_at)}</div>
              </div>
              <button
                onClick={() => setViewing(v)}
                className="text-[11px] text-neutral-400 hover:text-admin-accent px-2 py-1 rounded"
              >
                Voir
              </button>
              {!v.is_active && (
                <button
                  onClick={() => activateVersion(v.id)}
                  disabled={saving}
                  className="inline-flex items-center gap-1 text-[11px] text-admin-accent hover:bg-admin-accent/10 px-2 py-1 rounded disabled:opacity-50"
                  title="Réactive cette version"
                >
                  <RotateCcw size={11} />
                  Activer
                </button>
              )}
              {v.is_active && (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 px-2 py-1">
                  <Check size={11} /> Active
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Preview modale */}
      {viewing && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setViewing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-onyx border border-white/10 rounded-xl max-w-3xl w-full max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <div>
                <div className="text-neutral-light text-[13px] font-semibold">
                  {agentName} — v{viewing.version}
                </div>
                <div className="text-[11px] text-neutral-500">
                  {viewing.notes ?? 'sans note'} · {timeAgoFr(viewing.created_at)}
                </div>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="text-neutral-500 hover:text-neutral-300"
              >
                <X size={16} />
              </button>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-[12px] text-neutral-200 font-mono whitespace-pre-wrap leading-relaxed">
              {viewing.content}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
