"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-300 ease-in-out rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2";

    const variants = {
      primary:
        "bg-black text-white hover:bg-gray-800 focus:ring-gray-900",
      secondary:
        "border-2 border-gray-300 text-gray-700 bg-transparent hover:border-gray-400 hover:bg-gray-50 focus:ring-gray-500",
      ghost:
        "text-gray-600 hover:text-black hover:bg-gray-100 focus:ring-gray-500",
    };

    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
