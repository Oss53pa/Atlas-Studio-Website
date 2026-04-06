interface AdminFormFieldProps {
  label: string;
  children: React.ReactNode;
}

export const ADMIN_INPUT_CLASS = "w-full px-4 py-3 bg-warm-bg dark:bg-admin-surface-alt border border-warm-border dark:border-admin-surface-alt rounded-lg text-neutral-text dark:text-admin-text text-sm outline-none focus:border-gold dark:focus:border-admin-accent transition-colors";

export function AdminFormField({ label, children }: AdminFormFieldProps) {
  return (
    <div>
      <label className="block text-neutral-body dark:text-admin-text/80 text-[13px] font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  );
}
