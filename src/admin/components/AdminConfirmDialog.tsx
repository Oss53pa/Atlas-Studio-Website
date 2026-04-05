import { AlertTriangle } from "lucide-react";

interface AdminConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function AdminConfirmDialog({
  open, title, message, confirmLabel = "Confirmer", cancelLabel = "Annuler",
  variant = "danger", onConfirm, onCancel, loading = false,
}: AdminConfirmDialogProps) {
  if (!open) return null;

  const colors = {
    danger: { bg: "bg-red-50", icon: "text-red-500", btn: "bg-red-600 hover:bg-red-700 text-white" },
    warning: { bg: "bg-amber-50", icon: "text-amber-500", btn: "bg-amber-600 hover:bg-amber-700 text-white" },
    info: { bg: "bg-blue-50", icon: "text-blue-500", btn: "bg-blue-600 hover:bg-blue-700 text-white" },
  }[variant];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
            <AlertTriangle size={20} className={colors.icon} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-neutral-text text-base font-semibold mb-1">{title}</h3>
            <p className="text-neutral-muted text-sm leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} disabled={loading}
            className="px-4 py-2.5 border border-warm-border rounded-lg text-sm font-medium text-neutral-body hover:bg-warm-bg transition-colors">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${colors.btn} ${loading ? "opacity-60" : ""}`}>
            {loading ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
