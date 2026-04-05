import { useEffect, useCallback } from "react";
import { X } from "lucide-react";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  size?: ModalSize;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: "w-full max-w-sm",
  md: "w-full max-w-lg",
  lg: "w-full max-w-2xl",
  xl: "w-full max-w-4xl",
  full: "w-full max-w-full",
};

export function AdminModal({ open, onClose, title, subtitle, children, footer, wide, size }: AdminModalProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "";
      };
    }
  }, [open, handleEscape]);

  if (!open) return null;

  const sizeClass = size ? SIZE_MAP[size] : wide ? SIZE_MAP.lg : SIZE_MAP.md;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white shadow-2xl h-full flex flex-col animate-slide-in-right ${sizeClass}`}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-warm-border px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
          <div>
            <h2 className="text-neutral-text text-lg font-bold">{title}</h2>
            {subtitle && <p className="text-neutral-muted text-[13px] mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-warm-bg text-neutral-muted transition-colors" title="Fermer (Echap)">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="sticky bottom-0 bg-white border-t border-warm-border px-6 py-4 flex items-center justify-end gap-3 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
