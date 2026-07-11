/**
 * StartTrialButton.tsx — Bouton "Essayer gratuitement"
 *
 * A placer sur les cartes d'app de la marketplace publique
 * (/applications, /applications/:id, etc.).
 *
 * Si l'utilisateur n'est pas connecte, on le redirige vers /portal/login
 * en preservant la route actuelle dans ?next= pour revenir apres login.
 */

import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface StartTrialButtonProps {
  appId: string;
  appName: string;
  defaultPlan?: string;
  trialDays?: number;
  className?: string;
  onSuccess?: (data: { redirectUrl?: string; message?: string }) => void;
}

interface StartTrialResponse {
  ok?: boolean;
  redirectUrl?: string;
  message?: string;
  error?: string;
}

export function StartTrialButton({
  appId,
  appName,
  defaultPlan,
  trialDays = 14,
  className,
  onSuccess,
}: StartTrialButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<StartTrialResponse | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/portal/login?next=${next}`;
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Configuration Supabase manquante.");
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/start-trial`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({ appId, plan: defaultPlan, trial_days: trialDays }),
      });

      const data = (await res.json()) as StartTrialResponse;
      if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);

      setSuccess(data);
      onSuccess?.(data);

      setTimeout(() => {
        window.location.href = data.redirectUrl || "/portal";
      }, 1500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-[13px] font-medium ${className ?? ""}`}
        role="status"
      >
        <CheckCircle2 size={16} strokeWidth={2} />
        <span>{success.message || `Trial ${appName} active`}</span>
        <span className="text-emerald-300/60 text-[11px]">— Redirection…</span>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[13px] font-semibold hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" strokeWidth={2} />
        ) : (
          <Sparkles size={15} strokeWidth={2} />
        )}
        {loading ? "Activation…" : `Essayer ${trialDays}j gratuit`}
      </button>
      {error && (
        <p className="mt-2 text-[12px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default StartTrialButton;
