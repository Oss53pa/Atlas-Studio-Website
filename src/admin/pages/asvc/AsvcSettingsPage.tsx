import { useState } from 'react';
import {
  Palmtree, Zap, CheckCircle2, Loader2, Power, ShieldCheck, Sparkles,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useVacationMode, useAutoApprovePatterns, timeAgoFr } from './hooks';
import {
  CRITICALITY_LABELS, CRITICALITY_BADGE_CLASSES,
  type AutoApprovePattern, type AutoApproveCandidate, type Criticality,
} from './types';

export default function AsvcSettingsPage() {
  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="Préférences CEO"
        subtitle="Mode vacances + auto-approve patterns — règles d'orchestration pendant que tu n'es pas là"
      />

      <VacationSection />
      <AutoApproveSection />
    </div>
  );
}

// ─── Mode vacances ─────────────────────────────────────────────────────────
function VacationSection() {
  const { status, loading, saving, error, enable, disable } = useVacationMode();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [behavior, setBehavior] = useState<'strict' | 'moderate' | 'full_pause'>('strict');

  const handleEnable = async () => {
    if (!start || !end) return;
    await enable(new Date(start).toISOString(), new Date(end).toISOString(), behavior);
  };

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-onyx-light/30 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Palmtree size={16} className="text-admin-accent" />
        <h2 className="text-neutral-light text-sm font-semibold">Mode vacances</h2>
        {status.active_now && (
          <span className="text-[10px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
            ACTIF MAINTENANT
          </span>
        )}
      </div>
      <p className="text-neutral-400 text-[12px] mb-4">
        Pendant la période, les agents ne te notifient que selon le mode choisi.
        Les actions retenues s'accumulent pour validation à ton retour. Les actions
        🟣 production et ⚫ critical te sont TOUJOURS notifiées en temps réel.
      </p>

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {error && (
        <p className="mb-3 text-red-300 text-[12px] bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
          {error}
        </p>
      )}

      {status.enabled && status.active_now && status.start && status.end ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 mb-4">
          <div className="text-emerald-200 text-[13px] font-semibold mb-1">
            Tu es en vacances — {behaviorLabel(status.behavior)}
          </div>
          <div className="text-emerald-200/80 text-[11.5px] mb-3">
            Du {new Date(status.start).toLocaleString('fr-FR')} au {new Date(status.end).toLocaleString('fr-FR')}
          </div>
          <button
            type="button"
            onClick={disable}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 text-[12px] rounded-md transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Power size={12} />}
            Revenir maintenant
          </button>
        </div>
      ) : status.enabled && status.start && status.end ? (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4 mb-4">
          <div className="text-blue-200 text-[12.5px]">
            Vacances programmées du {new Date(status.start).toLocaleString('fr-FR')} au{' '}
            {new Date(status.end).toLocaleString('fr-FR')} ({behaviorLabel(status.behavior)})
          </div>
          <button
            type="button"
            onClick={disable}
            disabled={saving}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 text-[11.5px] rounded-md transition disabled:opacity-50"
          >
            Annuler la programmation
          </button>
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <label className="block">
          <span className="text-neutral-400 text-[11px] mb-1 block">Début</span>
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light outline-none focus:border-admin-accent/50"
          />
        </label>
        <label className="block">
          <span className="text-neutral-400 text-[11px] mb-1 block">Fin</span>
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light outline-none focus:border-admin-accent/50"
          />
        </label>
      </div>

      <fieldset className="mb-4">
        <legend className="text-neutral-400 text-[11px] mb-2">Comportement</legend>
        <div className="space-y-1.5">
          <BehaviorOption
            value="strict"
            current={behavior}
            onSelect={setBehavior}
            label="Strict"
            desc="Seules les ⚫ critical te sont notifiées. Reste (low/normal/high) silencé."
          />
          <BehaviorOption
            value="moderate"
            current={behavior}
            onSelect={setBehavior}
            label="Modéré"
            desc="⚫ critical + 🔴 high te sont notifiées. low/normal silencé."
          />
          <BehaviorOption
            value="full_pause"
            current={behavior}
            onSelect={setBehavior}
            label="Pause totale"
            desc="TOUS les agents en pause. Aucune action créée. Les ⚫ critical incident production te sont toujours envoyées."
          />
        </div>
      </fieldset>

      <button
        type="button"
        onClick={handleEnable}
        disabled={saving || !start || !end}
        className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-onyx font-semibold text-[12px] px-3 py-2 rounded-lg transition"
      >
        {saving ? <Loader2 size={13} className="animate-spin" /> : <Palmtree size={13} />}
        {status.enabled ? 'Mettre à jour' : 'Activer le mode vacances'}
      </button>
    </section>
  );
}

function behaviorLabel(b?: 'strict' | 'moderate' | 'full_pause'): string {
  return b === 'strict' ? 'Strict' : b === 'moderate' ? 'Modéré' : b === 'full_pause' ? 'Pause totale' : '?';
}

