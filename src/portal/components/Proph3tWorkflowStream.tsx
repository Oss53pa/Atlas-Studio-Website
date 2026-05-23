import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface StreamStep {
  step: number;
  tool: string;
  label: string;
  status: "running" | "done" | "failed";
  duration_ms?: number;
  preview?: string;
  error?: string;
}

interface Props {
  open: boolean;
  workflow_name: string;
  args: Record<string, unknown>;
  onClose: () => void;
  onComplete?: (result: unknown) => void;
}

/**
 * Composant qui execute un workflow Proph3t via SSE et affiche
 * la progression step-by-step en live.
 */
export function Proph3tWorkflowStream({ open, workflow_name, args, onClose, onComplete }: Props) {
  const [steps, setSteps] = useState<StreamStep[]>([]);
  const [status, setStatus] = useState<"connecting" | "running" | "complete" | "error">("connecting");
  const [finalResult, setFinalResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;

    setSteps([]);
    setStatus("connecting");
    setFinalResult(null);
    setError(null);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    (async () => {
      try {
        // Recuperer le JWT
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Pas de session");

        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/proph3t-workflow-stream`;
        const resp = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
            "Accept": "text/event-stream",
          },
          body: JSON.stringify({ workflow_name, args }),
          signal: ctrl.signal,
        });

        if (!resp.ok) {
          const t = await resp.text();
          throw new Error(`HTTP ${resp.status}: ${t.slice(0, 200)}`);
        }
        if (!resp.body) throw new Error("Pas de stream body");

        setStatus("running");
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch (e) {
              console.warn("[wf-stream] parse error", e);
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError((e as Error).message);
          setStatus("error");
        }
      }
    })();

    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, workflow_name]);

  const handleEvent = (event: any) => {
    if (event.type === "started") {
      setStatus("running");
    } else if (event.type === "step_start") {
      setSteps(prev => [...prev, {
        step: event.step,
        tool: event.tool,
        label: event.label,
        status: "running",
      }]);
    } else if (event.type === "step_done") {
      setSteps(prev => prev.map(s =>
        s.step === event.step
          ? { ...s, status: event.ok ? "done" : "failed", duration_ms: event.duration_ms, preview: event.preview, error: event.error }
          : s,
      ));
    } else if (event.type === "complete") {
      setFinalResult(event.result);
      setStatus("complete");
      if (onComplete) onComplete(event.result);
    } else if (event.type === "error") {
      setError(event.message);
      setStatus("error");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-ink-100 border border-white/[0.06] rounded-3xl shadow-elev-5 max-w-2xl w-full max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 className="text-neutral-light text-base font-semibold flex items-center gap-2">
              <Sparkles size={16} className="text-gold" />
              <span className="font-logo text-gold">Proph3t</span>
              <span className="text-neutral-400 font-normal text-sm">execute le workflow</span>
            </h2>
            <p className="text-neutral-500 text-[12px] mt-0.5"><code>{workflow_name}</code></p>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-light text-2xl leading-none">×</button>
        </div>

        {/* Steps */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {status === "connecting" && (
            <div className="flex items-center gap-2 text-neutral-400 text-[13px]">
              <Loader2 size={14} className="animate-spin" /> Connexion au workflow...
            </div>
          )}

          {steps.map(s => (
            <div key={s.step} className={`border rounded-xl p-3.5 transition-colors ${
              s.status === "running" ? "border-gold/50 bg-gold/5"
              : s.status === "done" ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-red-500/30 bg-red-500/5"
            }`}>
              <div className="flex items-center gap-2 text-[13px]">
                {s.status === "running" && <Loader2 size={13} className="animate-spin text-gold flex-shrink-0" />}
                {s.status === "done" && <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />}
                {s.status === "failed" && <XCircle size={13} className="text-red-400 flex-shrink-0" />}
                <span className="text-neutral-light flex-1">{s.label}</span>
                {s.duration_ms !== undefined && (
                  <span className="text-neutral-500 text-[11px]">{s.duration_ms}ms</span>
                )}
              </div>
              {s.error && <div className="mt-1.5 text-[11px] text-red-400 break-all">{s.error}</div>}
              {s.preview && s.status === "done" && (
                <div className="mt-1.5 text-[10px] text-neutral-500 font-mono truncate" title={s.preview}>
                  {s.preview}
                </div>
              )}
            </div>
          ))}

          {status === "complete" && finalResult && (
            <div className="border border-gold/30 bg-gold/10 rounded-xl p-3.5 mt-3">
              <div className="flex items-center gap-2 text-gold text-[13px] font-semibold mb-2">
                <CheckCircle2 size={14} /> Workflow termine avec succes
              </div>
              {(finalResult as any)?.report_markdown ? (
                <div className="text-neutral-light text-[12px] whitespace-pre-wrap max-h-64 overflow-y-auto bg-onyx/50 p-3.5 rounded-lg">
                  {(finalResult as any).report_markdown.slice(0, 2000)}
                  {(finalResult as any).report_markdown.length > 2000 && "\n\n... (tronque)"}
                </div>
              ) : (
                <pre className="text-[10px] text-neutral-400 overflow-x-auto">{JSON.stringify(finalResult, null, 2).slice(0, 1500)}</pre>
              )}
            </div>
          )}

          {error && (
            <div className="border border-red-500/30 bg-red-500/10 rounded-xl p-3.5 mt-3">
              <div className="text-red-400 text-[13px] font-semibold">Erreur</div>
              <div className="text-red-300 text-[12px] mt-1">{error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-neutral-500 text-[11px]">
            {steps.length} etapes {status === "complete" ? "completees" : status === "running" ? "en cours" : ""}
          </span>
          <button onClick={onClose} className="text-[12px] px-4 py-2 bg-white/10 hover:bg-white/[0.16] text-neutral-light rounded-xl transition-colors">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
