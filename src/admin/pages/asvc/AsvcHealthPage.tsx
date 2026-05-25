import { Activity, Shield, CheckCircle2, AlertCircle, Loader2, ShieldAlert } from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { useHealthCheck, useSecOpsScan, timeAgoFr } from './hooks';

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function fmtUsd(n: number): string {
  return `$${n.toFixed(4)}`;
}

export default function AsvcHealthPage() {
  const { health, loading, refresh, verifying, integrity, verifyAuditChain } = useHealthCheck();
  const { running: scanning, error: scanError, result: scanResult, runScan } = useSecOpsScan();

  return (
    <div className="max-w-5xl">
      <AdminPageHeader
        title="System Health"
        subtitle="État de santé de l'ensemble ASVC + vérification intégrité audit log (hash chain)"
      >
        <button
          type="button"
          onClick={() => runScan()}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/[0.12] border border-gold/30 text-admin-accent text-[11px] font-semibold hover:bg-gold/20 hover:shadow-gold-sm disabled:opacity-50 transition-all"
        >
          {scanning ? <Loader2 size={12} className="animate-spin" /> : <ShieldAlert size={12} />}
          {scanning ? 'Passe CTEM…' : 'Lancer une passe CTEM'}
        </button>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 border border-white/10 hover:bg-white/5 text-neutral-300 text-[11px] rounded-md transition"
        >
          <Activity size={11} />
          Rafraîchir
        </button>
      </AdminPageHeader>

      {/* Résultat de la passe CTEM (SecOps) */}
      {(scanResult || scanError) && (
        <div
          className={`mb-5 rounded-2xl border p-4 shadow-premium ${
            scanError
              ? 'border-red-500/30 bg-red-500/5'
              : scanResult && scanResult.critical_count > 0
                ? 'border-red-500/30 bg-red-500/5'
                : 'border-gold/25 bg-gold/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <ShieldAlert size={18} className={scanError || (scanResult && scanResult.critical_count > 0) ? 'text-red-400' : 'text-admin-accent'} strokeWidth={1.75} />
            <div className="min-w-0 flex-1">
              <div className="text-neutral-light text-[13px] font-semibold mb-0.5">SecOps · passe CTEM</div>
              {scanError ? (
                <p className="text-red-300 text-[12px]">{scanError}</p>
              ) : scanResult ? (
                <>
                  <p className="text-neutral-400 text-[12px] leading-snug mb-2">{scanResult.summary}</p>
                  <div className="flex items-center gap-2 flex-wrap text-[11px]">
                    <span className="pill pill-neutral">Posture {scanResult.posture_score}/100</span>
                    <span className="pill">{scanResult.findings_count} findings</span>
                    {scanResult.critical_count > 0 && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                        {scanResult.critical_count} critique{scanResult.critical_count > 1 ? 's' : ''}
                      </span>
                    )}
                    <span className="text-neutral-600">→ plan de remédiation proposé (Arbitrages)</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}

      {health && (
        <>
          <p className="text-neutral-500 text-[11px] mb-4">
            Snapshot · {new Date(health.as_of).toLocaleString('fr-FR')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <Card title="Agents actifs" value={`${health.agents.active}/${health.agents.total}`} sub={`${health.agents.paused} en pause`} />
            <Card
              title="Arbitrages pendants"
              value={String(health.actions_24h.pending_now)}
              sub={`dont ${health.actions_24h.pending_critical} critiques`}
              danger={health.actions_24h.pending_critical > 0}
            />
            <Card
              title="Kill switches actifs"
              value={String(health.kill_switches_active)}
              sub={health.kill_switches_active > 0 ? 'Système partiellement OFF' : 'Aucun'}
              danger={health.kill_switches_active > 0}
            />
            <Card
              title="Sessions 24h"
              value={fmtNumber(health.sessions_24h.total)}
              sub={`${health.sessions_24h.completed} ok / ${health.sessions_24h.failed} fail`}
              accent={health.sessions_24h.failed > 0}
            />
            <Card
              title="Tokens 24h"
              value={fmtNumber(health.sessions_24h.total_tokens)}
              sub={`coût LLM ${fmtUsd(health.sessions_24h.total_cost_usd)}`}
            />
            <Card
              title="Actions 24h"
              value={`${health.actions_24h.approved} ✓ / ${health.actions_24h.rejected} ✗`}
              sub={`${health.actions_24h.proposed} proposées`}
            />
            <Card
              title="Audit log"
              value={fmtNumber(health.audit_log.total_entries)}
              sub={
                health.audit_log.last_entry_at
                  ? `dernière ${timeAgoFr(health.audit_log.last_entry_at)}`
                  : 'vide'
              }
            />
          </div>

          {/* Audit chain verification */}
          <section className="rounded-xl border border-white/10 bg-onyx-light/30 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={15} className="text-admin-accent" />
              <h2 className="text-neutral-light text-sm font-semibold">
                Intégrité hash chain audit log
              </h2>
            </div>
            <p className="text-neutral-400 text-[12px] mb-3">
              Recalcule les hashes SHA-256 du chain pour détecter une éventuelle altération.
              Une altération = signal d'incident sécurité, à investiguer manuellement (les
              RULES Postgres empêchent UPDATE/DELETE, donc un mismatch ne devrait jamais arriver).
            </p>

            <button
              type="button"
              onClick={() => verifyAuditChain(1000)}
              disabled={verifying}
              className="inline-flex items-center gap-1.5 bg-admin-accent hover:bg-admin-accent/90 disabled:opacity-50 text-onyx font-semibold text-[12px] px-3 py-1.5 rounded-lg transition"
            >
              {verifying ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
              Vérifier 1000 dernières entrées
            </button>

            {integrity && (
              <div className="mt-4">
                {integrity.integrity_ok ? (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-emerald-300 mt-0.5" />
                    <div>
                      <div className="text-emerald-200 text-[12.5px] font-semibold">
                        Hash chain valide
                      </div>
                      <div className="text-emerald-300/70 text-[11.5px]">
                        {integrity.entries_valid}/{integrity.total_entries_scanned} entrées vérifiées.
                        Vérifié {timeAgoFr(integrity.verified_at)}.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <AlertCircle size={14} className="text-red-300 mt-0.5" />
                      <div>
                        <div className="text-red-200 text-[12.5px] font-semibold">
                          ⚠️ {integrity.mismatch_count} mismatch{integrity.mismatch_count > 1 ? 'es' : ''} détecté{integrity.mismatch_count > 1 ? 's' : ''}
                        </div>
                        <div className="text-red-300/70 text-[11.5px]">
                          Investigation immédiate requise — l'audit log a peut-être été altéré.
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
                      {integrity.mismatches.slice(0, 10).map((m) => (
                        <div key={m.id} className="text-red-200/80 text-[10.5px] font-mono">
                          {new Date(m.ts).toISOString()} · {m.event_type} · id={m.id.slice(0, 8)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  accent = false,
  danger = false,
}: {
  title: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const cls = danger
    ? 'border-red-500/30 bg-red-500/5'
    : accent
      ? 'border-amber-500/30 bg-amber-500/5'
      : 'border-white/10 bg-onyx-light/30';
  return (
    <div className={`rounded-xl border p-4 ${cls}`}>
      <div className="text-neutral-500 text-[10.5px] uppercase tracking-wider mb-1">{title}</div>
      <div className="text-neutral-light text-[16px] font-semibold">{value}</div>
      {sub && <div className="text-neutral-600 text-[11px] mt-0.5">{sub}</div>}
    </div>
  );
}
