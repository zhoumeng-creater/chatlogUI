import type { ChangeEvent } from "react";
import type { SemanticCredentialState } from "@l2/commander/semanticSetupViewModel";
import { Field } from "@l4/ui/Field";
import { Input } from "@l4/ui/Input";
import { StatusIndicator } from "@l4/ui/StatusIndicator";

interface SemanticCredentialFieldProps {
  id: string;
  label: string;
  value: string;
  state: SemanticCredentialState;
  error?: string;
  onChange: (value: string) => void;
}

export function SemanticCredentialField({
  id,
  label,
  value,
  state,
  error,
  onChange,
}: SemanticCredentialFieldProps) {
  return (
    <div className="semantic-credential-field">
      <Field
        id={id}
        label={label}
        hint={<StatusIndicator label={state.label} tone={state.tone} />}
        error={error}
      >
        <Input
          id={id}
          type="password"
          autoComplete="off"
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          placeholder="留空不会回显或清空已保存 key"
        />
      </Field>
    </div>
  );
}
