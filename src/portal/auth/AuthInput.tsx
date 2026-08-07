import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface AuthInputProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string | null;
  hint?: string;
  inputMode?: "email" | "text";
  onBlur?: () => void;
}

/**
 * AuthInput — champ de formulaire premium pour pages auth.
 * Style cohérent avec le design system Midnight Emerald.
 */
export function AuthInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  autoComplete,
  error,
  hint,
  inputMode,
  onBlur,
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  return (
    <div className="mb-4">
      <label className="block text-neutral-light text-[12px] font-semibold uppercase tracking-wider mb-2">
        {label}
        {required && <span className="text-rose-700 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className={`w-full px-4 py-3.5 bg-p-surface border rounded-xl text-neutral-light text-sm outline-none transition-all duration-200 placeholder:text-neutral-muted shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)] ${
            error
              ? "border-rose-500/60 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              : "border-white/[0.07] focus:border-gold/55 focus:ring-2 focus:ring-gold/30"
          } ${isPassword ? "pr-11" : ""}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            tabIndex={-1}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-muted hover:text-gold transition-colors p-1"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-rose-700 text-[11px]">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-emerald-400 text-[11px]">{hint}</p>}
    </div>
  );
}
