import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";
import { getControlClassName, type ControlSize } from "./formControl";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  controlSize?: ControlSize;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ controlSize = "md", className = "", ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={getControlClassName("select", controlSize, className)}
        {...props}
      />
    );
  },
);

Select.displayName = "Select";
