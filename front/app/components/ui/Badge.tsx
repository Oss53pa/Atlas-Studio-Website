"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "info" | "dark";
  pulse?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "success", pulse = false, children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full";

    const variants = {
      success: "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
      warning: "bg-amber-500/10 text-amber-600 border border-amber-500/20",
      info: "bg-indigo-500/10 text-indigo-600 border border-indigo-500/20",
      dark: "bg-black text-white",
    };

    return (
      <span
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        {...props}
      >
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                variant === "success" && "bg-emerald-500",
                variant === "warning" && "bg-amber-500",
                variant === "info" && "bg-indigo-500",
                variant === "dark" && "bg-emerald-500"
              )}
            />
            <span
              className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                variant === "success" && "bg-emerald-500",
                variant === "warning" && "bg-amber-500",
                variant === "info" && "bg-indigo-500",
                variant === "dark" && "bg-emerald-500"
              )}
            />
          </span>
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default Badge;
