import { forwardRef, type InputHTMLAttributes } from "react";
import { Input } from "./Input";
import type { ControlSize } from "./formControl";

interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode" | "pattern"> {
  variant?: "default" | "search";
  controlSize?: ControlSize;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ placeholder = "YYYY-MM-DD", ...props }, ref) => (
    <Input
      ref={ref}
      type="text"
      inputMode="numeric"
      pattern={String.raw`\d{4}-\d{2}-\d{2}`}
      placeholder={placeholder}
      {...props}
    />
  ),
);

DateInput.displayName = "DateInput";
