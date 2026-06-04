import type { ChangeEvent } from "react";
import type { SemanticSetupDraft } from "@l2/commander/semanticSetupViewModel";
import { Field } from "@l4/ui/Field";
import { Input } from "@l4/ui/Input";

interface SemanticAdvancedConfigSheetProps {
  draft: SemanticSetupDraft;
  fieldErrors: Record<string, string>;
  onChange: <K extends keyof SemanticSetupDraft>(key: K, value: SemanticSetupDraft[K]) => void;
}

export function SemanticAdvancedConfigSheet({
  draft,
  fieldErrors,
  onChange,
}: SemanticAdvancedConfigSheetProps) {
  return (
    <details className="semantic-advanced">
      <summary>高级参数</summary>
      <div className="semantic-advanced__grid">
        <NumberField
          id="semantic-index-workers"
          label="索引并发"
          value={draft.indexWorkers}
          error={fieldErrors.indexWorkers}
          onChange={(value) => onChange("indexWorkers", value)}
        />
        <NumberField
          id="semantic-recall-k"
          label="召回数量"
          value={draft.recallK}
          error={fieldErrors.recallK}
          onChange={(value) => onChange("recallK", value)}
        />
        <NumberField
          id="semantic-top-n"
          label="最终 Top N"
          value={draft.topN}
          error={fieldErrors.topN}
          onChange={(value) => onChange("topN", value)}
        />
        <NumberField
          id="semantic-threshold"
          label="相似度阈值"
          value={draft.similarityThreshold}
          step={0.01}
          error={fieldErrors.similarityThreshold}
          onChange={(value) => onChange("similarityThreshold", value)}
        />
        <NumberField
          id="semantic-chat-max-tokens"
          label="回答 token 上限"
          value={draft.chatMaxTokens}
          error={fieldErrors.chatMaxTokens}
          onChange={(value) => onChange("chatMaxTokens", value)}
        />
        <NumberField
          id="semantic-chat-temperature"
          label="回答温度"
          value={draft.chatTemperature}
          step={0.1}
          error={fieldErrors.chatTemperature}
          onChange={(value) => onChange("chatTemperature", value)}
        />
      </div>
      {draft.indexWorkers > 4 && !fieldErrors.indexWorkers && (
        <p className="semantic-advanced__warning">
          高并发索引可能增加内存、显存或远程 API 费用压力，保存前请确认。
        </p>
      )}
    </details>
  );
}

interface NumberFieldProps {
  id: string;
  label: string;
  value: number;
  step?: number;
  error?: string;
  onChange: (value: number) => void;
}

function NumberField({ id, label, value, step = 1, error, onChange }: NumberFieldProps) {
  return (
    <Field id={id} label={label} error={error}>
      <Input
        id={id}
        type="number"
        step={step}
        value={value}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(Number(event.target.value))}
      />
    </Field>
  );
}
