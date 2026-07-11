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
        {required && <span className="text-red-700 ml-0.5">*</span>}
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
        className={`w-full px-4 py-3.5 bg-p-surface border rounded-xl text-neutral-light text-sm outline-none transition-all duration-200 placeholder:text-neutral-600 shadow-[inset_0_2px_5px_rgba(0,0,0,0.4)] ${
          error
            ? "border-red-500/60 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            : "border-white/[0.07] focus:border-gold/55 focus:ring-2 focus:ring-gold/30"
        }`}
      />
      {error && (
        <p className="mt-1 text-red-700 text-[11px] leading-snug">{error}</p>
      )}
      {!error && hint && (
        <p className="mt-1 text-neutral-500 text-[11px] leading-snug">{hint}</p>
      )}
    </div>
  );
}
