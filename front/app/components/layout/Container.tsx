"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "default" | "narrow" | "wide";
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, size = "default", children, ...props }, ref) => {
    const sizes = {
      default: "max-w-7xl", // 1280px
      narrow: "max-w-3xl", // 768px
      wide: "max-w-screen-2xl", // 1536px
    };

    return (
      <div
        ref={ref}
        className={cn("mx-auto px-4 sm:px-6 lg:px-8", sizes[size], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = "Container";

export default Container;
