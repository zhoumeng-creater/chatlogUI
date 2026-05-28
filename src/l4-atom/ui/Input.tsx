import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "search";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ variant = "default", style, ...props }, ref) => {
    return (
      <input
        ref={ref}
        {...props}
        style={{
          width: "100%",
          height: variant === "search" ? 36 : 32,
          padding: "0 12px",
          background: "rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: variant === "search" ? 18 : 10,
          color: "var(--color-text-primary)",
          fontSize: 14,
          outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(0,122,255,0.5)";
          e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0,122,255,0.15)";
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
          e.currentTarget.style.boxShadow = "none";
          props.onBlur?.(e);
        }}
      />
    );
  },
);

Input.displayName = "Input";
