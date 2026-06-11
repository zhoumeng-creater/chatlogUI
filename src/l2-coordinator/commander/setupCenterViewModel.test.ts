import { describe, expect, it } from "vitest";
import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { deriveSetupCenterView } from "./setupCenterViewModel";

describe("deriveSetupCenterView", () => {
  it("keeps setup readiness labels and actions in L2 instead of L1 store reads", () => {
    const blocked = deriveSetupCenterView({ currentStep: "config", dbReady: false });
    expect(blocked).toMatchObject({
      dbStatusLabel: "数据库未就绪",
      dbStatusTone: "warning",
      readyAnnouncement: "当前步骤: config",
      workbenchButtonVariant: "secondary",
      workbenchButtonLabel: "刷新数据库状态",
    });
    expect(blocked.workbenchButtonLabel).not.toContain("打开空工作台");
    expect((blocked as { canOpenWorkbench?: boolean }).canOpenWorkbench).toBe(false);
    expect((blocked as { showWorkbenchAction?: boolean }).showWorkbenchAction).toBe(false);

    const ready = deriveSetupCenterView({ currentStep: "ready", dbReady: true });
    expect(ready).toMatchObject({
      dbStatusLabel: "数据库就绪",
      dbStatusTone: "success",
      readyAnnouncement: "所有组件就绪，可以进入工作台",
      workbenchButtonVariant: "primary",
      workbenchButtonLabel: "打开工作台",
    });
    expect((ready as { canOpenWorkbench?: boolean }).canOpenWorkbench).toBe(true);
    expect((ready as { showWorkbenchAction?: boolean }).showWorkbenchAction).toBe(false);
  });

  it("derives the first-launch recommended path, summary, and single primary action", () => {
    const view = deriveSetupCenterView({
      currentStep: "config",
      mode: "managed",
      profile: null,
      portState: "unknown",
      httpReady: false,
      dbReady: false,
      loading: false,
      error: null,
      externalBaseUrlDraft: "http://127.0.0.1:5030",
      externalBaseUrlError: null,
    });

    expect(view.activePath).toBe("recommended-import");
    expect(view.pathOptions.map((option: { id: string }) => option.id)).toEqual([
      "recommended-import",
      "external-service",
      "manual-advanced",
    ]);
    expect(view.primaryAction).toMatchObject({
      id: "choose-data-directory",
      label: "选择微信数据目录",
      variant: "primary",
      disabled: false,
    });
    expect(view.readinessSummary.map((item: { id: string }) => item.id)).toEqual([
      "config",
      "service",
      "database",
      "privacy",
    ]);
    expect(view.diagnostics).toMatchObject({ defaultOpen: false });
    expect(view.showWorkbenchAction).toBe(false);
    expect(view.activePanel).toBe("recommended-import");
  });

  it("keeps external service and DB readiness separate before showing Workbench", () => {
    const view = deriveSetupCenterView({
      currentStep: "database",
      mode: "external",
      profile: profileSummary({
        mode: "external",
        source: "external-service",
        httpAddr: "http://127.0.0.1:6041",
        port: 6041,
      }),
      portState: "external-chatlog",
      httpReady: true,
      dbReady: false,
      loading: false,
      error: "服务已连接，但数据库尚未就绪",
      externalBaseUrlDraft: "http://127.0.0.1:6041",
      externalBaseUrlError: null,
    });

    expect(view.activePath).toBe("external-service");
    expect(view.primaryAction).toMatchObject({
      id: "refresh-database",
      label: "刷新数据库状态",
      variant: "primary",
      disabled: false,
    });
    expect(JSON.stringify(view)).not.toContain("打开空工作台");
    expect(view.primaryAction.id).not.toBe("open-workbench");
    expect(view.activePanel).toBe("service-control");
    expect(view.readinessSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "service", status: "success" }),
        expect.objectContaining({
          id: "database",
          status: "empty",
          message: expect.stringContaining("数据库尚未就绪"),
        }),
      ]),
    );
  });

  it("disables the external connection primary action when the URL has a field error", () => {
    const view = deriveSetupCenterView({
      currentStep: "service",
      mode: "external",
      activePath: "external-service",
      profile: null,
      portState: "unknown",
      httpReady: false,
      dbReady: false,
      loading: false,
      error: null,
      externalBaseUrlDraft: "http://example.com:5030",
      externalBaseUrlError: "当前版本只支持本机 chatlog 服务地址",
    });

    expect(view.primaryAction).toMatchObject({
      id: "connect-external-service",
      disabled: true,
    });
  });

  it("selects the manual advanced path from saved manual profiles", () => {
    const view = deriveSetupCenterView({
      currentStep: "service",
      mode: "managed",
      profile: profileSummary({
        source: "manual-advanced",
        mode: "managed",
        dataDir: "C:\\Users\\Synthetic\\Documents\\WeChat Files\\wxid_synthetic_private",
        workDir: "C:\\Users\\Synthetic\\AppData\\chatlog",
        hasDataKey: true,
      }),
      portState: "free",
      httpReady: false,
      dbReady: false,
      loading: false,
      error: null,
      externalBaseUrlDraft: "http://127.0.0.1:5030",
      externalBaseUrlError: null,
    });

    expect(view.activePath).toBe("manual-advanced");
    expect(view.pathOptions.find((option: { id: string }) => option.id === "manual-advanced")).toMatchObject({
      selected: true,
    });
    expect(JSON.stringify(view)).not.toContain("C:\\Users\\Synthetic");
    expect(JSON.stringify(view)).not.toContain("wxid_synthetic_private");
  });

  it("shows exactly one primary workbench action only after DB readiness", () => {
    const view = deriveSetupCenterView({
      currentStep: "ready",
      mode: "managed",
      profile: profileSummary({
        source: "data-dir-chatlog-json",
        mode: "managed",
        hasDataKey: true,
      }),
      portState: "owned",
      httpReady: true,
      dbReady: true,
      loading: false,
      error: null,
      externalBaseUrlDraft: "http://127.0.0.1:5030",
      externalBaseUrlError: null,
    });

    const primaryActions = [view.primaryAction, ...(view.secondaryActions ?? [])]
      .filter((action) => action.variant === "primary");

    expect(view.primaryAction).toMatchObject({
      id: "open-workbench",
      label: "打开工作台",
      variant: "primary",
      disabled: false,
    });
    expect(primaryActions).toHaveLength(1);
    expect(view.showWorkbenchAction).toBe(false);
    expect(view.activePanel).toBe("ready");
  });

  it("maps loading and error readiness states into the summary model", () => {
    const loadingView = deriveSetupCenterView({
      currentStep: "service",
      mode: "managed",
      activePath: "recommended-import",
      profile: profileSummary({ source: "data-dir-chatlog-json" }),
      portState: "free",
      httpReady: false,
      dbReady: false,
      loading: true,
      error: null,
    });

    expect(loadingView.readinessSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "service", status: "loading" }),
      ]),
    );

    const errorView = deriveSetupCenterView({
      currentStep: "service",
      mode: "external",
      activePath: "external-service",
      profile: null,
      portState: "unknown",
      httpReady: false,
      dbReady: false,
      loading: false,
      error: "无法连接到本机 chatlog 服务，请检查服务地址或服务进程后重试。",
      externalBaseUrlDraft: "http://127.0.0.1:6041",
      externalBaseUrlError: null,
    });

    expect(errorView.readinessSummary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "service",
          status: "error",
          message: expect.stringContaining("请检查服务地址"),
        }),
      ]),
    );
  });
});

function profileSummary(overrides: Partial<SetupProfileSummary> = {}): SetupProfileSummary {
  return {
    mode: "managed",
    source: "data-dir-chatlog-json",
    configDir: null,
    dataDir: null,
    workDir: null,
    httpAddr: "http://127.0.0.1:5030",
    port: 5030,
    platform: "windows",
    version: 4,
    fullVersion: "4.1.8.107",
    hasDataKey: false,
    hasImgKey: false,
    lastValidatedAt: null,
    ...overrides,
  };
}
