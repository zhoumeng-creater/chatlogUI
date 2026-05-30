import type { ReactNode } from "react";
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

  return (
    <label className="ui-field" htmlFor={id}>
      <span className="ui-field__label">{label}</span>
      {children}
      {hint && !error && (
        <span id={hintId} className="ui-field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="ui-field__error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
