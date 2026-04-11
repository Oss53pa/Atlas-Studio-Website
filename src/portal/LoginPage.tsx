import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/ui/Logo";
import { InputField } from "./components/InputField";
import { OTPVerification } from "./components/OTPVerification";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

type Mode = "login" | "register" | "forgot" | "otp_first_login" | "otp_recovery" | "reset_password";

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Send OTP via edge function
  const sendOtp = async (purpose: "first_login" | "recovery" | "reset_password") => {
    const res = await fetch(`${supabaseUrl}/functions/v1/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
      body: JSON.stringify({ email, purpose }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur d'envoi du code");
    setEmailHint(data.email_hint || email);
    return data;
  };

  // Login flow: signIn → check if first_login_completed → if not, OTP first
  const handleLogin = async () => {
    setError("");
    if (!email || !password) { setError("Veuillez remplir tous les champs"); return; }
    setLoading(true);
    try {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }

      // Check if first_login is completed
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_login_completed")
          .eq("id", session.user.id)
          .single();

        if (profile && profile.first_login_completed === false) {
          // First login → require OTP
          await supabase.auth.signOut(); // log out until OTP verified
          await sendOtp("first_login");
          setMode("otp_first_login");
          setInfo("Première connexion détectée. Un code de vérification a été envoyé à votre email.");
          setLoading(false);
          return;
        }
      }

      navigate("/portal");
    } catch (e: any) {
      setError(e.message || "Erreur de connexion");
    }
    setLoading(false);
  };

  // Register flow: signUp → directly require OTP first_login
  const handleRegister = async () => {
    setError("");
    if (!email || !password || !name) { setError("Tous les champs sont requis"); return; }
    if (!acceptTerms) { setError("Vous devez accepter les conditions generales d'utilisation"); return; }
    setLoading(true);
    try {
      const { error: err } = await signUp(email, password, { full_name: name, company_name: company });
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }

      // Save consents to profile (user was just created and is signed in)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const now = new Date().toISOString();
        await supabase.from("profiles").update({
          terms_accepted_at: now,
          terms_version: "v2.0",
          marketing_opt_in: marketingOptIn,
          marketing_opt_in_at: marketingOptIn ? now : null,
        }).eq("id", session.user.id);

        // If opted in, also add to newsletter_subscribers
        if (marketingOptIn) {
          await supabase.from("newsletter_subscribers").upsert({
            email: email.toLowerCase().trim(),
            full_name: name,
            status: "active",
            source: "signup",
          }, { onConflict: "email" }).catch(() => { /* best-effort */ });
        }
      }

      // Sign out and require OTP verification
      await supabase.auth.signOut();
      await sendOtp("first_login");
      setMode("otp_first_login");
      setInfo("Compte créé. Un code de vérification a été envoyé à votre email.");
    } catch (e: any) {
      setError(e.message || "Erreur de creation");
    }
    setLoading(false);
  };

  // Forgot password: send OTP recovery
  const handleForgot = async () => {
    setError("");
    if (!email) { setError("Entrez votre email"); return; }
    setLoading(true);
    try {
      await sendOtp("recovery");
      setMode("otp_recovery");
      setInfo("Un code de récupération a été envoyé à votre email.");
    } catch (e: any) {
      setError(e.message || "Erreur d'envoi");
    }
    setLoading(false);
  };

  // OTP first login success → re-login automatically
  const handleOtpFirstLoginSuccess = async () => {
    setLoading(true);
    const { error: err } = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError("Vérification réussie, mais reconnexion échouée. Reconnectez-vous.");
      setMode("login");
      setPassword("");
      return;
    }
    navigate("/portal");
  };

  // OTP recovery success → switch to reset password mode
  const handleOtpRecoverySuccess = async (data: { token_hash?: string; action_link?: string }) => {
    if (data.token_hash) {
      // Use the token_hash to set a new password directly via Supabase
      // Switch to "reset_password" mode where user enters new password
      sessionStorage.setItem("atlas_recovery_token_hash", data.token_hash);
      setMode("reset_password");
      setInfo("Code vérifié. Définissez votre nouveau mot de passe.");
    } else {
      setError("Token de récupération manquant");
    }
  };

  // Reset password using the magic link token_hash
  const handleResetPassword = async () => {
    setError("");
    if (!newPassword || newPassword.length < 8) { setError("Mot de passe min. 8 caractères"); return; }
    if (newPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }

    const tokenHash = sessionStorage.getItem("atlas_recovery_token_hash");
    if (!tokenHash) { setError("Session expirée. Recommencez."); setMode("login"); return; }

    setLoading(true);
    try {
      // Verify the recovery token to establish a session
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      });
      if (verifyErr) {
        setError(verifyErr.message);
        setLoading(false);
        return;
      }
      // Update password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setError(updateErr.message);
        setLoading(false);
        return;
      }
      sessionStorage.removeItem("atlas_recovery_token_hash");
      navigate("/portal");
    } catch (e: any) {
      setError(e.message || "Erreur de réinitialisation");
    }
    setLoading(false);
  };

  // Render OTP screen
  if (mode === "otp_first_login" || mode === "otp_recovery") {
    return (
      <div className="min-h-screen bg-onyx flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Logo size={42} color="text-neutral-light" />
            <p className="text-neutral-500 text-sm mt-2">Espace Client</p>
          </div>
          {info && (
            <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[12px] text-center">
              ✓ {info}
            </div>
          )}
          <OTPVerification
            email={email}
            purpose={mode === "otp_first_login" ? "first_login" : "recovery"}
            emailHint={emailHint}
            onSuccess={mode === "otp_first_login" ? handleOtpFirstLoginSuccess : handleOtpRecoverySuccess}
            onBack={() => { setMode("login"); setInfo(""); setError(""); }}
            onResend={async () => {
              await sendOtp(mode === "otp_first_login" ? "first_login" : "recovery");
            }}
          />
        </div>
      </div>
    );
  }

  // Render reset password screen
  if (mode === "reset_password") {
    return (
      <div className="min-h-screen bg-onyx flex items-center justify-center px-5">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <Logo size={42} color="text-neutral-light" />
            <p className="text-neutral-500 text-sm mt-2">Espace Client</p>
          </div>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur">
            <h2 className="text-neutral-light text-xl font-bold mb-2 text-center">Nouveau mot de passe</h2>
            <p className="text-neutral-400 text-[12px] text-center mb-6">
              Choisissez un mot de passe d'au moins 8 caractères
            </p>
            <InputField label="Nouveau mot de passe" value={newPassword} onChange={setNewPassword} type="password" placeholder="••••••••" />
            <InputField label="Confirmer" value={confirmPassword} onChange={setConfirmPassword} type="password" placeholder="••••••••" />
            {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}
            <button onClick={handleResetPassword} disabled={loading} className="btn-gold w-full mt-5" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? "Mise à jour..." : "Enregistrer le mot de passe"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render login/register/forgot screen
  return (
    <div className="min-h-screen bg-onyx flex items-center justify-center px-5">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <Logo size={42} color="text-neutral-light" />
          <p className="text-neutral-500 text-sm mt-2">Espace Client</p>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur">
          <h2 className="text-neutral-light text-xl font-bold mb-6 text-center">
            {mode === "register" ? "Créer un compte" : mode === "forgot" ? "Mot de passe oublié" : "Se connecter"}
          </h2>

          {mode === "register" && (
            <>
              <InputField label="Nom complet" value={name} onChange={setName} placeholder="Votre nom" />
              <InputField label="Entreprise" value={company} onChange={setCompany} placeholder="Nom de votre entreprise" />
            </>
          )}
          <InputField label="Email" value={email} onChange={setEmail} placeholder="vous@entreprise.com" type="email" />
          {mode !== "forgot" && (
            <InputField label="Mot de passe" value={password} onChange={setPassword} placeholder="••••••••" type="password" />
          )}

          {/* Consents — only for registration */}
          {mode === "register" && (
            <div className="mt-4 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gold cursor-pointer flex-shrink-0"
                />
                <span className="text-neutral-300 text-[12px] leading-snug">
                  J'accepte les{" "}
                  <Link to="/cgu" target="_blank" className="text-gold hover:underline font-semibold">
                    conditions générales d'utilisation
                  </Link>
                  {" "}et la{" "}
                  <Link to="/confidentialite" target="_blank" className="text-gold hover:underline font-semibold">
                    politique de confidentialité
                  </Link>
                  <span className="text-red-400 ml-0.5">*</span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={marketingOptIn}
                  onChange={e => setMarketingOptIn(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-gold cursor-pointer flex-shrink-0"
                />
                <span className="text-neutral-400 text-[12px] leading-snug">
                  Je souhaite recevoir par email les actualités d'Atlas Studio, les nouvelles fonctionnalités et les offres spéciales. <span className="text-neutral-500">(Facultatif, révocable à tout moment)</span>
                </span>
              </label>
            </div>
          )}

          {error && <p className="text-red-500 text-[13px] mt-2">{error}</p>}

          <button
            onClick={mode === "register" ? handleRegister : mode === "forgot" ? handleForgot : handleLogin}
            disabled={loading || (mode === "register" && !acceptTerms)}
            className="btn-gold w-full mt-5"
            style={{ opacity: loading || (mode === "register" && !acceptTerms) ? 0.6 : 1 }}
          >
            {loading
              ? "Chargement..."
              : mode === "register"
              ? "Créer mon compte"
              : mode === "forgot"
              ? "Envoyer le code"
              : "Se connecter"}
          </button>

          {mode === "login" && (
            <>
              <button
                onClick={() => { setMode("forgot"); setError(""); setPassword(""); }}
                className="block w-full text-center mt-3 text-neutral-500 text-[12px] hover:text-gold transition-colors"
              >
                Mot de passe oublié ?
              </button>
              <p className="text-center text-neutral-400 text-[13px] mt-4">
                Pas encore de compte ?
                <span
                  onClick={() => { setMode("register"); setError(""); }}
                  className="text-gold cursor-pointer ml-1.5 font-semibold hover:underline"
                >
                  Créer un compte
                </span>
              </p>
            </>
          )}

          {(mode === "register" || mode === "forgot") && (
            <p className="text-center text-neutral-400 text-[13px] mt-5">
              <span
                onClick={() => { setMode("login"); setError(""); }}
                className="text-gold cursor-pointer font-semibold hover:underline"
              >
                ← Retour à la connexion
              </span>
            </p>
          )}
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-neutral-500 text-[13px] hover:text-gold transition-colors">
            ← Retour au site
          </Link>
        </p>
      </div>
    </div>
  );
}
