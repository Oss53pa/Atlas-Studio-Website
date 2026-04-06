import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Check, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  action?: { label: string; onClick: () => void };
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, action?: Toast["action"]) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {}, success: () => {}, error: () => {}, warning: () => {},
});

const ICONS = { success: Check, error: AlertTriangle, warning: AlertTriangle, info: Info };
const COLORS = {
  success: "bg-admin-success/20 border-admin-success/30 text-green-300",
  error: "bg-admin-error/20 border-admin-error/30 text-red-300",
  warning: "bg-admin-warning/20 border-admin-warning/30 text-orange-300",
  info: "bg-admin-info/20 border-admin-info/30 text-blue-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "success", action?: Toast["action"]) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, message, type, action }]);
    setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const ctx: ToastContextType = {
    toast: addToast,
    success: (msg) => addToast(msg, "success"),
    error: (msg) => addToast(msg, "error"),
    warning: (msg) => addToast(msg, "warning"),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 max-w-sm">
        {toasts.map(t => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium animate-in slide-in-from-right ${COLORS[t.type]}`}>
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{t.message}</span>
              {t.action && (
                <button onClick={t.action.onClick} className="font-semibold underline text-[12px]">
                  {t.action.label}
                </button>
              )}
              <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100 transition-opacity">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
