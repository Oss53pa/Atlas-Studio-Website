import { useState } from "react";
import { CheckCircle2, XCircle, Play, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface TestResult {
  tool: string;
  category: string;
  ok: boolean;
  duration_ms: number;
  error?: string;
  preview?: string;
}

interface TestReport {
  total_duration_ms: number;
  summary: { total: number; passed: number; failed: number; success_rate: number };
  by_category: Record<string, { passed: number; failed: number }>;
  results: TestResult[];
}

export function Proph3tTestRunner({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const runTests = async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const { data, error: invokeErr } = await supabase.functions.invoke("proph3t-test", { body: {} });
      if (invokeErr) throw invokeErr;
      setReport(data as TestReport);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  const categories = report ? Object.keys(report.by_category).sort() : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-admin-surface rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-border dark:border-admin-surface-alt">
          <div>
            <h2 className="text-neutral-text dark:text-admin-text text-lg font-bold">
              Suite de tests <span className="font-logo text-gold dark:text-admin-accent">Proph3t</span>
            </h2>
            <p className="text-neutral-muted dark:text-admin-muted text-[12px]">
              Execute les 28 cas Core L1 + 10 cas FINANCE L2 sur la prod
            </p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-text dark:text-admin-text text-2xl leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!report && !running && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/10 mb-4">
                <Play size={28} className="text-gold dark:text-admin-accent" />
              </div>
              <p className="text-neutral-text dark:text-admin-text text-sm mb-1">Pret a tester les 38 tools.</p>
              <p className="text-neutral-muted dark:text-admin-muted text-[12px] mb-6">
                Cela va appeler <code className="bg-warm-bg dark:bg-admin-surface-alt px-1.5 py-0.5 rounded">proph3t-test</code> en mode admin.
              </p>
              <button onClick={runTests}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold dark:bg-admin-accent text-black font-semibold rounded-lg hover:bg-gold-dark transition-colors">
                <Play size={14} /> Lancer les tests
              </button>
            </div>
          )}

          {running && (
            <div className="text-center py-12">
              <Loader2 size={32} className="mx-auto text-gold dark:text-admin-accent animate-spin mb-3" />
              <p className="text-neutral-text dark:text-admin-text text-sm">Execution des 38 tests en cours...</p>
              <p className="text-neutral-muted dark:text-admin-muted text-[12px] mt-1">Cela peut prendre 10-30 secondes.</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5">
              <div className="text-red-700 text-sm font-semibold mb-1">Echec du test runner</div>
              <p className="text-red-600 text-[12px]">{error}</p>
              <button onClick={runTests} className="mt-3 text-red-700 text-[12px] underline">Reessayer</button>
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-warm-bg dark:bg-admin-surface-alt rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-neutral-text dark:text-admin-text">{report.summary.total}</div>
                  <div className="text-[11px] text-neutral-muted dark:text-admin-muted uppercase tracking-wider">Tests</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <div className="text-3xl font-bold text-emerald-600">{report.summary.passed}</div>
                  <div className="text-[11px] text-emerald-700 uppercase tracking-wider">Reussis</div>
                </div>
                <div className={`${report.summary.failed > 0 ? "bg-red-50" : "bg-warm-bg dark:bg-admin-surface-alt"} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${report.summary.failed > 0 ? "text-red-600" : "text-neutral-muted dark:text-admin-muted"}`}>
                    {report.summary.failed}
                  </div>
                  <div className={`text-[11px] uppercase tracking-wider ${report.summary.failed > 0 ? "text-red-700" : "text-neutral-muted dark:text-admin-muted"}`}>
                    Echoues
                  </div>
                </div>
                <div className={`${report.summary.success_rate >= 90 ? "bg-emerald-50" : report.summary.success_rate >= 70 ? "bg-amber-50" : "bg-red-50"} rounded-xl p-4 text-center`}>
                  <div className={`text-3xl font-bold ${report.summary.success_rate >= 90 ? "text-emerald-600" : report.summary.success_rate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                    {report.summary.success_rate}%
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-neutral-muted dark:text-admin-muted">Taux</div>
                </div>
              </div>

              <div className="text-[11px] text-neutral-muted dark:text-admin-muted text-right">
                Duree totale : {(report.total_duration_ms / 1000).toFixed(2)}s
              </div>

              {/* By category */}
              <div className="space-y-2">
                {categories.map(cat => {
                  const stats = report.by_category[cat];
                  const total = stats.passed + stats.failed;
                  const expanded = expandedCat === cat;
                  const catResults = report.results.filter(r => r.category === cat);
                  const allOk = stats.failed === 0;
                  return (
                    <div key={cat} className="border border-warm-border dark:border-admin-surface-alt rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedCat(expanded ? null : cat)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-warm-bg dark:hover:bg-admin-surface-alt transition-colors">
                        {expanded ? <ChevronDown size={14} className="text-neutral-muted dark:text-admin-muted" /> : <ChevronRight size={14} className="text-neutral-muted dark:text-admin-muted" />}
                        {allOk
                          ? <CheckCircle2 size={16} className="text-emerald-500" />
                          : <XCircle size={16} className="text-red-500" />}
                        <span className="text-neutral-text dark:text-admin-text text-sm font-medium flex-1 text-left">{cat}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${allOk ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {stats.passed}/{total}
                        </span>
                      </button>
                      {expanded && (
                        <div className="px-4 pb-3 pt-1 space-y-1.5 bg-warm-bg/50 dark:bg-admin-surface-alt/30">
                          {catResults.map(r => (
                            <div key={r.tool} className="flex items-start gap-2 py-1">
                              {r.ok
                                ? <CheckCircle2 size={12} className="text-emerald-500 flex-shrink-0 mt-1" />
                                : <XCircle size={12} className="text-red-500 flex-shrink-0 mt-1" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <code className="text-neutral-text dark:text-admin-text text-[12px] font-mono">{r.tool}</code>
                                  <span className="text-neutral-muted dark:text-admin-muted text-[10px]">{r.duration_ms}ms</span>
                                </div>
                                {r.error && <div className="text-red-600 text-[11px] mt-0.5 break-all">{r.error}</div>}
                                {r.preview && r.ok && (
                                  <div className="text-neutral-muted dark:text-admin-muted text-[10px] mt-0.5 font-mono truncate" title={r.preview}>
                                    {r.preview}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button onClick={runTests}
                  className="inline-flex items-center gap-2 px-4 py-2 text-[13px] border border-warm-border dark:border-admin-surface-alt rounded-lg hover:border-gold/40 transition-colors text-neutral-text dark:text-admin-text">
                  <Play size={12} /> Relancer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
