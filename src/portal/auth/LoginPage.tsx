import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth";
import { AuthLayout } from "./AuthLayout";
import { AuthInput } from "./AuthInput";

/**
 * /portal/login — Connexion standard.
 * Champs : Email + mot de passe.
 * Liens : "Mot de passe oublié ?" + "S'inscrire".
 */
export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ?next=... pour revenir à la page demandée après auth
  const next = new URLSearchParams(location.search).get("next") || "/portal";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    const { error: err } = await signIn(email.trim().toLowerCase(), password);
    setLoading(false);
    if (err) {
      setError(translateError(err));
      return;
    }
    navigate(next, { replace: true });
  };

  return (
    <AuthLayout title="Se connecter" subtitle="Accédez à votre Espace Client Atlas Studio.">
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="vous@entreprise.com"
          required
          autoComplete="email"
          inputMode="email"
        />
        <AuthInput
          label="Mot de passe"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        {error && (
          <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 text-[12px]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`btn-gold w-full ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" /> Connexion…
            </span>
          ) : (
            <>
              Se connecter
              <ArrowRight size={16} strokeWidth={2.2} />
            </>
          )}
        </button>

        <div className="mt-5 text-center">
          <Link
            to="/portal/forgot-password"
            className="text-neutral-muted text-[13px] hover:text-gold transition-colors"
          >
            Mot de passe oublié ?
          </Link>
        </div>

        <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
          <p className="text-neutral-muted text-[13px]">
            Pas encore de compte ?{" "}
            <Link
              to="/portal/signup"
              className="text-gold font-semibold hover:underline"
            >
              S'inscrire
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}

/** Traduit les erreurs Supabase en français lisible. */
function translateError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("email not confirmed")) return "Email non confirmé. Vérifiez votre boîte de réception.";
  if (m.includes("user not found")) return "Aucun compte avec cet email.";
  if (m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  return msg;
}
