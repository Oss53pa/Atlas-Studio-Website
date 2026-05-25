const SUCCESS = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-admin-success/15 dark:text-emerald-300 dark:border-admin-success/30";
const INFO = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-admin-info/15 dark:text-blue-300 dark:border-admin-info/30";
const WARNING = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-admin-warning/15 dark:text-orange-300 dark:border-admin-warning/30";
const DANGER = "bg-red-50 text-red-700 border-red-200 dark:bg-admin-error/15 dark:text-red-300 dark:border-admin-error/30";
const NEUTRAL = "bg-warm-bg text-neutral-muted border-warm-border dark:bg-white/5 dark:text-admin-muted dark:border-white/10";
const ACCENT = "bg-gold/10 text-gold border-gold/25 dark:bg-admin-accent/15 dark:text-admin-accent dark:border-admin-accent/30";
const PURPLE = "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/30";

const badgeStyles: Record<string, string> = {
  active: SUCCESS,
  trial: INFO,
  suspended: WARNING,
  cancelled: DANGER,
  expired: NEUTRAL,
  paid: SUCCESS,
  pending: WARNING,
  failed: DANGER,
  refunded: PURPLE,
  available: SUCCESS,
  coming_soon: WARNING,
  unavailable: NEUTRAL,
  admin: ACCENT,
  client: INFO,
};

const badgeLabels: Record<string, string> = {
  active: "Actif",
  trial: "Essai",
  suspended: "Suspendu",
  cancelled: "Annulé",
  expired: "Expiré",
  paid: "Payée",
  pending: "En attente",
  failed: "Échouée",
  refunded: "Remboursée",
  available: "Disponible",
  coming_soon: "Bientôt",
  unavailable: "Indisponible",
  admin: "Admin",
  client: "Client",
};

interface AdminBadgeProps {
  status: string;
  label?: string;
}

export function AdminBadge({ status, label }: AdminBadgeProps) {
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide border ${badgeStyles[status] || badgeStyles.expired}`}>
      {label || badgeLabels[status] || status}
    </span>
  );
}
