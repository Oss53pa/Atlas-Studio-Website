import type { ReactNode } from "react";

interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel" | "numeric" | "url";
  onBlur?: () => void;
}

export function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  error = null,
  hint,
  autoComplete,
  inputMode,
  onBlur,
}: InputFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-neutral-400 text-[13px] font-semibold mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={!!error}
        className={`w-full px-4 py-3 bg-white/5 border rounded-lg text-neutral-light text-sm outline-none transition-colors placeholder:text-neutral-600 ${
          error
            ? "border-red-500/60 focus:border-red-500"
            : "border-white/10 focus:border-gold"
        }`}
      />
      {error && (
        <p className="mt-1 text-red-400 text-[11px] leading-snug">{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1 text-neutral-500 text-[11px] leading-snug">{hint}</p>
      )}
    </div>
  );
}
