import { motion } from "framer-motion";

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circle" | "rect";
  count?: number;
  animated?: boolean;
}

function SkeletonItem({
  width,
  height,
  variant,
  animated,
}: SkeletonLoaderProps) {
  const borderRadius =
    variant === "circle"
      ? "50%"
      : variant === "text"
        ? "6px"
        : "10px";

  const defaultHeight =
    variant === "text" ? 14 : variant === "circle" ? width : 40;

  return (
    <motion.div
      className="relative overflow-hidden"
      style={{
        width: width || "100%",
        height: height || defaultHeight,
        borderRadius,
        backgroundColor: "rgba(120, 120, 128, 0.12)",
      }}
    >
      {animated !== false && (
        <motion.div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
          }}
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
    </motion.div>
  );
}

export function SkeletonLoader({
  count = 1,
  ...itemProps
}: SkeletonLoaderProps) {
  return (
    <div className="flex flex-col gap-2 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} {...itemProps} />
      ))}
    </div>
  );
}
