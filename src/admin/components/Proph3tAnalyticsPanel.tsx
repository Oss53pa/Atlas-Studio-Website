import { useEffect, useState } from "react";
import { BarChart3, Loader2, Activity, Cpu, Database, X, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface AnalyticsReport {
  ok: boolean;
  period_days: number;
  since: string;
  summary: { total_messages: number; avg_latency_ms: number; avg_confidence: number };
  models: { model: string; count: number; avg_latency_ms: number; avg_confidence: number }[];
  daily_volume: { date: string; count: number }[];
  top_tools: { tool: string; count: number }[];
  top_actions: { action: string; count: number }[];
  registry: { total: number; by_level: { l1: number; l2: number }; by_domain: Record<string, number> };
}

export function Proph3tAnalyticsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, period]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("proph3t-analytics", {
        body: { period_days: period },
      });
      if (invokeErr) throw invokeErr;
      setReport(data as AnalyticsReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const maxDailyCount = report ? Math.max(...report.daily_volume.map(d => d.count), 1) : 1;
  const maxToolCount = report ? Math.max(...report.top_tools.map(t => t.count), 1) : 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-admin-surface rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border dark:border-admin-surface-alt">
          <div>
            <h2 className="text-neutral-text dark:text-admin-text text-lg font-bold flex items-center gap-2">
              <BarChart3 size={18} className="text-gold dark:text-admin-accent" />
              Analytics <span className="font-logo text-gold dark:text-admin-accent">Proph3t</span>
            </h2>
            <p className="text-neutral-muted dark:text-admin-muted text-[12px]">Utilisation des tools et performance des LLMs</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={period} onChange={e => setPeriod(Number(e.target.value) as 7 | 30 | 90)}
              className="text-[12px] border border-warm-border dark:border-admin-surface-alt rounded-lg px-3 py-1.5 bg-white dark:bg-admin-surface-alt text-neutral-text dark:text-admin-text">
              <option value={7}>7 jours</option>
              <option value={30}>30 jours</option>
              <option value={90}>90 jours</option>
            </select>
            <button onClick={load} disabled={loading}
              className="p-2 rounded-lg hover:bg-warm-bg dark:hover:bg-admin-surface-alt text-neutral-text dark:text-admin-text">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={onClose} className="text-neutral-500 hover:text-neutral-text dark:text-admin-text text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading && (
            <div className="text-center py-12">
              <Loader2 size={28} className="mx-auto animate-spin text-gold dark:text-admin-accent" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-[13px]">
              <strong>Erreur :</strong> {error}
            </div>
          )}

          {report && !loading && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <KpiCard icon={<Activity size={16} />} label="Conversations" value={report.summary.total_messages.toString()} />
                <KpiCard icon={<Cpu size={16} />} label="Latence moyenne" value={`${(report.summary.avg_latency_ms / 1000).toFixed(1)}s`} />
                <KpiCard icon={<BarChart3 size={16} />} label="Confidence moyenne" value={`${report.summary.avg_confidence}/100`} />
                <KpiCard icon={<Database size={16} />} label="Tools registry" value={`${report.registry.total}`} sublabel={`${report.registry.by_level.l1} L1 + ${report.registry.by_level.l2} L2`} />
              </div>

              {/* Volume par jour */}
              <Section title="Volume conversations / jour">
                {report.daily_volume.length === 0 ? (
                  <div className="text-neutral-muted dark:text-admin-muted text-[12px]">Aucune donnee sur la periode</div>
                ) : (
                  <div className="flex items-end gap-1 h-40">
                    {report.daily_volume.map(d => (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                        <div className="w-full bg-gold dark:bg-admin-accent rounded-t opacity-70 hover:opacity-100 transition-opacity"
                          style={{ height: `${(d.count / maxDailyCount) * 100}%` }}
                          title={`${d.date} : ${d.count}`}
                        />
                        <span className="text-[9px] text-neutral-muted dark:text-admin-muted truncate w-full text-center">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              <div className="grid grid-cols-2 gap-4">
                {/* Models */}
                <Section title="Modeles utilises">
                  {report.models.length === 0 ? (
                    <div className="text-neutral-muted dark:text-admin-muted text-[12px]">Aucun appel sur la periode</div>
                  ) : (
                    <div className="space-y-2">
                      {report.models.map(m => (
                        <div key={m.model} className="flex items-center justify-between text-[12px]">
                          <code className="text-neutral-text dark:text-admin-text font-mono truncate flex-1">{m.model}</code>
                          <div className="flex items-center gap-3 text-neutral-muted dark:text-admin-muted">
                            <span>{m.count} req</span>
                            <span>{(m.avg_latency_ms / 1000).toFixed(1)}s</span>
                            <span>{m.avg_confidence}/100</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>

                {/* Top tools */}
                <Section title="Top tools utilises">
                  {report.top_tools.length === 0 ? (
                    <div className="text-neutral-muted dark:text-admin-muted text-[12px]">Aucun tool appele</div>
                  ) : (
                    <div className="space-y-1.5">
                      {report.top_tools.map(t => (
                        <div key={t.tool} className="flex items-center gap-2 text-[12px]">
                          <code className="text-neutral-text dark:text-admin-text font-mono w-48 truncate">{t.tool}</code>
                          <div className="flex-1 h-3 bg-warm-bg dark:bg-admin-surface-alt rounded">
                            <div className="h-full bg-gold dark:bg-admin-accent rounded"
                              style={{ width: `${(t.count / maxToolCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-neutral-muted dark:text-admin-muted w-8 text-right">{t.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              </div>

              {/* Domains breakdown */}
              <Section title="Tools par domaine">
                <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(report.registry.by_domain).sort((a, b) => b[1] - a[1]).map(([domain, count]) => (
                    <div key={domain} className="flex items-center justify-between px-3 py-2 bg-warm-bg dark:bg-admin-surface-alt rounded-lg text-[12px]">
                      <span className="text-neutral-text dark:text-admin-text">{domain}</span>
                      <span className="text-gold dark:text-admin-accent font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Actions */}
              <Section title="Top actions audit">
                <div className="space-y-1 text-[12px]">
                  {report.top_actions.slice(0, 10).map(a => (
                    <div key={a.action} className="flex items-center justify-between border-b border-warm-border dark:border-admin-surface-alt pb-1">
                      <code className="text-neutral-text dark:text-admin-text">{a.action}</code>
                      <span className="text-neutral-muted dark:text-admin-muted">{a.count}</span>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sublabel }: { icon: React.ReactNode; label: string; value: string; sublabel?: string }) {
  return (
    <div className="bg-warm-bg dark:bg-admin-surface-alt rounded-xl p-4">
      <div className="flex items-center gap-2 text-neutral-muted dark:text-admin-muted mb-1">
        {icon}
        <span className="text-[11px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-neutral-text dark:text-admin-text">{value}</div>
      {sublabel && <div className="text-[10px] text-neutral-muted dark:text-admin-muted mt-0.5">{sublabel}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] uppercase tracking-wider text-neutral-muted dark:text-admin-muted font-semibold mb-2">{title}</h3>
      <div className="bg-white dark:bg-admin-surface border border-warm-border dark:border-admin-surface-alt rounded-xl p-4">
        {children}
      </div>
    </div>
  );
}
