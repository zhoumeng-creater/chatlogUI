import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

const VARIANTS = {
  primary: "bg-[#007AFF] text-white hover:bg-[#0062CC] active:bg-[#004999]",
  secondary: "bg-[#E8E8ED] text-[#1D1D1F] hover:bg-[#DCDCE0] active:bg-[#D1D1D6]",
  ghost: "bg-transparent text-[#007AFF] hover:bg-[#007AFF]/8 active:bg-[#007AFF]/12",
} as const;

const SIZES = {
  sm: "h-7 px-3 text-xs rounded-full",
  md: "h-8 px-4 text-sm rounded-full",
  lg: "h-10 px-6 text-base rounded-full",
} as const;

interface AppleButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
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
    <motion.button
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`inline-flex items-center justify-center font-medium tracking-[-0.01em] transition-colors duration-150 select-none ${VARIANTS[variant]} ${SIZES[size]} ${(disabled || loading) ? "opacity-40 pointer-events-none" : ""} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 mr-1.5 h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </motion.button>
  );
}
