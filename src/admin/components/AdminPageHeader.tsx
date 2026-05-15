import { StyledText } from "../../components/ui/StyledText";

interface AdminPageHeaderProps {
  /**
   * Page title. `string` is wrapped in <StyledText> so brand words like
   * "Proph3t" or "Atlas Studio" get the right font automatically.
   * Pass a ReactNode if you need custom inline styling.
   */
  title: string | React.ReactNode;
  subtitle?: string;
  children?: React.ReactNode; // Action buttons
}

export function AdminPageHeader({ title, subtitle, children }: AdminPageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-7 flex-wrap gap-4">
      <div>
        <h1 className="text-neutral-text dark:text-admin-text text-2xl font-bold mb-1">
          {typeof title === "string" ? <StyledText>{title}</StyledText> : title}
        </h1>
        {subtitle && <p className="text-neutral-muted dark:text-admin-muted text-sm">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
