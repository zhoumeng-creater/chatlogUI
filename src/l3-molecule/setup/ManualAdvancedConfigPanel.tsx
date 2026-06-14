import { useState } from "react";
import type { ServerConfigDraft } from "@l4/system";
import { Button, Field, Input, SegmentedControl, Select, Typography } from "@l4/ui";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";

type PlatformOption = "windows" | "darwin" | "linux";
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

  function update(field: keyof ServerConfigDraft, value: string | number | boolean | null) {
    onDraftChange({ ...draft, [field]: value });
  }

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
            适合迁移或排障时使用。普通首次启动建议返回推荐导入。
          </Typography>
        </div>

        <div className="form-grid">
          <div className="settings-inline">
            <Field id="manual-data-dir" label="数据目录 *" error={fieldErrors.dataDir}>
              <Input
                id="manual-data-dir"
                type="text"
                value={draft.dataDir ?? ""}
                onChange={(event) => update("dataDir", event.currentTarget.value)}
                placeholder="选择微信数据目录，完整路径不会在摘要中显示"
              />
            </Field>
            <Button type="button" variant="secondary" size="md" onClick={() => void onChooseDataDir()}>
              选择数据目录
            </Button>
          </div>

          <div className="settings-inline">
            <Field id="manual-work-dir" label="工作目录" error={fieldErrors.workDir}>
              <Input
                id="manual-work-dir"
                type="text"
                value={draft.workDir ?? ""}
                onChange={(event) => update("workDir", event.currentTarget.value)}
              />
            </Field>
            <Button type="button" variant="secondary" size="md" onClick={() => void onChooseWorkDir()}>
              选择工作目录
            </Button>
          </div>

          <div className="form-grid form-grid--two">
            <Field id="manual-platform" label="平台 *" error={fieldErrors.platform}>
              <Select
                id="manual-platform"
                value={draft.platform ?? "windows"}
                onChange={(event) => update("platform", event.currentTarget.value as PlatformOption)}
              >
                <option value="windows">Windows</option>
                <option value="darwin">macOS</option>
                <option value="linux">Linux</option>
              </Select>
            </Field>
            <Field id="manual-version" label="版本号 *" error={fieldErrors.version}>
              <Input
                id="manual-version"
                type="number"
                value={draft.version ?? 4}
                onChange={(event) => update("version", Number(event.currentTarget.value))}
              />
            </Field>
          </div>

          <Field id="manual-full-version" label="完整版本号 *" error={fieldErrors.fullVersion}>
            <Input
              id="manual-full-version"
              type="text"
              value={draft.fullVersion ?? ""}
              onChange={(event) => update("fullVersion", event.currentTarget.value)}
              placeholder="4.1.8.107"
            />
          </Field>

          <div className="settings-inline">
            <Field id="manual-data-key" label="数据密钥 *" error={fieldErrors.dataKey}>
              <Input
                id="manual-data-key"
                type={showKey ? "text" : "password"}
                autoComplete="off"
                value={draft.dataKey ?? ""}
                onChange={(event) => update("dataKey", event.currentTarget.value)}
                placeholder="64位十六进制密钥"
              />
            </Field>
            <Button type="button" variant="secondary" size="md" onClick={() => setShowKey((value) => !value)}>
              {showKey ? "隐藏" : "显示"}
            </Button>
          </div>

          <Field id="manual-img-key" label="媒体密钥" error={fieldErrors.imgKey}>
            <Input
              id="manual-img-key"
              type="password"
              autoComplete="off"
              value={draft.imgKey ?? ""}
              onChange={(event) => update("imgKey", event.currentTarget.value)}
            />
          </Field>

          <Field id="manual-http-addr" label="本机服务地址" error={fieldErrors.httpAddr}>
            <Input
              id="manual-http-addr"
              type="text"
              value={draft.httpAddr ?? "127.0.0.1:5030"}
              onChange={(event) => update("httpAddr", event.currentTarget.value)}
            />
          </Field>

          <Field id="manual-save-media" label="解密媒体缓存">
            <SegmentedControl
              label="解密媒体缓存"
              value={draft.saveDecryptedMedia ? "on" : "off"}
              options={[
                { value: "on", label: "保存" },
                { value: "off", label: "不保存" },
              ]}
              onChange={(value) => update("saveDecryptedMedia", value === "on")}
            />
          </Field>
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
