import { useState } from "react";
import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import type { ServerConfigDraft } from "@l4/system";
import { Button, Field, Input, SegmentedControl, Select, Surface, Typography } from "@l4/ui";

type PlatformOption = "windows" | "darwin" | "linux";

export function ManualAdvancedConfigPanel() {
  const { saveManualConfig } = useSetupCommander();
  const loading = useSetupStore((state) => state.loading);
  const error = useSetupStore((state) => state.error);

  const [form, setForm] = useState<ServerConfigDraft>({
    dataDir: "",
    workDir: "",
    platform: "windows",
    version: 4,
    fullVersion: "",
    dataKey: "",
    imgKey: "",
    httpAddr: "127.0.0.1:5030",
    saveDecryptedMedia: true,
  });
  const [showKey, setShowKey] = useState(false);

  function update(field: keyof ServerConfigDraft, value: string | number | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    await saveManualConfig(form);
  }

  return (
    <Surface variant="base" className="settings-section">
      <div className="settings-stack">
        <div>
          <Typography variant="h2">高级手动配置</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            手动填写 chatlog_alpha 服务所需的全部配置字段。
          </Typography>
        </div>

        <div className="form-grid">
          <Field id="manual-data-dir" label="数据目录 *">
            <Input
              id="manual-data-dir"
              type="text"
              value={form.dataDir ?? ""}
              onChange={(event) => update("dataDir", event.currentTarget.value)}
              placeholder="E:\\WeChat Files\\wxid_xxx"
            />
          </Field>

          <Field id="manual-work-dir" label="工作目录">
            <Input
              id="manual-work-dir"
              type="text"
              value={form.workDir ?? ""}
              onChange={(event) => update("workDir", event.currentTarget.value)}
            />
          </Field>

          <div className="form-grid form-grid--two">
            <Field id="manual-platform" label="平台 *">
              <Select
                id="manual-platform"
                value={form.platform ?? "windows"}
                onChange={(event) => update("platform", event.currentTarget.value as PlatformOption)}
              >
                <option value="windows">Windows</option>
                <option value="darwin">macOS</option>
                <option value="linux">Linux</option>
              </Select>
            </Field>
            <Field id="manual-version" label="版本号 *">
              <Input
                id="manual-version"
                type="number"
                value={form.version ?? 4}
                onChange={(event) => update("version", Number(event.currentTarget.value))}
              />
            </Field>
          </div>

          <Field id="manual-full-version" label="完整版本号 *">
            <Input
              id="manual-full-version"
              type="text"
              value={form.fullVersion ?? ""}
              onChange={(event) => update("fullVersion", event.currentTarget.value)}
              placeholder="4.1.8.107"
            />
          </Field>

          <Field id="manual-data-key" label="Data Key *">
            <div className="settings-inline">
              <Input
                id="manual-data-key"
                type={showKey ? "text" : "password"}
                value={form.dataKey ?? ""}
                onChange={(event) => update("dataKey", event.currentTarget.value)}
                placeholder="64位十六进制密钥"
              />
              <Button variant="secondary" size="md" onClick={() => setShowKey((value) => !value)}>
                {showKey ? "隐藏" : "显示"}
              </Button>
            </div>
          </Field>

          <Field id="manual-img-key" label="Image Key">
            <Input
              id="manual-img-key"
              type="password"
              value={form.imgKey ?? ""}
              onChange={(event) => update("imgKey", event.currentTarget.value)}
            />
          </Field>

          <Field id="manual-http-addr" label="HTTP 地址">
            <Input
              id="manual-http-addr"
              type="text"
              value={form.httpAddr ?? "127.0.0.1:5030"}
              onChange={(event) => update("httpAddr", event.currentTarget.value)}
            />
          </Field>

          <Field id="manual-save-media" label="解密媒体缓存">
            <SegmentedControl
              label="解密媒体缓存"
              value={form.saveDecryptedMedia ? "on" : "off"}
              options={[
                { value: "on", label: "保存" },
                { value: "off", label: "不保存" },
              ]}
              onChange={(value) => update("saveDecryptedMedia", value === "on")}
            />
          </Field>
        </div>

        <div className="settings-actions">
          <Button variant="primary" onClick={handleSave} loading={loading}>
            保存并验证配置
          </Button>
        </div>

        {error && (
          <div className="settings-error" role="alert">
            {error}
          </div>
        )}
      </div>
    </Surface>
  );
}
