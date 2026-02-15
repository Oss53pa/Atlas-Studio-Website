import { type ReactNode } from "react";
import { Link } from "react-router-dom";

interface ButtonProps {
  children: ReactNode;
  variant?: "gold" | "secondary" | "ghost";
  href?: string;
  to?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}

export function Button({
  children,
  variant = "gold",
  href,
  to,
  onClick,
  className = "",
  type = "button",
  disabled = false,
}: ButtonProps) {
  const base = {
    gold: "btn-gold",
    secondary: "btn-outline-light",
    ghost: "px-6 py-3 rounded-lg font-semibold text-[14px] text-neutral-body border border-warm-border bg-white hover:border-neutral-muted transition-all duration-300",
  }[variant];

  const cls = `${base} ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`;

  if (to) {
    return <Link to={to} className={cls}>{children}</Link>;
  }

  if (href) {
    return <a href={href} className={cls}>{children}</a>;
  }

  return (
    <button type={type} onClick={onClick} className={cls} disabled={disabled}>
      {children}
    </button>
  );
}
