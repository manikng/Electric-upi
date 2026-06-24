"use client";

import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

type InputVariant = "default" | "filled" | "ghost";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  label?: string;
  error?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<InputVariant, string> = {
  default: "input-default",
  filled: "input-filled",
  ghost: "input-ghost",
};

/**
 * Reusable Input — uses CSS custom properties from globals.css.
 * Variants: default | filled | ghost
 * Supports label, error, icon, fullWidth
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", label, error, icon, fullWidth = true, className = "", id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className={`input-wrapper ${fullWidth ? "input-full-width" : ""} ${className}`}>
        {label && (
          <label htmlFor={inputId} className="input-label">
            {label}
          </label>
        )}
        <div className={`input-field-wrapper ${error ? "input-error" : ""}`}>
          {icon && <span className="input-icon">{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`input ${variantClasses[variant]}`}
            aria-invalid={!!error}
            {...props}
          />
        </div>
        {error && <span className="input-error-text">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
