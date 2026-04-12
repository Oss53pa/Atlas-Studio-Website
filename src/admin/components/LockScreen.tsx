import { useState, useEffect, useRef } from "react";
import { Lock, Loader2, Eye, EyeOff } from "lucide-react";
import { Logo } from "../../components/ui/Logo";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";

interface LockScreenProps {
  onUnlock: () => void;
  onSignOut: () => void;
}

export function LockScreen({ onUnlock, onSignOut }: LockScreenProps) {
  const { user, profile } = useAuth();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleUnlock = async () => {
    if (!user?.email || !password) {
      setError("Veuillez entrer votre mot de passe");
      return;
    }
    setError("");
    setLoading(true);

    // Verify password WITHOUT triggering a full re-sign-in.
    // The user already has an active session — we just need to confirm
    // they know the password. We use signInWithPassword then immediately
    // check the result without waiting for onAuthStateChange to propagate,
    // which avoids the race condition that causes the "ram" effect.
    try {
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authErr) {
        setError("Mot de passe incorrect");
        setPassword("");
        inputRef.current?.focus();
      } else {
        setPassword("");
        onUnlock();
      }
    } catch {
      setError("Erreur de vérification");
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) handleUnlock();
  };

  const initials = (profile?.full_name || user?.email || "A")
    .split(/[\s@]/)
    .map(s => s[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        background: "rgba(10,10,10,0.96)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="w-full max-w-md mx-auto px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <Logo size={32} color="text-neutral-light" />
          <div className="text-[#EF9F27] text-[10px] font-bold uppercase tracking-widest mt-1">
            Console Administration
          </div>
        </div>

        {/* Lock card */}
        <div className="bg-[#0F0F15] border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-[#EF9F27]/15 border border-[#EF9F27]/30 flex items-center justify-center">
              <Lock size={22} className="text-[#EF9F27]" />
            </div>
          </div>

          <h2 className="text-white text-lg font-semibold text-center mb-2">
            Session verrouillée
          </h2>
          <p className="text-white/50 text-[12px] text-center mb-6 leading-relaxed">
            Inactivité détectée — entrez votre mot de passe<br />
            pour reprendre votre session.
          </p>

          {/* User pill */}
          <div className="flex items-center gap-3 px-3 py-2 bg-white/5 border border-white/10 rounded-lg mb-4">
            <div className="w-8 h-8 rounded-full bg-[#EF9F27] flex items-center justify-center text-[#0A0A0B] text-[11px] font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white text-[12px] font-medium truncate">
                {profile?.full_name || "Admin"}
              </div>
              <div className="text-white/40 text-[10px] truncate">{user?.email}</div>
            </div>
          </div>

          {/* Password input */}
          <div className="relative">
            <input
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mot de passe"
              disabled={loading}
              className="w-full px-3 py-2.5 pr-10 bg-[#1A1A22] border border-white/10 rounded-lg text-white text-[13px] placeholder-white/30 focus:border-[#EF9F27]/50 outline-none transition-colors"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          {error && (
            <div className="mt-2 text-red-400 text-[11px] font-medium">{error}</div>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || !password}
            className="w-full mt-4 py-2.5 bg-[#EF9F27] text-[#0A0A0B] rounded-lg font-semibold text-[13px] hover:bg-[#D4B872] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Vérification...
              </>
            ) : (
              "Déverrouiller"
            )}
          </button>

          <div className="mt-4 pt-4 border-t border-white/5 text-center">
            <button
              onClick={onSignOut}
              className="text-white/40 hover:text-white/70 text-[11px] transition-colors"
            >
              Se déconnecter complètement
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <div className="text-white/30 text-[10px]">
            Atlas Studio · Sécurité console
          </div>
        </div>
      </div>
    </div>
  );
}
