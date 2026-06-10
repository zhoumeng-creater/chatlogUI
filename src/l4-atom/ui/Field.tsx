import { Children, cloneElement, Fragment, isValidElement, type ReactElement, type ReactNode } from "react";
import { classNames } from "@/utils/classNames";
import { getFieldDescriptionId } from "./formControl";

interface FieldProps {
  id?: string;
  label: string;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  const hintId = getFieldDescriptionId(id, "hint");
  const errorId = getFieldDescriptionId(id, "error");
  const hasHint = hint !== undefined && hint !== null && hint !== false && hint !== "";
  const hasError = error !== undefined && error !== null && error !== false && error !== "";
  const enhancedChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    if (!isFieldControlElement(child)) return child;

    const control = child as ReactElement<{
      id?: string;
      "aria-describedby"?: string;
      "aria-errormessage"?: string;
      "aria-invalid"?: boolean | "true" | "false";
    }>;
    const existingDescription = control.props["aria-describedby"];
    const describedBy = classNames(existingDescription, hasHint && hintId, hasError && errorId) || undefined;

    return cloneElement(control, {
      id: control.props.id ?? id,
      "aria-describedby": describedBy,
      "aria-errormessage": hasError ? errorId : control.props["aria-errormessage"],
      "aria-invalid": hasError ? true : control.props["aria-invalid"],
    });
  });

  return (
    <label className="ui-field" htmlFor={id}>
      <span className="ui-field__label">{label}</span>
      {enhancedChildren}
      {hasHint && (
        <span id={hintId} className="ui-field__hint">
          {hint}
        </span>
      )}
      {hasError && (
        <span id={errorId} className="ui-field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

function isFieldControlElement(child: ReactElement): boolean {
  if (child.type === Fragment) return false;
  if (typeof child.type !== "string") return true;
  return child.type === "input" || child.type === "select" || child.type === "textarea";
}
