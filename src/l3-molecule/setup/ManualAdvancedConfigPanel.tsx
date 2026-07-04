import { useState } from "react";
import { CircleHelp } from "lucide-react";
import type { ServerConfigDraft } from "@l4/system";
import { Button, Field, Input, Tooltip, Typography } from "@l4/ui";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";

type ManualFieldErrors = Record<string, string>;

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
  const [showKey, setShowKey] = useState(false);
  const [showImgKey, setShowImgKey] = useState(false);

  function update(field: keyof ServerConfigDraft, value: string | number | boolean | null) {
    onDraftChange({ ...draft, [field]: value });
  }

  const hasSecretFieldErrors = Boolean(fieldErrors.dataKey || fieldErrors.imgKey);
  const hasVersionMetadata = Boolean(draft.platform?.trim() && draft.version && draft.fullVersion?.trim());
  const hasDataKey = Boolean(draft.dataKey?.trim());
  const hasImgKey = Boolean(draft.imgKey?.trim());

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
              <strong>{hasDataKey ? "已读取" : "缺失"}</strong>
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
              <strong>{hasImgKey ? "已读取" : "未读取"}</strong>
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

              <div className="settings-inline">
                <Field id="manual-data-key" label="数据密钥覆盖" error={fieldErrors.dataKey}>
                  <Input
                    id="manual-data-key"
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    value={hasDataKey ? "" : draft.dataKey ?? ""}
                    onChange={(event) => update("dataKey", event.currentTarget.value)}
                    placeholder={hasDataKey ? "已读取；粘贴新密钥可覆盖" : "64位十六进制密钥"}
                  />
                </Field>
                <Button type="button" variant="secondary" size="md" onClick={() => setShowKey((value) => !value)}>
                  {showKey ? "隐藏" : "显示"}
                </Button>
              </div>

              <div className="settings-inline">
                <Field id="manual-img-key" label="媒体密钥覆盖" error={fieldErrors.imgKey}>
                  <Input
                    id="manual-img-key"
                    type={showImgKey ? "text" : "password"}
                    autoComplete="off"
                    value={hasImgKey ? "" : draft.imgKey ?? ""}
                    onChange={(event) => update("imgKey", event.currentTarget.value)}
                    placeholder={hasImgKey ? "已读取；粘贴新密钥可覆盖" : "可选，通常由数据目录配置提供"}
                  />
                </Field>
                <Button type="button" variant="secondary" size="md" onClick={() => setShowImgKey((value) => !value)}>
                  {showImgKey ? "隐藏" : "显示"}
                </Button>
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
