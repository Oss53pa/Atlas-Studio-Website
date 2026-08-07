import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { AuthInput } from "./AuthInput";
import { OTPVerification } from "../components/OTPVerification";

/**
 * /portal/forgot-password — Demande de réinitialisation de mot de passe.
 *
 * Flow OTP (centralisé Atlas Studio) :
 *   1. Utilisateur saisit email → POST /functions/v1/send-otp { purpose: "reset_password" }
 *      → email Atlas Studio brandé avec code 6 chiffres
 *   2. UI bascule sur OTPVerification → l'utilisateur saisit le code
 *   3. POST /functions/v1/verify-otp valide → retourne token_hash recovery
 *   4. On consomme le token_hash via supabase.auth.verifyOtp({ type: "recovery" })
 *      → session de recovery établie
 *   5. Navigation vers /portal/reset-password (qui détecte la session active)
 */
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Si on arrive depuis le lien dans l'email (?email=...&step=otp),
  // on saute l'étape email et on affiche direct les inputs OTP.
  const initialEmail = params.get("email")?.trim().toLowerCase() ?? "";
  const initialStep = params.get("step") === "otp" && initialEmail ? "otp" : "email";

  const [step, setStep] = useState<"email" | "otp">(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [emailHint, setEmailHint] = useState(initialEmail ? maskEmail(initialEmail) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exchanging, setExchanging] = useState(false);

  // Si on arrive avec ?step=otp&email=... directement, on suppose que le code
  // vient d'être envoyé (la personne a cliqué sur le bouton de l'email).
  // On affiche le step OTP sans re-déclencher un send-otp (l'utilisateur a
  // déjà reçu son code, il n'y a qu'à le saisir).
  useEffect(() => {
    // Si l'URL contient des params sensibles, on les nettoie après lecture
    // pour éviter qu'ils traînent dans l'historique du navigateur.
    if (initialEmail || params.get("step")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("email");
      url.searchParams.delete("step");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

  const sendCode = async (targetEmail: string) => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Configuration Supabase manquante");
    }
    const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({ email: targetEmail, purpose: "reset_password" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Cas particulier rate limit
      if (res.status === 429) {
        throw new Error("Trop de demandes. Réessayez dans quelques minutes.");
      }
      throw new Error(data?.error || "Impossible d'envoyer le code");
    }
    return data as { email_hint?: string };
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Email requis");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Format d'email invalide");
      return;
    }

    setLoading(true);
    try {
      const out = await sendCode(trimmed);
      setEmailHint(out.email_hint || trimmed);
      setStep("otp");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = async (data: { token_hash?: string; action_link?: string }) => {
    if (!data.token_hash) {
      setError("Réponse invalide du serveur (token_hash manquant)");
      setStep("email");
      return;
    }
    setExchanging(true);
    // Échange le token_hash recovery contre une session de recovery active
    const { error: vErr } = await supabase.auth.verifyOtp({
      token_hash: data.token_hash,
      type: "recovery",
    });
    setExchanging(false);
    if (vErr) {
      setError(`Impossible d'établir la session : ${vErr.message}`);
      setStep("email");
      return;
    }
    // Session recovery établie — ResetPasswordPage la détectera
    navigate("/portal/reset-password", { replace: true });
  };

  const handleResend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) throw new Error("Email manquant");
    await sendCode(trimmed);
  };

  if (step === "otp") {
    return (
      <AuthLayout
        title="Réinitialisation"
        backHref="/portal/login"
        backLabel="Retour à la connexion"
      >
        {exchanging ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 size={24} className="animate-spin text-gold" />
            <p className="text-neutral-muted text-sm">Établissement de la session…</p>
          </div>
        ) : (
          <OTPVerification
            email={email}
            emailHint={emailHint}
            purpose="reset_password"
            onSuccess={handleOtpSuccess}
            onBack={() => { setStep("email"); setError(""); }}
            onResend={handleResend}
          />
        )}
        {error && (
          <div className="mt-4 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-700 text-[12px]">
            {error}
          </div>
        )}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Entrez votre email — nous vous enverrons un code à 6 chiffres."
      backHref="/portal/login"
      backLabel="Retour à la connexion"
    >
      <form onSubmit={handleEmailSubmit} noValidate>
        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); setError(""); }}
          placeholder="vous@entreprise.com"
          required
          autoComplete="email"
          inputMode="email"
          error={error}
        />

        <button
          type="submit"
          disabled={loading}
          className={`btn-gold w-full mt-2 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Envoi…
            </span>
          ) : (
            <>
              <Mail size={16} strokeWidth={2} />
              Envoyer le code
              <ArrowRight size={16} strokeWidth={2.2} />
            </>
          )}
        </button>

        <p className="text-neutral-muted text-[11.5px] text-center mt-4 leading-relaxed">
          Tu n'as pas de compte ? <Link to="/portal/login" className="text-gold hover:underline">Connexion</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

/** Masque un email pour l'afficher au user (`v***@domain.com`). */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = Math.min(2, local.length);
  return `${local.slice(0, visible)}${"*".repeat(Math.max(0, local.length - visible))}@${domain}`;
}
