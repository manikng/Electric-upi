"use client";

import { HTMLAttributes, forwardRef, ReactNode } from "react";

type CardVariant = "default" | "elevated" | "outlined" | "interactive";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: "none" | "sm" | "md" | "lg";
  children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
  default: "card-default",
  elevated: "card-elevated",
  outlined: "card-outlined",
  interactive: "card-interactive",
};

const paddingClasses: Record<string, string> = {
  none: "card-p-none",
  sm: "card-p-sm",
  md: "card-p-md",
  lg: "card-p-lg",
};

/**
 * Reusable Card — uses CSS custom properties from globals.css.
 * Variants: default | elevated | outlined | interactive (hover effects)
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = "default", padding = "md", className = "", children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`card ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
