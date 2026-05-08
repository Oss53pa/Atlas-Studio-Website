import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { AuthInput } from "./AuthInput";

/**
 * /portal/reset-password — Définition d'un nouveau mot de passe.
 *
 * Atterrissage depuis le lien email Supabase :
 * URL = /portal/reset-password#access_token=...&type=recovery&...
 * Supabase JS SDK détecte automatiquement le hash et établit une session
 * "recovery" via onAuthStateChange (PASSWORD_RECOVERY event).
 */
export default function ResetPasswordPage() {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ pwd?: string; confirm?: string }>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // État de la session de recovery
  const [recoveryReady, setRecoveryReady] = useState<"checking" | "valid" | "invalid">(
    "checking"
  );

  useEffect(() => {
    // Le SDK Supabase parse le hash automatiquement et déclenche
    // l'event PASSWORD_RECOVERY si le lien email est valide.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady("valid");
      }
    });

    // Au cas où le hash a déjà été consommé (page rafraîchie après login recovery),
    // on vérifie aussi la session actuelle.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setRecoveryReady("valid");
      } else {
        // On laisse 1.5s pour que l'event arrive (cas page chargée fraîchement)
        setTimeout(() => {
          setRecoveryReady((current) => (current === "checking" ? "invalid" : current));
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    const errs: typeof errors = {};
    if (!newPassword) errs.pwd = "Mot de passe requis";
    else if (newPassword.length < 8) errs.pwd = "Min. 8 caractères";
    if (!confirmPassword) errs.confirm = "Confirmation requise";
    else if (newPassword !== confirmPassword) errs.confirm = "Les mots de passe ne correspondent pas";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (err) {
      setGlobalError(translateError(err.message));
      return;
    }

    setSuccess(true);
    // Redirection automatique vers /portal après 2s
    setTimeout(() => navigate("/portal", { replace: true }), 2000);
  };

  // Lien expiré ou invalide
  if (recoveryReady === "invalid") {
    return (
      <AuthLayout
        title="Lien expiré"
        backHref="/portal/forgot-password"
        backLabel="Demander un nouveau lien"
      >
        <p className="text-neutral-muted text-sm leading-relaxed mb-6">
          Le lien de réinitialisation est invalide ou a expiré. Demandez un nouvel email pour réinitialiser
          votre mot de passe.
        </p>
        <Link to="/portal/forgot-password" className="btn-gold w-full inline-flex">
          Demander un nouveau lien
          <ArrowRight size={16} strokeWidth={2.2} />
        </Link>
      </AuthLayout>
    );
  }

  // Loading state
  if (recoveryReady === "checking") {
    return (
      <AuthLayout title="Vérification…">
        <div className="flex items-center justify-center py-6">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      </AuthLayout>
    );
  }

  // Succès
  if (success) {
    return (
      <AuthLayout title="Mot de passe modifié">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/30 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-emerald-400" strokeWidth={1.8} />
          </div>
          <p className="text-neutral-light text-sm leading-relaxed mb-2">
            Votre mot de passe a été mis à jour.
          </p>
          <p className="text-neutral-muted text-[12px]">Redirection vers votre espace…</p>
        </div>
      </AuthLayout>
    );
  }

  // Formulaire de reset
  return (
    <AuthLayout
      title="Nouveau mot de passe"
      subtitle="Choisissez un mot de passe d'au moins 8 caractères."
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Nouveau mot de passe"
          type="password"
          value={newPassword}
          onChange={(v) => { setNewPassword(v); setErrors((p) => ({ ...p, pwd: undefined })); }}
          placeholder="Min. 8 caractères"
          required
          autoComplete="new-password"
          error={errors.pwd}
        />
        <AuthInput
          label="Confirmer le mot de passe"
          type="password"
          value={confirmPassword}
          onChange={(v) => { setConfirmPassword(v); setErrors((p) => ({ ...p, confirm: undefined })); }}
          placeholder="Retapez le même mot de passe"
          required
          autoComplete="new-password"
          error={errors.confirm}
        />

        {globalError && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[12px]">
            {globalError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn-gold w-full ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Mise à jour…
            </span>
          ) : (
            <>
              Enregistrer
              <ArrowRight size={16} strokeWidth={2.2} />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("same") || m.includes("different from"))
    return "Le nouveau mot de passe doit être différent de l'ancien.";
  if (m.includes("password")) return "Le mot de passe doit faire au moins 8 caractères.";
  if (m.includes("session") || m.includes("expired"))
    return "Session expirée. Demandez un nouveau lien de réinitialisation.";
  return msg;
}
