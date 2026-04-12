interface AdminFormFieldProps {
  label: string;
  children: React.ReactNode;
}

export const ADMIN_INPUT_CLASS = "w-full px-4 py-3 bg-admin-surface-alt border border-admin-surface-alt rounded-lg text-admin-text text-sm outline-none focus:border-admin-accent transition-colors placeholder:text-admin-muted/40";

export function AdminFormField({ label, children }: AdminFormFieldProps) {
  return (
    <div>
      <label className="block text-admin-text/80 text-[13px] font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  );
}
