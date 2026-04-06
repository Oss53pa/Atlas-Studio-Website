const badgeStyles: Record<string, string> = {
  active: "bg-admin-success/20 text-green-400 border-admin-success/30",
  trial: "bg-admin-info/20 text-blue-400 border-admin-info/30",
  suspended: "bg-admin-warning/20 text-orange-400 border-admin-warning/30",
  cancelled: "bg-admin-error/20 text-red-400 border-admin-error/30",
  expired: "bg-admin-surface-alt text-admin-muted border-admin-surface-alt",
  paid: "bg-admin-success/20 text-green-400 border-admin-success/30",
  pending: "bg-admin-warning/20 text-orange-400 border-admin-warning/30",
  failed: "bg-admin-error/20 text-red-400 border-admin-error/30",
  refunded: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  available: "bg-admin-success/20 text-green-400 border-admin-success/30",
  coming_soon: "bg-admin-warning/20 text-orange-400 border-admin-warning/30",
  unavailable: "bg-admin-surface-alt text-admin-muted border-admin-surface-alt",
  admin: "bg-admin-accent/10 text-admin-accent border-admin-accent/20",
  client: "bg-admin-info/20 text-blue-400 border-admin-info/30",
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
    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeStyles[status] || badgeStyles.expired}`}>
      {label || badgeLabels[status] || status}
    </span>
  );
}
