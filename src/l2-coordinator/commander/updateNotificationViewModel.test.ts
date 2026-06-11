import { describe, expect, it } from "vitest";
import { deriveUpdateNotificationView } from "./updateNotificationViewModel";

describe("updateNotificationViewModel", () => {
  it("hides idle and checking updater states", () => {
    expect(deriveUpdateNotificationView({ status: "idle" }).visible).toBe(false);
    expect(deriveUpdateNotificationView({ status: "checking" }).visible).toBe(false);
  });

  it("describes available updates as a dismissible dialog", () => {
    expect(deriveUpdateNotificationView({
      status: "available",
      version: "1.2.3",
    })).toMatchObject({
      visible: true,
      title: "发现新版本 v1.2.3",
      dismissible: true,
      tone: "info",
      titleId: "update-notification-title",
    });
  });

  it("exposes bounded progressbar values while downloading", () => {
    expect(deriveUpdateNotificationView({
      status: "downloading",
      version: "1.2.3",
      progress: 145,
      downloadedBytes: 512,
      totalBytes: 1024,
    })).toMatchObject({
      visible: true,
      title: "正在下载 v1.2.3",
      dismissible: true,
      tone: "info",
      progressValue: 100,
      progressLabel: "512 B / 1.0 KB",
    });
  });

  it("keeps ready state non-dismissible by Escape because install is the only safe completion action", () => {
    expect(deriveUpdateNotificationView({ status: "ready" })).toMatchObject({
      visible: true,
      title: "下载完成",
      dismissible: false,
      tone: "success",
    });
  });

  it("surfaces update errors without relying on color alone", () => {
    expect(deriveUpdateNotificationView({
      status: "error",
      errorMessage: "signature mismatch",
    })).toMatchObject({
      visible: true,
      title: "更新失败",
      dismissible: true,
      tone: "danger",
      statusText: "signature mismatch",
      settingsActionLabel: "打开关于与更新",
    });
  });
});
