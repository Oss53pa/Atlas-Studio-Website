import type { ErrorSeverity } from '../../hooks/useErrorLogs';

const SEVERITY_STYLES: Record<ErrorSeverity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-[#E24B4A]',  text: 'text-white',            label: 'Critical' },
  error:    { bg: 'bg-[#EF9F27]',  text: 'text-white',            label: 'Error' },
  warning:  { bg: 'bg-[#FAC775]',  text: 'text-neutral-900',      label: 'Warning' },
  info:     { bg: 'bg-[#378ADD]',  text: 'text-white',            label: 'Info' },
};

interface SeverityBadgeProps {
  severity: ErrorSeverity;
  size?: 'sm' | 'md';
}

export function SeverityBadge({ severity, size = 'sm' }: SeverityBadgeProps) {
  const style = SEVERITY_STYLES[severity];
  const sizeClass = size === 'md' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[10px]';
  return (
    <span
      className={`inline-flex items-center ${sizeClass} rounded-full font-bold uppercase tracking-wider ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
