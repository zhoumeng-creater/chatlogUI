import type { ReactNode, HTMLAttributes } from "react";
import { classNames } from "@/utils/classNames";

const VARIANTS = {
  h1: "text-[32px] leading-[1.2] font-bold tracking-[0]",
  h2: "text-[24px] leading-[1.25] font-semibold tracking-[0]",
  h3: "text-[20px] leading-[1.3] font-semibold tracking-[0]",
  body: "text-[15px] leading-[1.5] font-normal tracking-[0]",
  caption: "text-[12px] leading-[1.4] font-normal tracking-[0]",
  label: "text-[13px] leading-[1.4] font-medium tracking-[0]",
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
      className={classNames(VARIANTS[variant], ALIGN[align], className)}
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
