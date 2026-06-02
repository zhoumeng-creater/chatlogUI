import { describe, expect, it } from "vitest";
import { deriveSetupCenterView } from "./setupCenterViewModel";

describe("deriveSetupCenterView", () => {
  it("keeps setup readiness labels and actions in L2 instead of L1 store reads", () => {
    expect(deriveSetupCenterView({ currentStep: "config", dbReady: false })).toEqual({
      dbStatusLabel: "数据库未就绪",
      dbStatusTone: "warning",
      readyAnnouncement: "当前步骤: config",
      workbenchButtonVariant: "secondary",
      workbenchButtonLabel: "稍后配置，打开空工作台",
    });

    expect(deriveSetupCenterView({ currentStep: "ready", dbReady: true })).toEqual({
      dbStatusLabel: "数据库就绪",
      dbStatusTone: "success",
      readyAnnouncement: "所有组件就绪，可以进入工作台",
      workbenchButtonVariant: "primary",
      workbenchButtonLabel: "打开工作台",
    });
  });
});
