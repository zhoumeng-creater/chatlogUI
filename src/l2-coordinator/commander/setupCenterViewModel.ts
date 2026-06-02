import type { SetupStepId } from "@l2/data-clerk/types/setup";

export interface SetupCenterViewInput {
  currentStep: SetupStepId;
  dbReady: boolean;
}

export interface SetupCenterViewModel {
  dbStatusLabel: string;
  dbStatusTone: "success" | "warning";
  readyAnnouncement: string;
  workbenchButtonVariant: "primary" | "secondary";
  workbenchButtonLabel: string;
}

export function deriveSetupCenterView(input: SetupCenterViewInput): SetupCenterViewModel {
  return {
    dbStatusLabel: input.dbReady ? "数据库就绪" : "数据库未就绪",
    dbStatusTone: input.dbReady ? "success" : "warning",
    readyAnnouncement: input.currentStep === "ready"
      ? "所有组件就绪，可以进入工作台"
      : `当前步骤: ${input.currentStep}`,
    workbenchButtonVariant: input.dbReady ? "primary" : "secondary",
    workbenchButtonLabel: input.dbReady ? "打开工作台" : "稍后配置，打开空工作台",
  };
}
