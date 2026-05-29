import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  type = "button",
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "ui-button",
        `ui-button--${variant}`,
        `ui-button--${size}`,
        className,
      ].filter(Boolean).join(" ")}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size={14} color="currentColor" />}
      {children}
    </button>
  );
}
