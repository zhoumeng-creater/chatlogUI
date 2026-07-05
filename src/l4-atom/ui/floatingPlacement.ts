export interface FloatingRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FloatingSize {
  width: number;
  height: number;
}

export type FloatingMenuPlacement = "top-end" | "top-start" | "bottom-end" | "bottom-start";

interface ResolveFloatingMenuPlacementInput {
  preferred: FloatingMenuPlacement;
  triggerRect: FloatingRect;
  overlaySize: FloatingSize;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
  gap?: number;
}

export interface FloatingMenuPosition {
  placement: FloatingMenuPlacement;
  left: number;
  top: number;
}

export function resolveFloatingMenuPlacement({
  preferred,
  triggerRect,
  overlaySize,
  viewportWidth,
  viewportHeight,
  margin = 8,
  gap = 4,
}: ResolveFloatingMenuPlacementInput): FloatingMenuPlacement {
  const [preferredSide, preferredAlign] = preferred.split("-") as ["top" | "bottom", "start" | "end"];
  const spaceAbove = triggerRect.top - margin - gap;
  const spaceBelow = viewportHeight - triggerRect.bottom - margin - gap;
  const side = preferredSide === "top"
    ? (spaceAbove >= overlaySize.height || spaceAbove >= spaceBelow ? "top" : "bottom")
    : (spaceBelow >= overlaySize.height || spaceBelow >= spaceAbove ? "bottom" : "top");

  const startRight = triggerRect.left + overlaySize.width;
  const endLeft = triggerRect.right - overlaySize.width;
  let align = preferredAlign;

  if (preferredAlign === "end" && endLeft < margin && startRight <= viewportWidth - margin) {
    align = "start";
  } else if (preferredAlign === "start" && startRight > viewportWidth - margin && endLeft >= margin) {
    align = "end";
  }

  return `${side}-${align}`;
}

export function resolveFloatingMenuPosition(
  input: ResolveFloatingMenuPlacementInput,
): FloatingMenuPosition {
  const margin = input.margin ?? 8;
  const gap = input.gap ?? 4;
  const placement = resolveFloatingMenuPlacement(input);
  const [side, align] = placement.split("-") as ["top" | "bottom", "start" | "end"];
  const rawLeft = align === "end"
    ? input.triggerRect.right - input.overlaySize.width
    : input.triggerRect.left;
  const rawTop = side === "top"
    ? input.triggerRect.top - input.overlaySize.height - gap
    : input.triggerRect.bottom + gap;

  return {
    placement,
    left: clampToViewport(rawLeft, input.overlaySize.width, input.viewportWidth, margin),
    top: clampToViewport(rawTop, input.overlaySize.height, input.viewportHeight, margin),
  };
}

function clampToViewport(value: number, size: number, viewportSize: number, margin: number): number {
  const max = Math.max(margin, viewportSize - size - margin);
  return Math.min(Math.max(value, margin), max);
}
