import { forwardRef } from "react";
import { getControlClassName, type ControlSize } from "./formControl";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search";
  controlSize?: ControlSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", controlSize = "md", className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          getControlClassName("input", controlSize, className),
          variant === "search" ? "ui-control--search" : "",
        ].filter(Boolean).join(" ")}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
