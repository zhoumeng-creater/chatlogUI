import type { ReactNode } from "react";

interface BadgeProps {
  count: number;
  max?: number;
  children?: ReactNode;
}

export function Badge({ count, max = 99, children }: BadgeProps) {
  if (count <= 0 && !children) return null;
  const displayText = count > max ? `${max}+` : String(count);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        background: "#FF3B30",
        color: "#fff",
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 9,
        lineHeight: 1,
      }}
    >
      {children || displayText}
    </span>
  );
}
