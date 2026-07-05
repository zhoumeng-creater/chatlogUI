import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { classNames } from "@/utils/classNames";

export type TooltipPlacement = "top-end" | "top" | "right" | "bottom" | "left";

interface TooltipRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

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
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [resolvedPlacement, setResolvedPlacement] = useState<TooltipPlacement>(placement);
  const existingDescription = isValidElement(children)
    ? (children.props as DescribedElementProps)["aria-describedby"]
    : undefined;
  const descriptionIds = existingDescription ? `${existingDescription} ${tooltipId}` : tooltipId;
  const describedChild = isValidElement(children)
    ? cloneElement(children as ReactElement<DescribedElementProps>, {
      "aria-describedby": descriptionIds,
    })
    : children;

  useEffect(() => {
    setResolvedPlacement(placement);
  }, [placement]);

  const updateResolvedPlacement = () => {
    const element = wrapperRef.current;
    if (!element || typeof window === "undefined") return;
    setResolvedPlacement(resolveTooltipPlacement({
      preferred: placement,
      triggerRect: element.getBoundingClientRect(),
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    }));
  };

  return (
    <span
      ref={wrapperRef}
      className={classNames("ui-tooltip", `ui-tooltip--${resolvedPlacement}`)}
      onPointerEnter={updateResolvedPlacement}
      onFocusCapture={updateResolvedPlacement}
    >
      {describedChild}
      <span id={tooltipId} role="tooltip" className="ui-tooltip__bubble">
        {label}
      </span>
    </span>
  );
}

export function resolveTooltipPlacement({
  preferred,
  triggerRect,
  viewportWidth,
  viewportHeight,
  edgePadding = 44,
}: {
  preferred: TooltipPlacement;
  triggerRect: TooltipRect;
  viewportWidth: number;
  viewportHeight: number;
  edgePadding?: number;
}): TooltipPlacement {
  if ((preferred === "top" || preferred === "top-end") && triggerRect.top < edgePadding) {
    return "bottom";
  }
  if (preferred === "bottom" && viewportHeight - triggerRect.bottom < edgePadding) {
    return "top";
  }
  if (preferred === "left" && triggerRect.left < 220) {
    return "right";
  }
  if (preferred === "right" && viewportWidth - triggerRect.right < 220) {
    return "left";
  }
  return preferred;
}
