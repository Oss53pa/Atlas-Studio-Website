import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Logo } from "../components/ui/Logo";
import { InputField } from "./components/InputField";
import { OTPVerification } from "./components/OTPVerification";
import { PasswordStrength } from "./components/PasswordStrength";
import {
  COUNTRIES,
  validateEmail,
  validatePhone,
  passwordErrorMessage,
} from "./components/signupHelpers";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";

type Mode = "login" | "register" | "forgot" | "otp_first_login" | "otp_recovery" | "reset_password";

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [country, setCountry] = useState("CI"); // Côte d'Ivoire par défaut
  const [phone, setPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(true);

  // Per-field errors for register form
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string | null;
    company?: string | null;
    jobTitle?: string | null;
    email?: string | null;
    phone?: string | null;
    password?: string | null;
    passwordConfirm?: string | null;
    country?: string | null;
  }>({});

  // Email availability check (Supabase)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === country),
    [country]
  );

  // Clear field error as user types
  const clearFieldError = (key: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => ({ ...prev, [key]: null }));
  };

  // Realtime email check: format + existence in profiles table
  const checkEmailExists = async (value: string) => {
    const formatErr = validateEmail(value);
    if (formatErr) {
      setFieldErrors((prev) => ({ ...prev, email: formatErr }));
      setEmailAvailable(null);
      return;
    }
    setEmailChecking(true);
    try {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", value.toLowerCase().trim())
        .maybeSingle();
      if (data) {
        setFieldErrors((prev) => ({ ...prev, email: "Cet email est déjà utilisé" }));
        setEmailAvailable(false);
      } else {
        setFieldErrors((prev) => ({ ...prev, email: null }));
        setEmailAvailable(true);
      }
    } catch {
      setEmailAvailable(null);
    }
    setEmailChecking(false);
  };

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

    // Per-field validation
    const errs: typeof fieldErrors = {};
    if (!name.trim()) errs.name = "Nom complet requis";
    if (!company.trim()) errs.company = "Nom de l'entreprise requis";
    if (!jobTitle.trim()) errs.jobTitle = "Fonction requise";
    if (!country) errs.country = "Pays requis";

    const emailErr = validateEmail(email);
    if (emailErr) errs.email = emailErr;
    else if (emailAvailable === false) errs.email = "Cet email est déjà utilisé";

    const phoneErr = validatePhone(phone);
    if (phoneErr) errs.phone = phoneErr;

    const pwdErr = passwordErrorMessage(password);
    if (pwdErr) errs.password = pwdErr;

    if (!passwordConfirm) errs.passwordConfirm = "Confirmation requise";
    else if (password !== passwordConfirm)
      errs.passwordConfirm = "Les mots de passe ne correspondent pas";

    setFieldErrors(errs);

    if (Object.values(errs).some((v) => v)) {
      setError("Veuillez corriger les erreurs du formulaire");
      return;
    }
    if (!acceptTerms) {
      setError("Vous devez accepter les conditions générales d'utilisation");
      return;
    }

    setLoading(true);
    try {
      const { error: err } = await signUp(email, password, {
        full_name: name,
        company_name: company,
      });
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }

      // Save all profile fields + consents (user was just created and is signed in)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const now = new Date().toISOString();
        const fullPhone = selectedCountry
          ? `${selectedCountry.dial} ${phone.trim()}`
          : phone.trim();
        await supabase
          .from("profiles")
          .update({
            full_name: name,
            company_name: company,
            phone: fullPhone,
            country,
            job_title: jobTitle,
            terms_accepted_at: now,
            terms_version: "v2.0",
            marketing_opt_in: marketingOptIn,
            marketing_opt_in_at: marketingOptIn ? now : null,
          })
          .eq("id", session.user.id);

        // If opted in, also add to newsletter_subscribers
        if (marketingOptIn) {
          await supabase
            .from("newsletter_subscribers")
            .upsert(
              {
                email: email.toLowerCase().trim(),
                full_name: name,
                status: "active",
                source: "signup",
              },
              { onConflict: "email" }
            );
        }
      }

      // Sign out and require OTP verification
      await supabase.auth.signOut();
      await sendOtp("first_login");
      setMode("otp_first_login");
      setInfo("Compte créé. Un code de vérification a été envoyé à votre email.");
    } catch (e: any) {
      setError(e.message || "Erreur de création");
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
              <InputField
                label="Nom complet"
                value={name}
                onChange={(v) => { setName(v); clearFieldError("name"); }}
                placeholder="Prénom Nom"
                required
                autoComplete="name"
                error={fieldErrors.name}
              />
              <InputField
                label="Entreprise"
                value={company}
                onChange={(v) => { setCompany(v); clearFieldError("company"); }}
                placeholder="Nom de votre entreprise"
                required
                autoComplete="organization"
                error={fieldErrors.company}
              />
              <InputField
                label="Fonction"
                value={jobTitle}
                onChange={(v) => { setJobTitle(v); clearFieldError("jobTitle"); }}
                placeholder="CEO, DAF, Comptable, Gérant..."
                required
                autoComplete="organization-title"
                error={fieldErrors.jobTitle}
              />

              {/* Pays */}
              <div className="mb-4">
                <label className="block text-neutral-400 text-[13px] font-semibold mb-1.5">
                  Pays<span className="text-red-400 ml-0.5">*</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); clearFieldError("country"); }}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-neutral-light text-sm outline-none transition-colors focus:border-gold"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code} className="bg-onyx">
                      {c.flag} {c.name} ({c.dial})
                    </option>
                  ))}
                </select>
                {fieldErrors.country && (
                  <p className="mt-1 text-red-400 text-[11px]">{fieldErrors.country}</p>
                )}
              </div>

              {/* Téléphone avec préfixe pays */}
              <div className="mb-4">
                <label className="block text-neutral-400 text-[13px] font-semibold mb-1.5">
                  Téléphone<span className="text-red-400 ml-0.5">*</span>
                </label>
                <div className={`flex items-stretch rounded-lg bg-white/5 border transition-colors overflow-hidden ${
                  fieldErrors.phone ? "border-red-500/60" : "border-white/10 focus-within:border-gold"
                }`}>
                  <span className="px-3 py-3 bg-white/5 text-neutral-400 text-sm font-mono border-r border-white/10 shrink-0">
                    {selectedCountry?.dial || "+"}
                  </span>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); clearFieldError("phone"); }}
                    placeholder="01 23 45 67 89"
                    autoComplete="tel-national"
                    className="flex-1 px-4 py-3 bg-transparent text-neutral-light text-sm outline-none placeholder:text-neutral-600"
                  />
                </div>
                {fieldErrors.phone && (
                  <p className="mt-1 text-red-400 text-[11px]">{fieldErrors.phone}</p>
                )}
              </div>
            </>
          )}

          <InputField
            label="Email"
            value={email}
            onChange={(v) => {
              setEmail(v);
              clearFieldError("email");
              setEmailAvailable(null);
            }}
            onBlur={() => {
              if (mode === "register" && email) checkEmailExists(email);
            }}
            placeholder="vous@entreprise.com"
            type="email"
            required={mode !== "forgot"}
            autoComplete="email"
            inputMode="email"
            error={fieldErrors.email}
            hint={
              mode === "register" && email && !fieldErrors.email
                ? emailChecking
                  ? "Vérification..."
                  : emailAvailable === true
                  ? "✓ Email disponible"
                  : undefined
                : undefined
            }
          />

          {mode !== "forgot" && (
            <>
              <InputField
                label="Mot de passe"
                value={password}
                onChange={(v) => { setPassword(v); clearFieldError("password"); }}
                placeholder="••••••••••••"
                type="password"
                required={mode === "register"}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                error={fieldErrors.password}
              />
              {mode === "register" && <PasswordStrength password={password} />}
              {mode === "register" && (
                <InputField
                  label="Confirmer le mot de passe"
                  value={passwordConfirm}
                  onChange={(v) => { setPasswordConfirm(v); clearFieldError("passwordConfirm"); }}
                  placeholder="••••••••••••"
                  type="password"
                  required
                  autoComplete="new-password"
                  error={fieldErrors.passwordConfirm}
                />
              )}
            </>
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
