import type { ReactNode } from "react";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export function Tooltip({ label, children }: TooltipProps) {
  return (
    <span className="ui-tooltip">
      {children}
      <span role="tooltip" className="ui-tooltip__bubble">
        {label}
      </span>
    </span>
  );
}
