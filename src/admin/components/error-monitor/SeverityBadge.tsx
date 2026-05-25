import type { ErrorSeverity } from '../../hooks/useErrorLogs';

const SEVERITY_STYLES: Record<ErrorSeverity, { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-[#C0635C]',  text: 'text-white',            label: 'Critical' },
  error:    { bg: 'bg-[#A9B57E]',  text: 'text-white',            label: 'Error' },
  warning:  { bg: 'bg-[#C2CC92]',  text: 'text-neutral-900',      label: 'Warning' },
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
