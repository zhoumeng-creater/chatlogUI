import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { classNames } from "@/utils/classNames";

export type TooltipPlacement = "top-end" | "top" | "right" | "bottom" | "left";

interface TooltipProps {
  id?: string;
  label: string;
  placement?: TooltipPlacement;
  children: ReactNode;
}

interface DescribedElementProps {
  "aria-describedby"?: string;
}

export function Tooltip({ id, label, placement = "top-end", children }: TooltipProps) {
  const generatedId = useId().replace(/:/g, "");
  const tooltipId = id ?? `tooltip-${generatedId}`;
  const existingDescription = isValidElement(children)
    ? (children.props as DescribedElementProps)["aria-describedby"]
    : undefined;
  const descriptionIds = existingDescription ? `${existingDescription} ${tooltipId}` : tooltipId;
  const describedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<DescribedElementProps>, {
      "aria-describedby": descriptionIds,
    })
    : children;

  return (
    <span className={classNames("ui-tooltip", `ui-tooltip--${placement}`)}>
      {describedChild}
      <span id={tooltipId} role="tooltip" className="ui-tooltip__bubble">
        {label}
      </span>
    </span>
  );
}
