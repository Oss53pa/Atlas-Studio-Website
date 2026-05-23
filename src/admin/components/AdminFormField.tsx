interface AdminFormFieldProps {
  label: string;
  children: React.ReactNode;
}

export const ADMIN_INPUT_CLASS = "w-full px-4 py-3 bg-admin-surface-alt/60 border border-white/10 rounded-xl text-admin-text text-sm outline-none focus:border-admin-accent/50 focus:ring-2 focus:ring-admin-accent/25 transition-all duration-200 placeholder:text-admin-muted/40 shadow-inner";

export function AdminFormField({ label, children }: AdminFormFieldProps) {
  return (
    <div>
      <label className="block text-admin-text/80 text-[12px] font-semibold uppercase tracking-wide mb-2">{label}</label>
      {children}
    </div>
  );
}
