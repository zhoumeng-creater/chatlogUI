import {
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { classNames } from "@/utils/classNames";

export type WorkspacePanelSplitterDirection = "normal" | "reverse";

interface WorkspacePanelSplitterProps {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  direction: WorkspacePanelSplitterDirection;
  onChange: (value: number) => void;
  onReset: () => void;
  className?: string;
}

interface KeyboardValueInput {
  key: string;
  value: number;
  min: number;
  max: number;
  step: number;
  direction: WorkspacePanelSplitterDirection;
}

export function WorkspacePanelSplitter({
  label,
  value,
  min,
  max,
  defaultValue,
  direction,
  onChange,
  onReset,
  className = "",
}: WorkspacePanelSplitterProps) {
  const dragStartRef = useRef<{ pointerX: number; value: number } | null>(null);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    dragStartRef.current = { pointerX: event.clientX, value };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    if (!dragStartRef.current) return;
    const delta = event.clientX - dragStartRef.current.pointerX;
    const signedDelta = direction === "normal" ? delta : -delta;
    onChange(clampValue(dragStartRef.current.value + signedDelta, min, max));
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const nextValue = getNextSplitterValue({
      key: event.key,
      value,
      min,
      max,
      step: event.shiftKey ? 32 : 16,
      direction,
    });
    if (nextValue === value) return;
    event.preventDefault();
    onChange(nextValue);
  }

  return (
    <button
      type="button"
      className={classNames("workspace-panel-splitter", className)}
      role="separator"
      aria-label={label}
      aria-orientation="vertical"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value}px`}
      data-default-value={defaultValue}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}

export function getNextSplitterValue({
  key,
  value,
  min,
  max,
  step,
  direction,
}: KeyboardValueInput): number {
  if (key === "Home") return min;
  if (key === "End") return max;

  const sign = direction === "normal" ? 1 : -1;
  if (key === "ArrowRight") return clampValue(value + (step * sign), min, max);
  if (key === "ArrowLeft") return clampValue(value - (step * sign), min, max);

  return value;
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
