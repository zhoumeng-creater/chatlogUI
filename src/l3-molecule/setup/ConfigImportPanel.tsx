import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { Surface, Typography } from "@l4/ui";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";

interface ConfigImportPanelProps {
  loading: boolean;
  error: string | null;
  profile: SetupProfileSummary | null;
}

export function ConfigImportPanel({
  loading,
  error,
  profile,
}: ConfigImportPanelProps) {
  return (
    <div className="setup-panel-stack">
      <Typography variant="h2">导入配置</Typography>
      <Typography variant="body" color="var(--text-secondary)">
        选择包含 chatlog.json 的微信数据目录，应用将自动读取配置信息。
      </Typography>
      {loading && (
        <Typography variant="caption" color="var(--text-secondary)">
          正在读取本机配置摘要...
        </Typography>
      )}
      {profile && (
        <Surface variant="subtle" className="setup-result-card setup-result-card--success">
          <Typography variant="label" weight={700}>配置已导入</Typography>
          <Typography variant="caption" color="var(--success)">
            平台: {profile.platform ?? "-"} | 版本: {profile.fullVersion ?? "-"}
          </Typography>
          <Typography variant="caption" color="var(--success)">
            密钥: {profile.hasDataKey ? "已获取" : "未获取"}
          </Typography>
        </Surface>
      )}
      {error && (
        <Surface variant="subtle" className="setup-result-card setup-result-card--error" role="alert">
          {formatSafeUserFacingError(error)}
        </Surface>
      )}
    </div>
  );
}
