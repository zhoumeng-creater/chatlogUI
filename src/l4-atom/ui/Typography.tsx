import type { ReactNode, HTMLAttributes } from "react";

const VARIANTS = {
  h1: "text-[32px] leading-[1.2] font-bold tracking-[-0.022em]",
  h2: "text-[24px] leading-[1.25] font-semibold tracking-[-0.019em]",
  h3: "text-[20px] leading-[1.3] font-semibold tracking-[-0.016em]",
  body: "text-[15px] leading-[1.5] font-normal tracking-[-0.01em]",
  caption: "text-[12px] leading-[1.4] font-normal tracking-[0]",
  label: "text-[13px] leading-[1.4] font-medium tracking-[-0.008em]",
} as const;

const ALIGN = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

interface TypographyProps extends HTMLAttributes<HTMLElement> {
  variant?: keyof typeof VARIANTS;
  weight?: number;
  color?: string;
  align?: keyof typeof ALIGN;
  as?: keyof HTMLElementTagNameMap;
  children: ReactNode;
}

const TAG_MAP: Record<keyof typeof VARIANTS, keyof HTMLElementTagNameMap> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  caption: "span",
  label: "span",
};

export function Typography({
  variant = "body",
  weight,
  color,
  align = "left",
  as,
  children,
  className = "",
  style,
  ...props
}: TypographyProps) {
  const Tag = as || TAG_MAP[variant];

  return (
    <Tag
      className={`${VARIANTS[variant]} ${ALIGN[align]} ${className}`}
      style={{
        fontWeight: weight,
        color,
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  );
}
