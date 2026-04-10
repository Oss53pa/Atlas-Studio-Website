import type { ErrorStatus } from '../../hooks/useErrorLogs';

const STATUS_STYLES: Record<ErrorStatus, { className: string; label: string }> = {
  open: {
    className: 'bg-neutral-200 text-neutral-700 dark:bg-white/10 dark:text-neutral-300',
    label: 'Ouverte',
  },
  in_progress: {
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    label: 'En cours',
  },
  resolved: {
    className: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
    label: 'Résolue',
  },
  ignored: {
    className: 'bg-neutral-100 text-neutral-400 line-through dark:bg-white/5 dark:text-neutral-500',
    label: 'Ignorée',
  },
};

interface StatusBadgeProps {
  status: ErrorStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${style.className}`}
    >
      {style.label}
    </span>
  );
}
