import { useState } from 'react';
import { AlertOctagon, Power } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useKillSwitches, timeAgoFr } from './hooks';

export default function AsvcKillSwitchPage() {
  const { switches, loading, activate, deactivate } = useKillSwitches();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const activeKills = switches.filter((s) => s.is_active);
  const historyKills = switches.filter((s) => !s.is_active).slice(0, 20);
  const globalKill = activeKills.find((s) => s.scope === 'all');

  const triggerGlobal = async () => {
    if (!reason.trim()) return;
    if (!confirm('Confirmer l\'arrêt de TOUS les agents ASVC ?')) return;
    setBusy(true);
    try {
      await activate('all', null, reason.trim());
      setReason('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        title="Kill Switch"
        subtitle="Arrêt d'urgence des agents — global, par département, ou ciblé"
      />

      {globalKill && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertOctagon size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold text-sm mb-1">
                Tous les agents sont actuellement à l'arrêt
              </h3>
              {globalKill.reason && (
                <p className="text-red-200/80 text-[12px]">{globalKill.reason}</p>
              )}
              <p className="text-red-300/60 text-[11px] mt-1">
                Activé {timeAgoFr(globalKill.activated_at)}
                {globalKill.activated_by ? ` par ${globalKill.activated_by}` : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => deactivate(globalKill.id)}
              className="px-3 py-1.5 text-[12px] bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg border border-red-500/30"
            >
              Réactiver
            </button>
          </div>
        </div>
      )}

      {!globalKill && (
        <div className="mb-6 rounded-xl border border-white/10 bg-onyx-light/30 p-5">
          <h2 className="text-neutral-light text-sm font-semibold mb-1 flex items-center gap-2">
            <Power size={14} className="text-red-400" />
            Arrêt global
          </h2>
          <p className="text-neutral-400 text-[12px] mb-3">
            Désactive immédiatement les 11 agents. Aucune action externe ne sera proposée
            tant que le switch reste actif.
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison (obligatoire) — ex: incident en cours, audit, congés..."
            rows={2}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-[12.5px] text-neutral-light placeholder:text-neutral-600 outline-none focus:border-red-500/40"
          />
          <button
            type="button"
            disabled={!reason.trim() || busy}
            onClick={triggerGlobal}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-200 text-[12px] rounded-lg border border-red-500/30 transition"
          >
            <Power size={13} />
            Tout arrêter
          </button>
        </div>
      )}

      <h2 className="text-[11px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
        Historique
      </h2>
      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
      {!loading && historyKills.length === 0 && (
        <p className="text-neutral-500 text-[12px] italic">Aucun arrêt enregistré.</p>
      )}
      <div className="space-y-2">
        {historyKills.map((k) => (
          <div
            key={k.id}
            className="rounded-lg border border-white/5 bg-onyx-light/20 px-3 py-2 text-[11.5px]"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-300">
                {k.scope === 'all'
                  ? 'Arrêt global'
                  : `${k.scope}: ${k.target}`}
              </span>
              <span className="text-neutral-600 text-[10.5px]">
                {timeAgoFr(k.activated_at)}
              </span>
            </div>
            {k.reason && (
              <p className="text-neutral-500 text-[11px] mt-0.5">{k.reason}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
