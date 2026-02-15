const badgeStyles: Record<string, string> = {
  active: "bg-green-50 text-green-600 border-green-200",
  trial: "bg-blue-50 text-blue-600 border-blue-200",
  suspended: "bg-amber-50 text-amber-600 border-amber-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-neutral-100 text-neutral-500 border-neutral-200",
  paid: "bg-green-50 text-green-600 border-green-200",
  pending: "bg-amber-50 text-amber-600 border-amber-200",
  failed: "bg-red-50 text-red-600 border-red-200",
  refunded: "bg-purple-50 text-purple-600 border-purple-200",
  available: "bg-green-50 text-green-600 border-green-200",
  coming_soon: "bg-amber-50 text-amber-600 border-amber-200",
  unavailable: "bg-neutral-100 text-neutral-500 border-neutral-200",
  admin: "bg-gold/10 text-gold border-gold/20",
  client: "bg-blue-50 text-blue-600 border-blue-200",
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
