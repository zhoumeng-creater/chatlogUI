import type { ChangeEvent } from "react";
import { useState } from "react";
import type {
  SemanticSetupDraft,
  SemanticSetupView,
} from "@l2/commander/semanticSetupViewModel";
import type { ConnectionTestResult } from "@/l2-coordinator/api-docs/semantic";
import { Button } from "@l4/ui/Button";
import { Field } from "@l4/ui/Field";
import { Input } from "@l4/ui/Input";
import { Select } from "@l4/ui/Select";
import { Typography } from "@l4/ui/Typography";
import { classNames } from "@/utils/classNames";
import { SemanticAdvancedConfigSheet } from "./SemanticAdvancedConfigSheet";
import { SemanticConfirmDialog } from "./SemanticConfirmDialog";
import { SemanticCredentialField } from "./SemanticCredentialField";
import { SemanticProviderSection } from "./SemanticProviderSection";
import { SemanticReadinessSummary } from "./SemanticReadinessSummary";
import {
  getSafeSemanticDiagnosticText,
  getSafeSemanticEndpointLabel,
} from "./semanticSetupDisplay";

interface SemanticSetupCenterProps {
  initialDraft: SemanticSetupDraft;
  getSetupView: (draft: SemanticSetupDraft) => SemanticSetupView;
  onTestConnection: (draft: SemanticSetupDraft) => Promise<ConnectionTestResult>;
  onSave: (draft: SemanticSetupDraft) => Promise<void>;
  onClose?: () => void;
  compact?: boolean;
  privacyOn?: boolean;
}

