import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import type { SetupDetectedPathCandidateView } from "@l2/commander/setupDetectedPathModel";
import type { SetupDetectedPathStatus } from "@l2/data-clerk/types/setup";
import type { EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import { Button, Surface, Typography } from "@l4/ui";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";

interface ConfigImportPanelProps {
  loading: boolean;
  error: string | null;
  profile: SetupProfileSummary | null;
  detectionStatus: SetupDetectedPathStatus;
  candidates: SetupDetectedPathCandidateView[];
  detectionError: string | null;
  onUseCandidate: (candidateId: string) => void;
  onChooseDirectory: () => void;
  onConnectExternalService: () => void;
  onOpenManualAdvanced: () => void;
}

export function ConfigImportPanel({
  loading,
  error,
  profile,
  detectionStatus,
  candidates,
  detectionError,
  onUseCandidate,
  onChooseDirectory,
  onConnectExternalService,
  onOpenManualAdvanced,
}: ConfigImportPanelProps) {
  const handleEmptyAction = (actionId: EmptyStateActionId) => {
    if (actionId === "configure-service") {
      onChooseDirectory();
      return;
    }
    if (actionId === "check-service") {
      onConnectExternalService();
      return;
    }
    if (actionId === "open-settings") {
      onOpenManualAdvanced();
    }
  };

  return (
    <div className="setup-panel-stack">
      <Typography variant="h2">导入本机配置</Typography>
      <Typography variant="body" color="var(--text-secondary)">
        优先使用自动探测到的微信数据目录；也可以手动选择目录、连接已有服务或进入高级配置。
      </Typography>
      {detectionStatus === "loading" && (
        <Typography variant="caption" color="var(--text-secondary)">
          正在查找默认微信数据目录...
        </Typography>
      )}
      {detectionStatus === "success" && candidates.length > 0 && (
        <Surface variant="subtle" className="setup-result-card">
          <Typography variant="label" weight={700}>找到可能的数据目录</Typography>
          <div className="settings-stack">
            {candidates.map((candidate) => (
              <div className="settings-inline" key={candidate.id}>
                <div>
                  <Typography variant="body" weight={700}>{candidate.title}</Typography>
                  <Typography variant="caption" color="var(--text-secondary)">
                    {candidate.description}
                  </Typography>
                  <Typography variant="caption" color="var(--text-secondary)">
                    {candidate.confidenceLabel}
                  </Typography>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={candidate.disabled || loading}
                  onClick={() => onUseCandidate(candidate.id)}
                >
                  使用此目录
                </Button>
              </div>
            ))}
          </div>
        </Surface>
      )}
      {detectionStatus === "empty" && !profile && (
        <ActionableEmptyState
          className="setup-result-card"
          model={{
            id: "service-not-configured",
            title: "未找到可用的默认目录",
            reason: "微信数据可能保存在自定义位置。",
            description: "请选择其他目录、连接已经运行的本机服务，或进入高级配置手动填写结构化参数。",
            actions: [
              {
                id: "configure-service",
                label: "选择其他目录",
                variant: "secondary",
                disabled: loading,
                disabledReason: loading ? "正在读取本机配置摘要..." : null,
              },
              {
                id: "check-service",
                label: "连接已有服务",
                variant: "secondary",
                disabled: loading,
                disabledReason: loading ? "正在读取本机配置摘要..." : null,
              },
              {
                id: "open-settings",
                label: "高级配置",
                variant: "ghost",
                disabled: loading,
                disabledReason: loading ? "正在读取本机配置摘要..." : null,
              },
            ],
          }}
          onAction={handleEmptyAction}
        />
      )}
      {detectionStatus === "error" && detectionError && (
        <Surface variant="subtle" className="setup-result-card setup-result-card--error" role="alert">
          {formatSafeUserFacingError(detectionError)}
        </Surface>
      )}
      {!profile && detectionStatus !== "empty" && (
        <div className="setup-flow__secondary-actions">
          <Button type="button" variant="secondary" disabled={loading} onClick={onChooseDirectory}>
            选择其他目录
          </Button>
          <Button type="button" variant="secondary" disabled={loading} onClick={onConnectExternalService}>
            连接已有服务
          </Button>
          <Button type="button" variant="ghost" disabled={loading} onClick={onOpenManualAdvanced}>
            高级配置
          </Button>
        </div>
      )}
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
