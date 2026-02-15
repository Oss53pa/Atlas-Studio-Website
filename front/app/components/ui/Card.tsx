"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "bordered";
  hover?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", hover = false, children, ...props }, ref) => {
    const baseStyles = "rounded-2xl transition-all duration-300 ease-in-out";

    const variants = {
      default: "bg-gray-50 p-6",
      elevated: "bg-white p-8 shadow-lg",
      bordered: "bg-white p-6 border border-gray-200",
    };

    const hoverStyles = hover
      ? "hover:shadow-xl hover:scale-[1.02] cursor-pointer"
      : "";

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], hoverStyles, className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export default Card;
