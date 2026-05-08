import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, Loader2, Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { AuthInput } from "./AuthInput";

/**
 * /portal/forgot-password — Demande de réinitialisation de mot de passe.
 * L'utilisateur saisit son email, Supabase envoie un magic link vers
 * /portal/reset-password (avec token dans l'URL).
 */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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
    const redirectTo = `${window.location.origin}/portal/reset-password`;
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo,
    });
    setLoading(false);

    if (err) {
      // Pour la sécurité, on ne révèle pas si l'email existe ou non.
      // On affiche le succès dans tous les cas SAUF si c'est un rate limit.
      if (err.message.toLowerCase().includes("rate limit")) {
        setError("Trop de demandes. Réessayez dans quelques minutes.");
        return;
      }
    }
    // Toujours afficher le message de succès pour ne pas leak l'existence d'un compte
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout
        title="Email envoyé"
        backHref="/portal/login"
        backLabel="Retour à la connexion"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-400" strokeWidth={1.8} />
          </div>
          <p className="text-neutral-light text-sm leading-relaxed mb-3">
            Si un compte existe avec <span className="font-semibold text-gold">{email}</span>,
            vous recevrez un email avec un lien pour réinitialiser votre mot de passe.
          </p>
          <p className="text-neutral-muted text-[12px] leading-relaxed">
            Pensez à vérifier votre dossier spam si vous ne recevez rien sous quelques minutes.
          </p>
          <Link to="/portal/login" className="btn-outline-light w-full mt-7 inline-block">
            Retour à la connexion
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      subtitle="Entrez votre email — nous vous enverrons un lien pour le réinitialiser."
      backHref="/portal/login"
      backLabel="Retour à la connexion"
    >
      <form onSubmit={handleSubmit} noValidate>
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
              Envoyer le lien
              <ArrowRight size={16} strokeWidth={2.2} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}
