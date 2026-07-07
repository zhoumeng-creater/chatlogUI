import { Check, ChevronDown } from "lucide-react";
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { classNames } from "@/utils/classNames";
import {
  focusInitialOverlayTarget,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "./overlayFocus";
import {
  resolveFloatingMenuPosition,
  type FloatingMenuPlacement,
} from "./floatingPlacement";
import { getControlClassName, type ControlSize } from "./formControl";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  controlSize?: ControlSize;
}

interface SelectOptionModel {
  value: string;
  label: string;
  disabled: boolean;
}

type OptionElement = ReactElement<{
  value?: string | number;
  disabled?: boolean;
  children?: ReactNode;
}>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      controlSize = "md",
      className = "",
      children,
      value,
      defaultValue,
      disabled,
      onChange,
      "aria-label": ariaLabel,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      id,
      ...props
    },
    ref,
  ) => {
    const nativeRef = useRef<HTMLSelectElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const restoreTargetRef = useRef<FocusTarget | null>(null);
    const placementRef = useRef<FloatingMenuPlacement>("bottom-start");
    const generatedId = useId().replace(/:/g, "");
    const selectId = id ?? `ui-select-${generatedId}`;
    const menuId = `${selectId}-menu`;
    const [open, setOpen] = useState(false);
    const [internalValue, setInternalValue] = useState(() => normalizeSelectValue(defaultValue));
    const options = parseOptionChildren(children);
    const selectedValue = normalizeSelectValue(value ?? internalValue ?? options[0]?.value ?? "");
    const selectedOption =
      options.find((option) => option.value === selectedValue) ??
      options.find((option) => !option.disabled) ??
      options[0];

    useImperativeHandle(ref, () => nativeRef.current as HTMLSelectElement);

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
              width: Math.max(root.offsetWidth, menu.offsetWidth || 220),
              height: menu.offsetHeight || 180,
            },
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
          });
          placementRef.current = position.placement;
          menu.dataset.placement = placementRef.current;
          menu.style.setProperty("--floating-menu-left", `${Math.round(position.left)}px`);
          menu.style.setProperty("--floating-menu-top", `${Math.round(position.top)}px`);
          menu.style.setProperty("--floating-menu-width", `${Math.max(root.offsetWidth, 180)}px`);
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

    const selectOption = (nextValue: string) => {
      if (disabled) return;
      if (value === undefined) setInternalValue(nextValue);
      emitNativeSelectChange(nativeRef.current, nextValue);
      closeMenu();
    };

    const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      if (trapOverlayFocus(menuRef.current, document.activeElement, event)) return;
      if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;
      event.preventDefault();
      event.stopPropagation();
      closeMenu();
    };

    const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
      if (!["ArrowDown", "Enter", " "].includes(event.key)) return;
      event.preventDefault();
      restoreTargetRef.current = event.currentTarget;
      setOpen(true);
    };

    const nativeChildren = cloneOptionChildren(children);
    const triggerLabel = selectedOption?.label ?? "选择";
    const menu = (
      <div
        id={menuId}
        ref={menuRef}
        className="ui-select__menu"
        data-placement={placementRef.current}
        role="listbox"
        aria-label={ariaLabel}
        hidden={!open}
        onKeyDown={handleMenuKeyDown}
      >
        {options.map((option) => {
          const selected = option.value === selectedValue;
          return (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={selected}
              disabled={option.disabled}
              className={classNames(
                "ui-select__option",
                selected && "ui-select__option--selected",
              )}
              onClick={() => selectOption(option.value)}
            >
              <span className="ui-select__option-label">{option.label}</span>
              {selected && <Check size={14} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    );

    return (
      <div
        ref={rootRef}
        className={classNames("ui-select", `ui-select--${controlSize}`, className)}
        data-disabled={disabled ? "true" : undefined}
      >
        <select
          ref={nativeRef}
          id={selectId}
          className={classNames(
            getControlClassName("select", controlSize),
            "ui-select__native",
          )}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-hidden="true"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          tabIndex={-1}
          onChange={onChange}
          {...props}
        >
          {nativeChildren}
        </select>
        <button
          type="button"
          className="ui-select__trigger"
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={menuId}
          disabled={disabled}
          onClick={(event) => {
            restoreTargetRef.current = event.currentTarget;
            setOpen((current) => !current);
          }}
          onKeyDown={handleTriggerKeyDown}
        >
          <span>{triggerLabel}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {typeof document === "undefined" ? menu : createPortal(menu, document.body)}
      </div>
    );
  },
);

Select.displayName = "Select";

function parseOptionChildren(children: ReactNode): SelectOptionModel[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isOptionElement(child)) return [];
    const value = child.props.value === undefined
      ? extractText(child.props.children)
      : String(child.props.value);
    return [{
      value,
      label: extractText(child.props.children) || value,
      disabled: Boolean(child.props.disabled),
    }];
  });
}

function cloneOptionChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (!isOptionElement(child)) return child;
    return cloneElement(child, {
      value: child.props.value === undefined ? extractText(child.props.children) : child.props.value,
    });
  });
}

function isOptionElement(child: ReactNode): child is OptionElement {
  return isValidElement(child) && child.type === "option";
}

function extractText(value: ReactNode): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(extractText).join("");
  return "";
}

function normalizeSelectValue(value: SelectHTMLAttributes<HTMLSelectElement>["value"]): string | undefined {
  if (Array.isArray(value)) return value[0] === undefined ? undefined : String(value[0]);
  if (value === undefined || value === null) return undefined;
  return String(value);
}

function emitNativeSelectChange(select: HTMLSelectElement | null, value: string) {
  if (!select) return;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