export function SemanticSetupCenter({
  initialDraft,
  getSetupView,
  onTestConnection,
  onSave,
  onClose,
  compact = false,
  privacyOn = false,
}: SemanticSetupCenterProps) {
  const [draft, setDraft] = useState(initialDraft);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [confirmHighWorkers, setConfirmHighWorkers] = useState(false);
  const view = getSetupView(draft);

  const updateDraft = <K extends keyof SemanticSetupDraft>(key: K, value: SemanticSetupDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setTestResult(null);
    setSubmitError("");
    setConfirmHighWorkers(false);
  };

  const handleTest = async () => {
    const currentView = getSetupView(draft);
    if (!currentView.validation.valid) {
      setSubmitError("请先修复配置字段后再测试连接。");
      return;
    }
    setTesting(true);
    setSubmitError("");
    try {
      setTestResult(await onTestConnection(draft));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (confirmedHighWorkers = false) => {
    const currentView = getSetupView(draft);
    if (!currentView.validation.valid) {
      setSubmitError("请先修复配置字段后再保存。");
      return;
    }
    if (currentView.validation.confirmations.includes("high_index_workers") && !confirmedHighWorkers) {
      setSubmitError("");
      setConfirmHighWorkers(true);
      return;
    }
    setSaving(true);
    setSubmitError("");
    try {
      await onSave(draft);
      setConfirmHighWorkers(false);
      onClose?.();
    } catch (error) {
      setSubmitError(getSafeSemanticDiagnosticText(error instanceof Error ? error.message : "保存语义配置失败"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={classNames("semantic-setup-center", compact && "semantic-setup-center--compact")}>
      <div className="semantic-setup-center__header">
        <div>
          <Typography variant="h3" className="semantic-state__title">
            语义设置
          </Typography>
          <Typography variant="body" color="var(--color-text-secondary)" className="semantic-state__copy">
            配置 Embedding、Rerank、Chat 和凭证后再构建本地语义索引。
          </Typography>
        </div>
      </div>

      <SemanticReadinessSummary items={view.readiness} />

      <div className="semantic-provider-grid">
        <SemanticProviderSection
          title="Embedding"
          description="负责向量化本地聊天片段，索引必须先通过这一项。"
          error={view.validation.sectionErrors.embedding}
        >
          <ProviderFields
            role="embedding"
            provider={draft.embeddingProvider}
            model={draft.embeddingModel}
            modelLabel="Embedding 模型"
            dimension={draft.embeddingDimension}
            fieldErrors={view.validation.fieldErrors}
            onChange={updateDraft}
          />
          <Field id="semantic-ollama-url" label="Ollama 地址">
            <Input
              id="semantic-ollama-url"
              value={getEndpointInputValue(draft.ollamaBaseUrl, privacyOn)}
              disabled={privacyOn}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("ollamaBaseUrl", event.target.value)}
            />
          </Field>
        </SemanticProviderSection>

        <SemanticProviderSection
          title="Rerank"
          description="负责对召回结果重新排序，提升问答和搜索可信度。"
          error={view.validation.sectionErrors.rerank}
        >
          <ProviderFields
            role="rerank"
            provider={draft.rerankProvider}
            model={draft.rerankModel}
            modelLabel="Rerank 模型"
            fieldErrors={view.validation.fieldErrors}
            onChange={updateDraft}
          />
        </SemanticProviderSection>

        <SemanticProviderSection
          title="Chat"
          description="负责问答、摘要和图谱抽取等生成式能力。"
          error={view.validation.sectionErrors.chat}
        >
          <ProviderFields
            role="chat"
            provider={draft.chatProvider}
            model={draft.chatModel}
            modelLabel="Chat 模型"
            fieldErrors={view.validation.fieldErrors}
            onChange={updateDraft}
          />
          <Field id="semantic-glm-base-url" label="GLM Base URL">
            <Input
              id="semantic-glm-base-url"
              value={getEndpointInputValue(draft.baseUrl, privacyOn)}
              disabled={privacyOn}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("baseUrl", event.target.value)}
            />
          </Field>
          <Field id="semantic-deepseek-base-url" label="DeepSeek Base URL">
            <Input
              id="semantic-deepseek-base-url"
              value={getEndpointInputValue(draft.deepseekBaseUrl, privacyOn)}
              disabled={privacyOn}
              onChange={(event: ChangeEvent<HTMLInputElement>) => updateDraft("deepseekBaseUrl", event.target.value)}
            />
          </Field>
        </SemanticProviderSection>
      </div>

      <div className="semantic-credential-grid">
        <SemanticCredentialField
          id="semantic-glm-api-key"
          label="GLM API Key"
          value={draft.apiKeyInput}
          state={view.credentials.apiKey}
          error={view.validation.fieldErrors.apiKeyInput}
          onChange={(value) => updateDraft("apiKeyInput", value)}
        />
        <SemanticCredentialField
          id="semantic-deepseek-api-key"
          label="DeepSeek API Key"
          value={draft.deepseekApiKeyInput}
          state={view.credentials.deepseek}
          error={view.validation.fieldErrors.deepseekApiKeyInput}
          onChange={(value) => updateDraft("deepseekApiKeyInput", value)}
        />
      </div>

      <SemanticAdvancedConfigSheet
        draft={draft}
        fieldErrors={view.validation.fieldErrors}
        onChange={updateDraft}
      />

      {submitError && (
        <p className="semantic-setup-center__error" role="alert">
          {submitError}
        </p>
      )}
      {testResult && (
        <p
          className={classNames(
            "semantic-setup-center__test-result",
            (testResult.ok ?? testResult.success)
              ? "semantic-setup-center__test-result--success"
              : "semantic-setup-center__test-result--error",
          )}
          role="status"
        >
          {getSafeSemanticDiagnosticText(testResult.message)}
          {testResult.latencyMs ? ` (${testResult.latencyMs}ms)` : ""}
        </p>
      )}

      <div className="semantic-setup-center__actions">
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        )}
        <Button variant="secondary" onClick={handleTest} loading={testing}>
          测试连接
        </Button>
        <Button variant="primary" onClick={() => handleSave()} loading={saving}>
          保存配置
        </Button>
      </div>

      {confirmHighWorkers && (
        <SemanticConfirmDialog
          heading="确认高并发索引？"
          body="高并发索引可能增加内存、显存或远程 API 费用压力。确认后才会保存该配置。"
          cancelLabel="取消"
          confirmLabel="确认保存"
          confirmVariant="primary"
          confirming={saving}
          onCancel={() => setConfirmHighWorkers(false)}
          onConfirm={() => handleSave(true)}
        />
      )}
    </section>
  );
}

function getEndpointInputValue(value: string, privacyOn: boolean): string {
  return privacyOn ? getSafeSemanticEndpointLabel(value, true) : value;
}

interface ProviderFieldsProps {
  role: "embedding" | "rerank" | "chat";
  provider: string;
  model: string;
  modelLabel: string;
  dimension?: number;
  fieldErrors: Record<string, string>;
  onChange: <K extends keyof SemanticSetupDraft>(key: K, value: SemanticSetupDraft[K]) => void;
}

function ProviderFields({
  role,
  provider,
  model,
  modelLabel,
  dimension,
  fieldErrors,
  onChange,
}: ProviderFieldsProps) {
  const providerKey = `${role}Provider` as keyof SemanticSetupDraft;
  const modelKey = `${role}Model` as keyof SemanticSetupDraft;
  return (
    <>
      <Field id={`semantic-${role}-provider`} label={`${roleLabel(role)} Provider`} error={fieldErrors[providerKey]}>
        <Select
          id={`semantic-${role}-provider`}
          value={provider}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            onChange(providerKey, event.target.value as never)
          }
        >
          {providerOptions(role).map((option) => (
            <option key={option} value={option}>
              {providerLabel(option)}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={`semantic-${role}-model`} label={modelLabel} error={fieldErrors[modelKey]}>
        <Input
          id={`semantic-${role}-model`}
          value={model}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onChange(modelKey, event.target.value as never)
          }
        />
      </Field>
      {role === "embedding" && (
        <Field
          id="semantic-embedding-dimension"
          label="向量维度"
          error={fieldErrors.embeddingDimension}
        >
          <Input
            id="semantic-embedding-dimension"
            type="number"
            value={dimension ?? 0}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onChange("embeddingDimension", Number(event.target.value))
            }
          />
        </Field>
      )}
    </>
  );
}

function providerOptions(role: "embedding" | "rerank" | "chat"): string[] {
  if (role === "chat") return ["glm", "deepseek", "ollama"];
  return ["ollama", "glm"];
}

function providerLabel(provider: string): string {
  if (provider === "glm") return "GLM";
  if (provider === "deepseek") return "DeepSeek";
  if (provider === "ollama") return "Ollama";
  return provider;
}

function roleLabel(role: "embedding" | "rerank" | "chat"): string {
  if (role === "embedding") return "Embedding";
  if (role === "rerank") return "Rerank";
  return "Chat";
}
