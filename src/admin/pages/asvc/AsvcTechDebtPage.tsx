import { useMemo, useState } from 'react';
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText,
  ArrowDownToLine,
  XCircle,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import { AdminPageHeader } from '../../components/AdminPageHeader';
import { AdminModal } from '../../components/AdminModal';
import {
  useTechDebtPriority,
  useCodeHealthAudits,
  timeAgoFr,
} from './hooks';
import {
  TECH_DEBT_CATEGORY_LABELS,
  TECH_DEBT_PRIORITY_CLASSES,
  TECH_DEBT_SEVERITY_CLASSES,
  TECH_DEBT_STATUS_CLASSES,
  TECH_DEBT_STATUS_LABELS,
  TREND_CLASSES,
  TREND_LABELS,
  type TechDebtPriorityRow,
  type TechDebtPriority,
  type TechDebtStatus,
} from './types';

const PRIORITY_ORDER: TechDebtPriority[] = ['P0', 'P1', 'P2', 'P3'];

export default function AsvcTechDebtPage() {
  const {
    rows, loading, error, updateStatus,
    scanning, scanError, lastScanSummary, triggerScan,
  } = useTechDebtPriority();
  const { latest: audits, loading: auditsLoading, refresh: refreshAudits } = useCodeHealthAudits(30);
  const [selected, setSelected] = useState<TechDebtPriorityRow | null>(null);
  const [appFilter, setAppFilter] = useState<string | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TechDebtPriority | 'all'>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleScan = async () => {
    await triggerScan('full');
    await refreshAudits();
  };

  // ─── Derived stats ─────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = rows.length;
    const byPriority = PRIORITY_ORDER.map((p) => ({
      priority: p,
      count: rows.filter((r) => r.priority === p).length,
    }));
    const apps = Array.from(new Set(rows.map((r) => r.app_concerned))).sort();
    const avgScore = audits.length
      ? audits.reduce((s, a) => s + (Number(a.score) || 0), 0) / audits.length
      : 0;
    const degrading = audits.filter((a) => a.trend === 'degrading').length;
    const improving = audits.filter((a) => a.trend === 'improving').length;
    return { total, byPriority, apps, avgScore, degrading, improving, auditedApps: audits.length };
  }, [rows, audits]);

  // ─── Filter ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (appFilter !== 'all' && r.app_concerned !== appFilter) return false;
      if (priorityFilter !== 'all' && r.priority !== priorityFilter) return false;
      return true;
    });
  }, [rows, appFilter, priorityFilter]);

  // ─── Group by app ──────────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const byApp: Record<string, TechDebtPriorityRow[]> = {};
    for (const row of filtered) {
      if (!byApp[row.app_concerned]) byApp[row.app_concerned] = [];
      byApp[row.app_concerned].push(row);
    }
    return Object.entries(byApp).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const handleUpdate = async (status: TechDebtStatus) => {
    if (!selected) return;
    setPendingId(selected.id);
    try {
      await updateStatus(selected.id, status);
      setSelected(null);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <AdminPageHeader
          title="Tech Debt"
          subtitle="Audit code health hebdomadaire — backlog priorisé P0-P3 des 14 apps Atlas Studio"
        />
        <button
          type="button"
          onClick={handleScan}
          disabled={scanning}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-admin-accent/30 bg-admin-accent/15 hover:bg-admin-accent/25 text-admin-accent text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {scanning ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <PlayCircle size={13} />
          )}
          {scanning ? 'Scan en cours...' : 'Lancer un scan'}
        </button>
      </div>

      {scanError && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[12px]">
          Erreur scan : {scanError}
        </div>
      )}

      {lastScanSummary && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[12px]">
          ✓ Scan terminé : <strong>{lastScanSummary.apps_scanned}</strong> apps scannées,{' '}
          <strong>{lastScanSummary.total_items_detected}</strong> items détectés
          {lastScanSummary.total_critical > 0 && (
            <>, dont <strong>{lastScanSummary.total_critical}</strong> critiques</>
          )}
          .
        </div>
      )}

      {error && (
        <div className="mb-4 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[12px]">
          {error}
        </div>
      )}

      {/* ─── Stats strip ───────────────────────────────────────────────── */}
      <section className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile
          icon={Shield}
          label="Items détectés"
          value={String(stats.total)}
          hint={stats.total === 0 ? 'aucun scan effectué' : `sur ${stats.apps.length} app${stats.apps.length > 1 ? 's' : ''}`}
        />
        <StatTile
          icon={AlertTriangle}
          label="P0 critiques"
          value={String(stats.byPriority[0].count)}
          accent={stats.byPriority[0].count > 0 ? 'red' : 'neutral'}
          hint={stats.byPriority[0].count > 0 ? '< 72h cible' : 'aucun bloqueur'}
        />
        <StatTile
          icon={Wrench}
          label="P1 hauts"
          value={String(stats.byPriority[1].count)}
          accent={stats.byPriority[1].count > 0 ? 'amber' : 'neutral'}
          hint={stats.byPriority[1].count > 0 ? 'sprint courant' : 'aucun urgent'}
        />
        <StatTile
          icon={CheckCircle2}
          label="Score moyen"
          value={stats.auditedApps > 0 ? `${stats.avgScore.toFixed(0)}/100` : '—'}
          accent={
            stats.avgScore >= 75 ? 'emerald' : stats.avgScore >= 50 ? 'amber' : stats.avgScore > 0 ? 'red' : 'neutral'
          }
          hint={stats.auditedApps > 0 ? `${stats.auditedApps} apps auditées (30j)` : 'pas encore audité'}
        />
        <StatTile
          icon={stats.degrading > stats.improving ? TrendingDown : TrendingUp}
          label="Trend hebdo"
          value={`${stats.improving}/${stats.degrading}`}
          accent={stats.degrading > stats.improving ? 'red' : stats.improving > 0 ? 'emerald' : 'neutral'}
          hint="improving / degrading"
        />
      </section>

      {/* ─── Filter pills ──────────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 mr-1">Priorité :</span>
        {(['all', ...PRIORITY_ORDER] as const).map((p) => {
          const active = priorityFilter === p;
          const count = p === 'all' ? rows.length : rows.filter((r) => r.priority === p).length;
          if (p !== 'all' && count === 0) return null;
          return (
            <button
              key={p}
              type="button"
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-md text-[11.5px] border transition ${
                active
                  ? 'bg-admin-accent/15 text-admin-accent border-admin-accent/30'
                  : 'border-white/10 text-neutral-400 hover:bg-white/5'
              }`}
            >
              {p === 'all' ? 'Toutes' : p}
              <span className="ml-1 opacity-70 text-[10px]">{count}</span>
            </button>
          );
        })}

        {stats.apps.length > 0 && (
          <>
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 ml-3 mr-1">App :</span>
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="px-2 py-1 rounded-md border border-white/10 bg-onyx-light/30 text-neutral-300 text-[11.5px] focus:border-admin-accent focus:outline-none"
            >
              <option value="all">Toutes les apps</option>
              {stats.apps.map((app) => (
                <option key={app} value={app}>
                  {app}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* ─── Empty state ───────────────────────────────────────────────── */}
      {!loading && rows.length === 0 && (
        <EmptyState auditsLoading={auditsLoading} />
      )}

      {/* ─── Items grouped by app ──────────────────────────────────────── */}
      {loading ? (
        <p className="text-neutral-500 text-sm py-12 text-center">Chargement du backlog...</p>
      ) : (
        <div className="space-y-5">
          {grouped.map(([app, items]) => {
            const audit = audits.find((a) => a.app_concerned === app);
            return (
              <section key={app} className="rounded-xl border border-white/10 bg-onyx-light/30 overflow-hidden">
                {/* App header */}
                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-onyx-light/20 border-b border-white/5">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-neutral-light text-[13px] font-semibold font-mono truncate">{app}</h3>
                    <span className="text-[10px] text-neutral-600">·</span>
                    <span className="text-[10.5px] text-neutral-500">
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  {audit && (
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-neutral-400">
                        Score{' '}
                        <span
                          className={`font-mono font-semibold ${
                            (audit.score ?? 0) >= 75
                              ? 'text-emerald-300'
                              : (audit.score ?? 0) >= 50
                                ? 'text-amber-300'
                                : 'text-red-300'
                          }`}
                        >
                          {audit.score?.toFixed(0) ?? '—'}/100
                        </span>
                      </span>
                      {audit.trend && (
                        <span className={`inline-flex items-center gap-1 ${TREND_CLASSES[audit.trend]}`}>
                          {audit.trend === 'improving' ? (
                            <TrendingUp size={11} />
                          ) : audit.trend === 'degrading' ? (
                            <TrendingDown size={11} />
                          ) : (
                            <Minus size={11} />
                          )}
                          {TREND_LABELS[audit.trend]}
                        </span>
                      )}
                      <span className="text-neutral-600">{timeAgoFr(audit.created_at)}</span>
                    </div>
                  )}
                </div>

                {/* Items list */}
                <ul className="divide-y divide-white/5">
                  {items.map((item) => (
                    <TechDebtRow key={item.id} item={item} onClick={() => setSelected(item)} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── Detail modal ──────────────────────────────────────────────── */}
      {selected && (
        <AdminModal
          open
          onClose={() => setSelected(null)}
          title={selected.title}
          subtitle={`${selected.app_concerned} · ${TECH_DEBT_CATEGORY_LABELS[selected.category]}`}
          size="xl"
          footer={
            <>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-3 py-1.5 rounded-lg border border-white/10 text-neutral-300 hover:bg-white/5 text-[12px]"
              >
                Fermer
              </button>
              <button
                type="button"
                disabled={pendingId === selected.id || selected.status === 'wont_fix'}
                onClick={() => handleUpdate('wont_fix')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-neutral-400 hover:bg-white/5 disabled:opacity-40 text-[12px]"
              >
                <XCircle size={12} />
                Ne pas corriger
              </button>
              <button
                type="button"
                disabled={pendingId === selected.id || selected.status === 'qualified'}
                onClick={() => handleUpdate('qualified')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 hover:bg-blue-500/30 disabled:opacity-40 text-[12px] font-semibold"
              >
                <ArrowDownToLine size={12} />
                Qualifier
              </button>
            </>
          }
        >
          <DetailContent item={selected} />
        </AdminModal>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function TechDebtRow({
  item,
  onClick,
}: {
  item: TechDebtPriorityRow;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold w-8 text-center ${TECH_DEBT_PRIORITY_CLASSES[item.priority]}`}
          >
            {item.priority}
          </span>
          <span
            className={`px-1.5 py-0.5 rounded-md border text-[10px] ${TECH_DEBT_SEVERITY_CLASSES[item.severity]}`}
          >
            {item.severity}
          </span>
          <span className="text-[10.5px] text-neutral-500 font-mono">
            {TECH_DEBT_CATEGORY_LABELS[item.category]}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-neutral-200 text-[12.5px] truncate">{item.title}</p>
            {item.description && (
              <p className="text-neutral-500 text-[11px] truncate">{item.description}</p>
            )}
          </div>
          <span
            className={`px-1.5 py-0.5 rounded-md border text-[10px] ${TECH_DEBT_STATUS_CLASSES[item.status]}`}
          >
            {TECH_DEBT_STATUS_LABELS[item.status]}
          </span>
          {item.effort_estimate && (
            <span className="text-[10px] text-neutral-500 font-mono w-6 text-center">
              {item.effort_estimate}
            </span>
          )}
          {item.files_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500">
              <FileText size={10} />
              {item.files_count}
            </span>
          )}
          <ChevronRight size={13} className="text-neutral-600 group-hover:text-admin-accent" />
        </div>
      </button>
    </li>
  );
}

function DetailContent({ item }: { item: TechDebtPriorityRow }) {
  return (
    <div className="space-y-4">
      {/* Badges row */}
      <div className="flex flex-wrap gap-2">
        <Badge label={`Priorité ${item.priority}`} className={TECH_DEBT_PRIORITY_CLASSES[item.priority]} />
        <Badge label={`Severity ${item.severity}`} className={TECH_DEBT_SEVERITY_CLASSES[item.severity]} />
        <Badge
          label={TECH_DEBT_CATEGORY_LABELS[item.category]}
          className="bg-white/5 border-white/10 text-neutral-300"
        />
        <Badge
          label={TECH_DEBT_STATUS_LABELS[item.status]}
          className={TECH_DEBT_STATUS_CLASSES[item.status]}
        />
        {item.effort_estimate && (
          <Badge
            label={`Effort ${item.effort_estimate}`}
            className="bg-white/5 border-white/10 text-neutral-400"
          />
        )}
      </div>

      {/* Description */}
      {item.description && (
        <div>
          <Label>Description</Label>
          <p className="text-neutral-300 text-[13px] leading-relaxed whitespace-pre-line">
            {item.description}
          </p>
        </div>
      )}

      {/* Metric */}
      {item.detected_metric && Object.keys(item.detected_metric).length > 0 && (
        <div>
          <Label>Métriques détectées</Label>
          <div className="rounded-lg border border-white/10 bg-onyx-light/30 p-3">
            <pre className="text-[11.5px] text-neutral-300 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(item.detected_metric, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Files */}
      {item.file_paths && item.file_paths.length > 0 && (
        <div>
          <Label>Fichiers concernés ({item.file_paths.length})</Label>
          <ul className="rounded-lg border border-white/10 bg-onyx-light/30 divide-y divide-white/5">
            {item.file_paths.map((path) => (
              <li
                key={path}
                className="px-3 py-1.5 text-[11.5px] text-neutral-300 font-mono break-all"
              >
                {path}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fix branch */}
      {item.fix_branch && (
        <div>
          <Label>Branche de correction</Label>
          <code className="inline-block px-2 py-1 rounded bg-white/5 border border-white/10 text-[11.5px] text-admin-accent font-mono">
            {item.fix_branch}
          </code>
        </div>
      )}

      {/* Timestamps */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 text-[11px] text-neutral-500">
        <div>
          <Label>Détecté</Label>
          {timeAgoFr(item.created_at)}
        </div>
        <div>
          <Label>Mis à jour</Label>
          {timeAgoFr(item.updated_at)}
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'neutral',
}: {
  icon: typeof Shield;
  label: string;
  value: string;
  hint?: string;
  accent?: 'neutral' | 'emerald' | 'amber' | 'red';
}) {
  const valueColor = {
    neutral: 'text-neutral-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
  }[accent];
  return (
    <div className="rounded-xl border border-white/10 bg-onyx-light/30 p-3">
      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-neutral-500 uppercase tracking-wider">
        <Icon size={10} />
        {label}
      </div>
      <div className={`text-xl font-bold ${valueColor}`}>{value}</div>
      {hint && <p className="text-neutral-600 text-[10.5px] mt-0.5 truncate">{hint}</p>}
    </div>
  );
}

function Badge({ label, className }: { label: string; className: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-md border text-[11px] font-medium ${className}`}>
      {label}
    </span>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9.5px] uppercase tracking-widest text-neutral-500 mb-1">{children}</p>
  );
}

function EmptyState({ auditsLoading }: { auditsLoading: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-onyx-light/20 py-16 text-center px-6">
      <div className="mx-auto w-12 h-12 rounded-2xl bg-admin-accent/15 text-admin-accent flex items-center justify-center mb-4">
        {auditsLoading ? <Clock size={20} /> : <Shield size={20} />}
      </div>
      <h2 className="text-neutral-light text-[15px] font-semibold mb-1">
        Aucun item de dette technique
      </h2>
      <p className="text-neutral-500 text-[12.5px] max-w-md mx-auto leading-relaxed mb-4">
        Le Tech Debt Agent n'a pas encore tourné, ou tous les items ont été résolus.
        Le scan automatique se déclenche chaque lundi à 6h.
      </p>
      <p className="text-neutral-600 text-[11px]">
        Edge Function <code className="font-mono text-admin-accent">asvc-tech-debt-scan</code> à implémenter
        pour produire les premiers audits.
      </p>
    </div>
  );
}
