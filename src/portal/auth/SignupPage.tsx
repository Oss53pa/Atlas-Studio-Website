import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { AuthLayout } from "./AuthLayout";
import { AuthInput } from "./AuthInput";

/**
 * /portal/signup — Inscription standard.
 * Champs : Nom + Email + Mot de passe + acceptation CGU.
 * Lien : "Se connecter".
 *
 * Après inscription : auto-login + redirection vers /portal.
 */
export default function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [globalError, setGlobalError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError("");

    // Validation locale
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Nom requis";
    if (!email.trim()) errs.email = "Email requis";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Format d'email invalide";
    if (!password) errs.password = "Mot de passe requis";
    else if (password.length < 8)
      errs.password = "Min. 8 caractères";

    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    if (!acceptTerms) {
      setGlobalError("Vous devez accepter les CGU pour créer un compte.");
      return;
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const { error: err } = await signUp(cleanEmail, password, {
      full_name: cleanName,
      company_name: "",
    });

    if (err) {
      setLoading(false);
      setGlobalError(translateError(err));
      return;
    }

    // Marquer les CGU comme acceptées + first_login_completed = true
    // (on saute l'OTP, l'auth est immédiatement utilisable)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const now = new Date().toISOString();
      await supabase
        .from("profiles")
        .update({
          full_name: cleanName,
          terms_accepted_at: now,
          terms_version: "v2.0",
          first_login_completed: true,
        })
        .eq("id", session.user.id);
    }

    setLoading(false);
    navigate("/portal", { replace: true });
  };

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Quelques secondes pour commencer."
    >
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Nom"
          value={name}
          onChange={(v) => { setName(v); setErrors((p) => ({ ...p, name: undefined })); }}
          placeholder="Prénom Nom"
          required
          autoComplete="name"
          error={errors.name}
        />
        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(v) => { setEmail(v); setErrors((p) => ({ ...p, email: undefined })); }}
          placeholder="vous@entreprise.com"
          required
          autoComplete="email"
          inputMode="email"
          error={errors.email}
        />
        <AuthInput
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(v) => { setPassword(v); setErrors((p) => ({ ...p, password: undefined })); }}
          placeholder="Min. 8 caractères"
          required
          autoComplete="new-password"
          error={errors.password}
        />

        {/* CGU */}
        <label className="flex items-start gap-2.5 cursor-pointer mt-2 mb-5">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-neutral-muted text-[12px] leading-snug">
            J'accepte les{" "}
            <Link
              to="/cgu"
              target="_blank"
              className="text-gold font-semibold hover:underline"
            >
              conditions générales d'utilisation
            </Link>{" "}
            et la{" "}
            <Link
              to="/confidentialite"
              target="_blank"
              className="text-gold font-semibold hover:underline"
            >
              politique de confidentialité
            </Link>
            <span className="text-rose-400 ml-0.5">*</span>
          </span>
        </label>

        {globalError && (
          <div className="mb-4 px-3.5 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[12px]">
            {globalError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !acceptTerms}
          className={`btn-gold w-full ${loading || !acceptTerms ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Création…
            </span>
          ) : (
            <>
              Créer mon compte
              <ArrowRight size={16} strokeWidth={2.2} />
            </>
          )}
        </button>

        <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-neutral-muted text-[13px]">
            Déjà un compte ?{" "}
            <Link
              to="/portal/login"
              className="text-gold font-semibold hover:underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already"))
    return "Un compte existe déjà avec cet email. Connectez-vous ou utilisez « Mot de passe oublié ? ».";
  if (m.includes("password")) return "Le mot de passe doit faire au moins 8 caractères.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return msg;
}
