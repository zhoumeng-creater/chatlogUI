import type { UpdateStatus } from "@l2/api-docs/update";

export type UpdateNotificationTone = "info" | "success" | "danger";

export interface UpdateNotificationViewInput {
  status: UpdateStatus;
  version?: string;
  progress?: number;
  totalBytes?: number;
  downloadedBytes?: number;
  errorMessage?: string;
}

export interface UpdateNotificationViewModel {
  visible: boolean;
  title: string;
  titleId: string;
  dismissible: boolean;
  tone: UpdateNotificationTone;
  statusText: string;
  progressValue: number | null;
  progressLabel: string;
  settingsActionLabel: string | null;
}

export function deriveUpdateNotificationView(
  input: UpdateNotificationViewInput,
): UpdateNotificationViewModel {
  const base = {
    titleId: "update-notification-title",
    progressValue: null,
    progressLabel: "",
    settingsActionLabel: null,
  };

  switch (input.status) {
    case "available":
      return {
        ...base,
        visible: true,
        title: input.version ? `发现新版本 v${input.version}` : "发现新版本",
        dismissible: true,
        tone: "info",
        statusText: "可以现在下载，也可以稍后处理。",
      };
    case "downloading":
      return {
        ...base,
        visible: true,
        title: input.version ? `正在下载 v${input.version}` : "正在下载更新",
        dismissible: true,
        tone: "info",
        statusText: "下载进度",
        progressValue: clampProgress(input.progress ?? 0),
        progressLabel: formatProgressLabel(input.downloadedBytes ?? 0, input.totalBytes ?? 0),
      };
    case "ready":
      return {
        ...base,
        visible: true,
        title: "下载完成",
        dismissible: false,
        tone: "success",
        statusText: "更新已下载，可以安装并重启。",
      };
    case "error":
      return {
        ...base,
        visible: true,
        title: "更新失败",
        dismissible: true,
        tone: "danger",
        statusText: input.errorMessage || "更新过程中出现错误。",
        settingsActionLabel: "打开关于与更新",
      };
    case "idle":
    case "checking":
      return {
        ...base,
        visible: false,
        title: "",
        dismissible: false,
        tone: "info",
        statusText: "",
      };
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(100, Math.round(progress)));
}

function formatProgressLabel(downloadedBytes: number, totalBytes: number): string {
  if (totalBytes > 0) {
    return `${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)}`;
  }
  return `${formatBytes(downloadedBytes)} 已下载`;
}
