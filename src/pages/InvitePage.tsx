import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

interface InviteInfo {
  product_name?: string;
  role?: string;
  company_name?: string;
  needs_signup?: boolean;
  token_hash?: string;
  email?: string;
  message?: string;
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [showSignup, setShowSignup] = useState(false);

  // Signup form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accept-invitation`;
  const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Step 1: On mount, call accept-invitation with just the token
  useEffect(() => {
    if (!token) return;

    const acceptInvitation = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: apiKey,
          },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || data.message || "Invitation invalide.");
        }

        setInviteInfo(data);

        if (data.needs_signup) {
          // Step 2: needs signup -- show form
          setShowSignup(true);
        } else if (data.token_hash) {
          // Step 3: user already exists -- auto-login via magic link
          await loginWithOtp(data.token_hash, data.email);
        } else {
          throw new Error("Reponse inattendue du serveur.");
        }
      } catch (err: any) {
        setError(err.message || "Impossible de traiter cette invitation.");
      } finally {
        setLoading(false);
      }
    };

    acceptInvitation();
  }, [token]);

  // Login helper using verifyOtp
  const loginWithOtp = async (tokenHash: string, email?: string) => {
    const { error: otpError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (otpError) {
      throw new Error(otpError.message || "Erreur lors de la connexion.");
    }

    navigate("/portal");
  };

  // Step 4: After signup, call accept-invitation again with password + names
  const handleSignup = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Le prenom et le nom sont requis.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: apiKey,
        },
        body: JSON.stringify({
          token,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.message || "Erreur lors de l'inscription.");
      }

      // Step 5: On success, establish session and redirect
      if (data.token_hash) {
        await loginWithOtp(data.token_hash, data.email);
      } else {
        navigate("/portal");
      }
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'inscription.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-[#141414] border border-[#2a2a2a] rounded-lg text-[#e5e5e5] text-sm outline-none focus:border-[#EF9F27] transition-colors placeholder:text-[#666]";

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-12 h-12 rounded-full bg-[#EF9F27] flex items-center justify-center">
            <span className="text-[#0A0A0A] text-xl font-bold">A</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-8">
          {/* Loading state */}
          {loading && (
            <div className="text-center py-8">
              <Loader2 size={32} className="animate-spin text-[#EF9F27] mx-auto mb-4" />
              <p className="text-[#999] text-sm">Verification de l'invitation...</p>
            </div>
          )}

          {/* Error state (no signup form visible) */}
          {!loading && error && !showSignup && (
            <div className="text-center py-8">
              <AlertCircle size={40} className="text-red-400 mx-auto mb-4" strokeWidth={1.5} />
              <h2 className="text-[#e5e5e5] text-lg font-medium mb-2">Invitation invalide</h2>
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Signup form */}
          {!loading && showSignup && inviteInfo && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-[#e5e5e5] text-xl font-medium mb-2">
                  Rejoindre {inviteInfo.company_name || "l'equipe"}
                </h2>
                {inviteInfo.product_name && (
                  <p className="text-[#999] text-sm mb-1">
                    Produit : <span className="text-[#EF9F27]">{inviteInfo.product_name}</span>
                  </p>
                )}
                {inviteInfo.role && (
                  <p className="text-[#999] text-sm">
                    Role : <span className="text-[#EF9F27]">{inviteInfo.role}</span>
                  </p>
                )}
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-[#e5e5e5] text-[13px] font-normal mb-1.5">Prenom</label>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[#e5e5e5] text-[13px] font-normal mb-1.5">Nom</label>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Dupont"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#e5e5e5] text-[13px] font-normal mb-1.5">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caracteres"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[#e5e5e5] text-[13px] font-normal mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmer"
                    className={inputClass}
                  />
                </div>

                <button
                  onClick={handleSignup}
                  disabled={submitting}
                  className="w-full py-3 bg-[#EF9F27] hover:bg-[#d88f22] text-[#0A0A0A] font-medium text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Inscription en cours...
                    </>
                  ) : (
                    "Creer mon compte"
                  )}
                </button>
              </div>
            </>
          )}

          {/* Auto-login in progress (user exists) */}
          {!loading && !error && !showSignup && (
            <div className="text-center py-8">
              <CheckCircle size={40} className="text-[#EF9F27] mx-auto mb-4" strokeWidth={1.5} />
              <p className="text-[#e5e5e5] text-sm">Connexion en cours...</p>
            </div>
          )}
        </div>

        <p className="text-center text-[#555] text-xs mt-6">Atlas Studio</p>
      </div>
    </div>
  );
}
