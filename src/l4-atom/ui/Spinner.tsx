import { motion } from "framer-motion";

interface SpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

export function Spinner({
  size = 24,
  color = "#007AFF",
  label,
}: SpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke={`${color}30`}
          strokeWidth="3"
        />
        <motion.path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          initial={{ pathLength: 0.25, rotate: 0 }}
          animate={{ pathLength: 0.75, rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </motion.svg>
      {label && (
        <p style={{ color, fontSize: 13, fontWeight: 500 }}>{label}</p>
      )}
    </div>
  );
}
