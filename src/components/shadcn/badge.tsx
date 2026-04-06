import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gold/10 dark:bg-admin-accent/10 text-gold dark:text-admin-accent",
        success: "border-transparent bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400",
        destructive: "border-transparent bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400",
        warning: "border-transparent bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400",
        info: "border-transparent bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
        outline: "text-neutral-text dark:text-admin-text border-warm-border dark:border-admin-surface-alt",
        secondary: "border-transparent bg-warm-bg dark:bg-admin-surface-alt text-neutral-muted dark:text-admin-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
