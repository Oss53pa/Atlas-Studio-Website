import { useState, useEffect, useRef } from "react";
import { Loader2, ArrowLeft, RotateCw, Mail } from "lucide-react";

interface OTPVerificationProps {
  email: string;
  purpose: "first_login" | "recovery" | "reset_password";
  emailHint?: string;
  onSuccess: (data: { token_hash?: string; action_link?: string }) => void;
  onBack: () => void;
  onResend: () => Promise<void>;
}

const OTP_LENGTH = 6;

export function OTPVerification({ email, purpose, emailHint, onSuccess, onBack, onResend }: OTPVerificationProps) {
  const [code, setCode] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown for resend button
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1); // only last char
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newCode.every(d => d !== "") && newCode.join("").length === OTP_LENGTH) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (pasted.length === OTP_LENGTH) {
      const newCode = pasted.split("");
      setCode(newCode);
      handleVerify(pasted);
    }
  };

  const handleVerify = async (codeStr?: string) => {
    const fullCode = codeStr || code.join("");
    if (fullCode.length !== OTP_LENGTH) {
      setError("Entrez les 6 chiffres");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: supabaseAnonKey },
        body: JSON.stringify({ email, code: fullCode, purpose }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Code invalide");
        setCode(Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
        setLoading(false);
        return;
      }
      onSuccess(data);
    } catch (err: any) {
      setError(err.message || "Erreur de verification");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setError("");
    try {
      await onResend();
      setResendCountdown(60);
      setCode(Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || "Impossible de renvoyer le code");
    }
    setResendLoading(false);
  };

  const purposeTitles = {
    first_login: "Premiere connexion",
    recovery: "Recuperation de compte",
    reset_password: "Reinitialisation",
  };

  return (
    <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-8 backdrop-blur">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-neutral-400 hover:text-gold text-[12px] mb-4 transition-colors"
      >
        <ArrowLeft size={13} />
        Retour
      </button>

      <div className="text-center mb-6">
        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
          <Mail size={22} className="text-gold" />
        </div>
        <h2 className="text-neutral-light text-xl font-bold mb-1">
          {purposeTitles[purpose]}
        </h2>
        <p className="text-neutral-400 text-[12px] leading-relaxed">
          Un code à 6 chiffres a été envoyé à<br />
          <strong className="text-gold">{emailHint || email}</strong>
        </p>
      </div>

      {/* OTP inputs */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={loading}
            className="w-11 h-13 text-center text-2xl font-bold font-mono bg-white/[0.04] border border-white/10 rounded-lg text-neutral-light outline-none focus:border-gold focus:bg-white/[0.06] transition-colors disabled:opacity-50"
            style={{ height: "52px" }}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] text-center">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 text-neutral-400 text-[12px] mb-4">
          <Loader2 size={13} className="animate-spin" />
          Vérification...
        </div>
      )}

      {/* Resend */}
      <div className="text-center mt-5 pt-5 border-t border-white/5">
        <p className="text-neutral-500 text-[11px] mb-2">Vous n'avez pas reçu le code ?</p>
        <button
          onClick={handleResend}
          disabled={resendCountdown > 0 || resendLoading || loading}
          className="inline-flex items-center gap-1.5 text-[12px] text-gold hover:text-gold/80 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors font-semibold"
        >
          {resendLoading ? (
            <><Loader2 size={11} className="animate-spin" /> Envoi...</>
          ) : resendCountdown > 0 ? (
            <>Renvoyer dans {resendCountdown}s</>
          ) : (
            <><RotateCw size={11} /> Renvoyer le code</>
          )}
        </button>
      </div>
    </div>
  );
}
