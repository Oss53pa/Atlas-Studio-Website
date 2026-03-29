export const STATUS_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  active: { label: "Actif", color: "#16a34a", dotColor: "#22c55e" },
  trial: { label: "Essai", color: "#2563eb", dotColor: "#3b82f6" },
  suspended: { label: "Suspendu", color: "#d97706", dotColor: "#f59e0b" },
  cancelled: { label: "Annulé", color: "#dc2626", dotColor: "#ef4444" },
  expired: { label: "Expiré", color: "#9ca3af", dotColor: "#d1d5db" },
};
