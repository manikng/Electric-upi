"use client";

import { HTMLAttributes, forwardRef, ReactNode } from "react";

type BadgeVariant = "default" | "primary" | "accent" | "success" | "info" | "warning" | "error";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  children: ReactNode;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "badge-default",
  primary: "badge-primary",
  accent: "badge-accent",
  success: "badge-success",
  info: "badge-info",
  warning: "badge-warning",
  error: "badge-error",
};

const sizeClasses: Record<string, string> = {
  sm: "badge-sm",
  md: "badge-md",
};

/**
 * Reusable Badge — uses CSS custom properties from globals.css.
 * Variants: default | primary | accent | success | info | warning | error
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", size = "sm", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`badge ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";
export default Badge;
