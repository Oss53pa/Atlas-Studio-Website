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
    <div className="sticky top-0 z-20 -mx-6 md:-mx-8 -mt-6 md:-mt-8 mb-7 px-6 md:px-8 pt-6 md:pt-8 pb-4 flex items-center justify-between flex-wrap gap-4 bg-admin-bg/90 backdrop-blur-md border-b border-white/5">
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
