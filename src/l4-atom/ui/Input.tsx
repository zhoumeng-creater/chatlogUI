import { forwardRef } from "react";
import { classNames } from "@/utils/classNames";
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
        className={classNames(
          getControlClassName("input", controlSize, className),
          variant === "search" && "ui-control--search",
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";
