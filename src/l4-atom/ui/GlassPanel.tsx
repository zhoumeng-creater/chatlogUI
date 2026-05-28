import type { ReactNode, HTMLAttributes } from "react";

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  blur?: number;
  opacity?: number;
  borderRadius?: number;
  children: ReactNode;
}

export function GlassPanel({
  blur = 20,
  opacity = 0.6,
  borderRadius = 16,
  children,
  className = "",
  style,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius,
        ...style,
      }}
      {...props}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: `rgba(255, 255, 255, ${opacity})`,
          backdropFilter: `blur(${blur}px)`,
          WebkitBackdropFilter: `blur(${blur}px)`,
          borderRadius,
        }}
      />
      <div
        className="absolute inset-0 ring-1 ring-inset"
        style={{
          borderRadius,
          borderColor: "rgba(255, 255, 255, 0.2)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
