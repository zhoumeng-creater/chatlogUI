import { useState } from "react";
import { CircleHelp } from "lucide-react";
import type { ServerConfigDraft } from "@l4/system";
import { Button, Field, Input, Tooltip, Typography } from "@l4/ui";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";
import { validateManualSecretKeyFormat } from "@/utils/manualSecretKeyValidation";

type ManualFieldErrors = Record<string, string>;
type SecretOverrideField = "dataKey" | "imgKey";

interface ManualAdvancedConfigPanelProps {
  loading: boolean;
  error: string | null;
  draft: ServerConfigDraft;
  fieldErrors?: ManualFieldErrors;
  onDraftChange: (draft: ServerConfigDraft) => void;
  onSubmit: () => Promise<void>;
  onChooseDataDir: () => Promise<string | null | undefined>;
  onChooseWorkDir: () => Promise<string | null | undefined>;
}

export function ManualAdvancedConfigPanel({
  loading,
  error,
  draft,
  fieldErrors = {},
  onDraftChange,
  onSubmit,
  onChooseDataDir,
  onChooseWorkDir,
}: ManualAdvancedConfigPanelProps) {
  const [secretOverrideValues, setSecretOverrideValues] = useState<Record<SecretOverrideField, string>>({
    dataKey: "",
    imgKey: "",
  });
  const [touchedSecretOverrides, setTouchedSecretOverrides] = useState<Record<SecretOverrideField, boolean>>({
    dataKey: false,
    imgKey: false,
  });

  function update(field: keyof ServerConfigDraft, value: string | number | boolean | null) {
    onDraftChange({ ...draft, [field]: value });
  }

  function updateSecretOverride(field: SecretOverrideField, value: string) {
    setSecretOverrideValues((current) => ({ ...current, [field]: value }));
    setTouchedSecretOverrides((current) => ({ ...current, [field]: true }));
    update(field, value);
  }

  const hasVersionMetadata = Boolean(draft.platform?.trim() && draft.version && draft.fullVersion?.trim());
  const hasDataKey = Boolean(draft.dataKey?.trim());
  const hasImgKey = Boolean(draft.imgKey?.trim());
  const dataKeyFormatError = touchedSecretOverrides.dataKey
    ? validateManualSecretKeyFormat(secretOverrideValues.dataKey, "数据密钥")
    : null;
  const imgKeyFormatError = touchedSecretOverrides.imgKey
    ? validateManualSecretKeyFormat(secretOverrideValues.imgKey, "媒体密钥")
    : null;
  const dataKeyError = dataKeyFormatError ?? fieldErrors.dataKey;
  const imgKeyError = imgKeyFormatError ?? fieldErrors.imgKey;
  const hasSecretFieldErrors = Boolean(dataKeyError || imgKeyError);
  const dataKeyStatus = getSecretStatus({
    hasExistingValue: hasDataKey,
    touched: touchedSecretOverrides.dataKey,
    value: secretOverrideValues.dataKey,
    formatError: dataKeyFormatError,
    emptyLabel: "缺失",
  });
  const imgKeyStatus = getSecretStatus({
    hasExistingValue: hasImgKey,
    touched: touchedSecretOverrides.imgKey,
    value: secretOverrideValues.imgKey,
    formatError: imgKeyFormatError,
    emptyLabel: "未读取",
  });

  return (
    <div className="settings-section setup-manual-panel">
      <form
        className="settings-stack"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <div>
          <Typography variant="h2">高级手动配置</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            适合迁移或排障时使用。选择数据目录后，应用会读取目录配置并隐藏密钥内容。
          </Typography>
        </div>

        <div className="form-grid">
          <div className="setup-directory-row">
            <Field id="manual-data-dir" label="数据目录 *" error={fieldErrors.dataDir}>
              <Input
                id="manual-data-dir"
                type="text"
                value={draft.dataDir ?? ""}
                onChange={(event) => update("dataDir", event.currentTarget.value)}
                placeholder="选择微信数据目录，完整路径不会在摘要中显示"
              />
            </Field>
            <div className="setup-directory-row__actions">
              <Button type="button" variant="secondary" size="md" onClick={() => void onChooseDataDir()}>
                选择数据目录
              </Button>
              <span className="setup-directory-row__help-spacer" aria-hidden="true" />
            </div>
          </div>

          <div className="setup-manual-status-grid" aria-label="目录配置读取状态">
            <div className="setup-manual-status-item">
              <Typography variant="caption" color="var(--text-secondary)">数据密钥</Typography>
              <strong>{dataKeyStatus}</strong>
            </div>
            <div className="setup-manual-status-item">
              <div className="setup-manual-status-item__head">
                <Typography variant="caption" color="var(--text-secondary)">媒体密钥</Typography>
                <SetupHelpTooltip
                  label="媒体密钥说明"
                  message="媒体密钥通常随数据目录配置自动读取。未读取时只影响图片、视频等媒体缓存解密；如果你已有独立媒体密钥，可在下方密钥手动覆盖中粘贴。"
                  placement="right"
                />
              </div>
              <strong>{imgKeyStatus}</strong>
            </div>
            <div className="setup-manual-status-item">
              <Typography variant="caption" color="var(--text-secondary)">目录配置</Typography>
              <strong>{hasVersionMetadata ? "已读取" : "缺失"}</strong>
            </div>
          </div>

          <div className="setup-directory-row">
            <Field id="manual-work-dir" label="工作目录" error={fieldErrors.workDir}>
              <Input
                id="manual-work-dir"
                type="text"
                value={draft.workDir ?? ""}
                onChange={(event) => update("workDir", event.currentTarget.value)}
              />
            </Field>
            <div className="setup-directory-row__actions">
              <Button type="button" variant="secondary" size="md" onClick={() => void onChooseWorkDir()}>
                选择工作目录
              </Button>
              <SetupHelpTooltip
                label="工作目录说明"
                message="工作目录用于保存 chatlog 运行缓存和临时文件。通常选择一个你有写入权限的空目录或应用专用目录，不要选择微信数据目录本身。"
                placement="left"
              />
            </div>
          </div>

          <label className="setup-media-cache-toggle">
            <input
              type="checkbox"
              checked={Boolean(draft.saveDecryptedMedia)}
              onChange={(event) => update("saveDecryptedMedia", event.currentTarget.checked)}
            />
            <span>
              <strong>保存解密后的媒体缓存</strong>
              <small>关闭后仍可连接数据库，只是不保留媒体解密缓存。</small>
            </span>
          </label>

          <Field id="manual-http-addr" label="本机服务地址" error={fieldErrors.httpAddr}>
            <Input
              id="manual-http-addr"
              type="text"
              value={draft.httpAddr ?? "127.0.0.1:5030"}
              onChange={(event) => update("httpAddr", event.currentTarget.value)}
            />
          </Field>

          <details className="setup-manual-technical" open={hasSecretFieldErrors}>
            <summary>密钥手动覆盖</summary>
            <div className="form-grid">
              <Typography variant="caption" color="var(--text-secondary)">
                默认从数据目录配置读取密钥。只有在你明确拿到了独立密钥、且自动读取失败时，才需要在这里粘贴覆盖。
              </Typography>

              <div className="setup-secret-override-row">
                <Field id="manual-data-key" label="数据密钥覆盖" error={dataKeyError}>
                  <Input
                    id="manual-data-key"
                    type="password"
                    autoComplete="off"
                    value={secretOverrideValues.dataKey}
                    onChange={(event) => updateSecretOverride("dataKey", event.currentTarget.value)}
                    placeholder={
                      hasDataKey && !touchedSecretOverrides.dataKey
                        ? "已读取；粘贴新密钥可覆盖"
                        : "64位十六进制密钥"
                    }
                  />
                </Field>
                <SetupHelpTooltip
                  label="数据密钥说明"
                  message="数据密钥用于解密聊天数据库，通常从所选数据目录的配置自动读取。只有自动读取失败，且你已有64位十六进制 data_key 时，才需要手动粘贴。"
                  placement="left"
                />
              </div>

              <div className="setup-secret-override-row">
                <Field id="manual-img-key" label="媒体密钥覆盖" error={imgKeyError}>
                  <Input
                    id="manual-img-key"
                    type="password"
                    autoComplete="off"
                    value={secretOverrideValues.imgKey}
                    onChange={(event) => updateSecretOverride("imgKey", event.currentTarget.value)}
                    placeholder={
                      hasImgKey && !touchedSecretOverrides.imgKey
                        ? "已读取；粘贴新密钥可覆盖"
                        : "可选，64位十六进制媒体密钥"
                    }
                  />
                </Field>
                <SetupHelpTooltip
                  label="媒体密钥覆盖说明"
                  message="媒体密钥通常随数据目录配置自动读取。未读取时只影响图片、视频等媒体缓存解密；如果你已有独立媒体密钥，可在这里粘贴覆盖。"
                  placement="left"
                />
              </div>

              <div className="setup-secret-next-step">
                粘贴后不会自动读取；请点击页面顶部的“保存并验证配置”，应用会检查密钥、目录配置和本机服务地址。
              </div>
            </div>
          </details>
        </div>

        {loading && (
          <Typography variant="caption" color="var(--text-secondary)">
            正在验证手动配置...
          </Typography>
        )}

        {error && (
          <div className="settings-error" role="alert">
            {formatSafeUserFacingError(error)}
          </div>
        )}
      </form>
    </div>
  );
}

function getSecretStatus({
  hasExistingValue,
  touched,
  value,
  formatError,
  emptyLabel,
}: {
  hasExistingValue: boolean;
  touched: boolean;
  value: string;
  formatError: string | null;
  emptyLabel: string;
}) {
  if (touched && value.trim()) {
    return formatError ? "格式待修正" : "已填写";
  }
  return hasExistingValue ? "已读取" : emptyLabel;
}

function SetupHelpTooltip({
  label,
  message,
  placement,
}: {
  label: string;
  message: string;
  placement: "left" | "right";
}) {
  return (
    <Tooltip label={message} placement={placement}>
      <button type="button" className="setup-help-button" aria-label={label}>
        <CircleHelp size={14} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}