function BehaviorOption({
  value, current, onSelect, label, desc,
}: {
  value: 'strict' | 'moderate' | 'full_pause';
  current: string;
  onSelect: (v: 'strict' | 'moderate' | 'full_pause') => void;
  label: string;
  desc: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`w-full text-left rounded-lg border p-3 transition ${
        active ? 'border-admin-accent/40 bg-admin-accent/5' : 'border-white/10 bg-onyx-light/30 hover:bg-onyx-light/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-0.5">
        <div className={`w-3 h-3 rounded-full border ${active ? 'bg-admin-accent border-admin-accent' : 'border-neutral-500'}`} />
        <span className="text-neutral-light text-[12.5px] font-semibold">{label}</span>
      </div>
      <p className="text-neutral-400 text-[11px] pl-5">{desc}</p>
    </button>
  );
}

// ─── Auto-approve patterns ─────────────────────────────────────────────────
function AutoApproveSection() {
  const { candidates, patterns, loading, saving, setPattern } = useAutoApprovePatterns(5);

  const activePatterns = patterns.filter((p) => p.enabled);
  const nonAutoCandidates = candidates.filter((c) => !c.already_auto_approved);

  return (
    <section className="rounded-2xl border border-white/10 bg-onyx-light/30 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={16} className="text-admin-accent" />
        <h2 className="text-neutral-light text-sm font-semibold">Auto-approve patterns</h2>
      </div>
      <p className="text-neutral-400 text-[12px] mb-4">
        Quand un agent te propose 5+ fois <strong>de suite</strong> le même type d'action avec
        la même criticité (sans aucun rejet entre temps), ASVC te suggère d'auto-approuver
        ce pattern. Les actions matching seront ensuite approuvées <em>instantanément</em>{' '}
        (et exécutées si in-system) sans intervention.
      </p>

      <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-[11.5px] text-red-200/80 flex items-start gap-2">
        <ShieldCheck size={13} className="text-red-300 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Garde-fou serveur :</strong> les actions criticality=<code>critical</code> ne
          peuvent JAMAIS être auto-approuvées (deploy production, rollback, etc.). Le RPC
          refuse l'enregistrement.
        </span>
      </div>

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {/* Patterns actuellement actifs */}
      {activePatterns.length > 0 && (
        <div className="mb-5">
          <h3 className="text-[10.5px] uppercase tracking-wider text-neutral-500 font-semibold mb-2">
            Patterns auto-approuvés ({activePatterns.length})
          </h3>
          <div className="space-y-1.5">
            {activePatterns.map((p) => (
              <PatternRow
                key={`${p.agent_code}-${p.action_type}-${p.criticality}`}
                pattern={p}
                saving={saving}
                onDisable={() => setPattern(p.agent_code, p.action_type, p.criticality, false)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Candidats suggérés */}
      <div>
        <h3 className="text-[10.5px] uppercase tracking-wider text-neutral-500 font-semibold mb-2">
          Candidats à l'auto-approve ({nonAutoCandidates.length})
        </h3>
        {nonAutoCandidates.length === 0 && (
          <p className="text-neutral-500 text-[12px] italic">
            Aucun pattern n'atteint encore le seuil de 5 approbations consécutives.
          </p>
        )}
        <div className="space-y-1.5">
          {nonAutoCandidates.map((c) => (
            <CandidateRow
              key={`${c.agent_code}-${c.action_type}-${c.criticality}`}
              candidate={c}
              saving={saving}
              onEnable={() => setPattern(c.agent_code, c.action_type, c.criticality, true)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PatternRow({
  pattern, saving, onDisable,
}: {
  pattern: AutoApprovePattern;
  saving: boolean;
  onDisable: () => void;
}) {
  const crit = pattern.criticality as Criticality;
  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11.5px] flex-wrap">
          <span className="text-emerald-300 font-semibold">{pattern.agent_code}</span>
          <span className="text-neutral-600">→</span>
          <code className="text-neutral-300 font-mono">{pattern.action_type}</code>
          <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${CRITICALITY_BADGE_CLASSES[crit]}`}>
            {CRITICALITY_LABELS[crit]}
          </span>
        </div>
        <div className="text-neutral-600 text-[10.5px] mt-0.5">
          actif depuis {timeAgoFr(pattern.set_at)}
        </div>
      </div>
      <button
        type="button"
        onClick={onDisable}
        disabled={saving}
        className="text-[11px] text-neutral-500 hover:text-red-300 disabled:opacity-50 px-2 py-1"
      >
        Désactiver
      </button>
    </div>
  );
}

function CandidateRow({
  candidate, saving, onEnable,
}: {
  candidate: AutoApproveCandidate;
  saving: boolean;
  onEnable: () => void;
}) {
  const crit = candidate.criticality as Criticality;
  return (
    <div className="rounded-lg border border-white/10 bg-onyx-light/40 px-3 py-2 flex flex-wrap items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[11.5px] flex-wrap">
          <span className="text-neutral-light font-medium">{candidate.agent_code}</span>
          <span className="text-neutral-600">→</span>
          <code className="text-neutral-300 font-mono">{candidate.action_type}</code>
          <span className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${CRITICALITY_BADGE_CLASSES[crit]}`}>
            {CRITICALITY_LABELS[crit]}
          </span>
        </div>
        <div className="text-neutral-500 text-[10.5px] mt-0.5">
          <CheckCircle2 size={9} className="inline mr-1 text-emerald-400" />
          {candidate.consecutive_approvals} approbations consécutives · dernière{' '}
          {timeAgoFr(candidate.last_decision_at)}
        </div>
      </div>
      <button
        type="button"
        onClick={onEnable}
        disabled={saving}
        className="inline-flex items-center gap-1.5 bg-admin-accent/15 hover:bg-admin-accent/25 disabled:opacity-50 text-admin-accent text-[11px] px-2.5 py-1.5 rounded-md transition"
      >
        {saving ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        Activer auto-approve
      </button>
    </div>
  );
}
