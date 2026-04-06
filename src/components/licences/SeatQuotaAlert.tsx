import { AlertTriangle, XCircle } from "lucide-react";
import type { SeatQuota } from "../../types/licences";

interface Props {
  quota: SeatQuota | null;
}

export function SeatQuotaAlert({ quota }: Props) {
  if (!quota) return null;

  const isFull = quota.remaining <= 0;
  const isAlmostFull = quota.remaining === 1;

  if (!isFull && !isAlmostFull) return null;

  const bg = isFull ? "#FEF2F2" : "#FFFBEB";
  const border = isFull ? "#FECACA" : "#FDE68A";
  const color = isFull ? "#DC2626" : "#D97706";
  const Icon = isFull ? XCircle : AlertTriangle;
  const message = isFull
    ? "Quota de sieges atteint. Impossible d'ajouter de nouveaux membres."
    : "Il ne reste qu'un seul siege disponible.";

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
      style={{ background: bg, border: `1px solid ${border}`, color }}
    >
      <Icon size={18} strokeWidth={2} />
      <span>{message}</span>
    </div>
  );
}
