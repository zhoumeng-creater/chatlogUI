import { Check, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import {
  focusInitialOverlayTarget,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "@l4/ui";
import {
  resolveFloatingMenuPosition,
  type FloatingMenuPlacement,
} from "@l4/ui/floatingPlacement";
import { classNames } from "@/utils/classNames";

export type MessageOptionTone =
  | "neutral"
  | "slate"
  | "blue"
  | "green"
  | "amber"
  | "rose"
  | "violet";

export interface MessageOptionSelectOption {
  value: string;
  label: string;
  count: number;
  tone?: MessageOptionTone;
}

interface MessageOptionSelectProps {
  ariaLabel: string;
  value: string;
  options: MessageOptionSelectOption[];
  disabled?: boolean;
  onChange: (value: string) => void;
}

export function MessageOptionSelect({
  ariaLabel,
  value,
  options,
  disabled = false,
  onChange,
}: MessageOptionSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);
  const placementRef = useRef<FloatingMenuPlacement>("bottom-start");
  const generatedId = useId().replace(/:/g, "");
  const menuId = `message-option-select-${generatedId}`;
  const selected = options.find((option) => option.value === value) ?? options[0];

  const closeMenu = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    if (!restoreTargetRef.current && typeof document !== "undefined") {
      restoreTargetRef.current = document.activeElement as FocusTarget | null;
    }

    const frame = window.requestAnimationFrame(() => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (root && menu) {
        const position = resolveFloatingMenuPosition({
          preferred: "bottom-start",
          triggerRect: root.getBoundingClientRect(),
          overlaySize: {
            width: menu.offsetWidth || 220,
            height: menu.offsetHeight || 180,
          },
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        });
        placementRef.current = position.placement;
        menu.dataset.placement = placementRef.current;
        menu.style.setProperty("--floating-menu-left", `${Math.round(position.left)}px`);
        menu.style.setProperty("--floating-menu-top", `${Math.round(position.top)}px`);
      }
      focusInitialOverlayTarget(menuRef.current);
    });

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!target || rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, [closeMenu, open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(menuRef.current, document.activeElement, event)) return;
    if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;
    event.preventDefault();
    event.stopPropagation();
    closeMenu();
  };

  const menu = (
    <div
      id={menuId}
      ref={menuRef}
      className="message-option-select__menu"
      data-placement={placementRef.current}
      role="listbox"
      aria-label={ariaLabel}
      hidden={!open}
      onKeyDown={handleKeyDown}
    >
      {options.map((option) => {
        const selectedOption = option.value === selected?.value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={selectedOption}
            aria-label={`${option.label} · ${option.count.toLocaleString()} 条`}
            className={classNames(
              "message-option-select__option",
              selectedOption && "message-option-select__option--selected",
            )}
            onClick={() => {
              onChange(option.value);
              closeMenu();
            }}
          >
            <span
              className="message-option-select__dot"
              data-tone={option.tone ?? "neutral"}
              aria-hidden="true"
            />
            <span className="message-option-select__label">{option.label}</span>
            <span className="message-option-select__count">{option.count.toLocaleString()} 条</span>
            {selectedOption && <Check size={14} aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className="message-option-select">
      <button
        type="button"
        className="message-option-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        disabled={disabled}
        onClick={(event) => {
          restoreTargetRef.current = event.currentTarget;
          setOpen((current) => !current);
        }}
      >
        <span
          className="message-option-select__dot"
          data-tone={selected?.tone ?? "neutral"}
          aria-hidden="true"
        />
        <span>{selected ? `${selected.label} · ${selected.count.toLocaleString()} 条` : "选择"}</span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>
      {typeof document === "undefined" ? menu : createPortal(menu, document.body)}
    </div>
  );
}
