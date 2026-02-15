interface InputFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}

export function InputField({ label, value, onChange, placeholder, type = "text" }: InputFieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-neutral-400 text-[13px] font-semibold mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-neutral-light text-sm outline-none transition-colors focus:border-gold placeholder:text-neutral-600"
      />
    </div>
  );
}
