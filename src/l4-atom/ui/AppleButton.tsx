import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";

interface AppleButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "children"> {
  variant?: Extract<ButtonVariant, "primary" | "secondary" | "ghost">;
  size?: ButtonSize;
  loading?: boolean;
  children: ReactNode;
}

export function AppleButton({
  variant = "primary",
  size = "md",
  loading,
  disabled,
  children,
  className = "",
  ...props
}: AppleButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      loading={loading}
      disabled={disabled || loading}
      className={className}
      {...props}
    >
      {children}
    </Button>
  );
}
