import { X } from "lucide-react";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}

export function AdminModal({ open, onClose, title, children, wide }: AdminModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white shadow-2xl h-full overflow-y-auto animate-slide-in-right ${wide ? "w-full max-w-2xl" : "w-full max-w-lg"}`}>
        <div className="sticky top-0 bg-white border-b border-warm-border px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-neutral-text text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-warm-bg text-neutral-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
