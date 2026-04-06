import * as React from "react";
import { cn } from "../../lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-warm-border dark:border-admin-surface-alt bg-warm-bg dark:bg-admin-surface-alt px-4 py-3 text-sm text-neutral-text dark:text-admin-text placeholder:text-neutral-placeholder dark:placeholder:text-admin-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold dark:focus-visible:ring-admin-accent disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
