import type {
  PortState,
  SetupDetectedPathCandidate,
  SetupDetectedPathStatus,
  SetupMode,
  SetupPathId,
  SetupProfileSummary,
  SetupStepId,
} from "@l2/data-clerk/types/setup";
import {
  buildDetectedPathCandidateViews,
  type SetupDetectedPathCandidateView,
} from "./setupDetectedPathModel";

export type SetupReadinessStatus =
  | "idle"
  | "loading"
  | "empty"
  | "success"
  | "error"
  | "conflict"
  | "cancelled";

export type SetupPrimaryActionId =
  | "choose-data-directory"
  | "save-manual-config"
  | "start-managed-service"
  | "connect-external-service"
  | "refresh-database"
  | "open-workbench";

export type SetupActionId =
  | SetupPrimaryActionId
  | "inspect-service-port"
  | "stop-managed-service";

export type SetupActivePanel =
  | "recommended-import"
  | "manual-advanced"
  | "service-control"
  | "ready";

export interface SetupCenterViewInput {
  currentStep: SetupStepId;
  mode?: SetupMode;
  activePath?: SetupPathId;
  profile?: SetupProfileSummary | null;
  portState?: PortState;
  httpReady?: boolean;
  dbReady: boolean;
  loading?: boolean;
  error?: string | null;
  externalBaseUrlDraft?: string;
  externalBaseUrlError?: string | null;
  detectedPathCandidates?: SetupDetectedPathCandidate[];
  detectedPathStatus?: SetupDetectedPathStatus;
  detectedPathError?: string | null;
}

export interface SetupPathOption {
  id: SetupPathId;
  label: string;
  description: string;
  selected: boolean;
}

export interface SetupCenterActionView {
  id: SetupActionId;
  label: string;
  variant: "primary" | "secondary" | "danger";
  disabled: boolean;
  busy?: boolean;
  helperText?: string;
}

export interface SetupReadinessSummaryItem {
  id: "config" | "service" | "database" | "privacy";
  status: SetupReadinessStatus;
  title: string;
  message: string;
}

export interface SetupDiagnosticsView {
  defaultOpen: false;
  label: string;
}

export interface SetupCenterViewModel {
  heading: string;
  description: string;
  activePath: SetupPathId;
  activePanel: SetupActivePanel;
  pathOptions: SetupPathOption[];
  primaryAction: SetupCenterActionView;
  secondaryActions: SetupCenterActionView[];
  readinessSummary: SetupReadinessSummaryItem[];
  detectedPath: {
    status: SetupDetectedPathStatus;
    candidates: SetupDetectedPathCandidateView[];
    error: string | null;
  };
  diagnostics: SetupDiagnosticsView;
  dbStatusLabel: string;
  dbStatusTone: "success" | "warning";
  readyAnnouncement: string;
  workbenchButtonVariant: "primary" | "secondary";
  workbenchButtonLabel: string;
  canOpenWorkbench: boolean;
  showWorkbenchAction: boolean;
}

export function deriveSetupCenterView(input: SetupCenterViewInput): SetupCenterViewModel {
  const mode = input.mode ?? input.profile?.mode ?? "managed";
  const profile = input.profile ?? null;
  const httpReady = Boolean(input.httpReady);
  const dbReady = Boolean(input.dbReady);
  const loading = Boolean(input.loading);
  const activePath = deriveActivePath(input.activePath, mode, profile);
  const activePanel = deriveActivePanel({
    currentStep: input.currentStep,
    activePath,
    profile,
    dbReady,
    httpReady,
  });
  const primaryAction = derivePrimaryAction({
    activePanel,
    activePath,
    mode,
    profile,
    httpReady,
    dbReady,
    loading,
    externalBaseUrlDraft: input.externalBaseUrlDraft,
    externalBaseUrlError: input.externalBaseUrlError,
  });

  return {
    heading: "连接本地聊天数据服务",
    description: "选择由应用管理本机聊天服务，或连接已有本机服务；数据库检查通过后进入工作台。",
    activePath,
    activePanel,
    pathOptions: buildPathOptions(activePath),
    primaryAction,
    secondaryActions: deriveSecondaryActions({
      activePath,
      mode,
      profile,
      httpReady,
      dbReady,
      loading,
      primaryActionId: primaryAction.id,
    }),
    readinessSummary: deriveReadinessSummary({
      activePath,
      mode,
      profile,
      portState: input.portState ?? "unknown",
      httpReady,
      dbReady,
      loading,
      error: input.error ?? input.externalBaseUrlError ?? null,
    }),
    detectedPath: {
      status: input.detectedPathStatus ?? "idle",
      candidates: buildDetectedPathCandidateViews(input.detectedPathCandidates ?? []),
      error: input.detectedPathError ?? null,
    },
    diagnostics: {
      defaultOpen: false,
      label: "查看脱敏诊断",
    },
    dbStatusLabel: dbReady ? "数据库就绪" : "数据库未就绪",
    dbStatusTone: dbReady ? "success" : "warning",
    readyAnnouncement: input.currentStep === "ready"
      ? "所有组件就绪，可以进入工作台"
      : `当前步骤: ${input.currentStep}`,
    workbenchButtonVariant: dbReady ? "primary" : "secondary",
    workbenchButtonLabel: dbReady ? "打开工作台" : "刷新数据库状态",
    canOpenWorkbench: dbReady,
    showWorkbenchAction: false,
  };
}

function deriveActivePanel(input: {
  currentStep: SetupStepId;
  activePath: SetupPathId;
  profile: SetupProfileSummary | null;
  dbReady: boolean;
  httpReady: boolean;
}): SetupActivePanel {
  if (input.dbReady || input.currentStep === "ready") return "ready";
  if (
    input.activePath === "external-service" ||
    (Boolean(input.profile) && (input.currentStep === "service" || input.currentStep === "database" || input.httpReady))
  ) {
    return "service-control";
  }
  if (input.activePath === "manual-advanced") return "manual-advanced";
  return "recommended-import";
}

function deriveActivePath(
  selectedPath: SetupPathId | undefined,
  mode: SetupMode,
  profile: SetupProfileSummary | null,
): SetupPathId {
  if (profile?.mode === "external" || profile?.source === "external-service" || mode === "external") {
    return "external-service";
  }

  if (profile?.source === "manual-advanced") {
    return "manual-advanced";
  }

  return selectedPath ?? "recommended-import";
}

function buildPathOptions(activePath: SetupPathId): SetupPathOption[] {
  return [
    {
      id: "recommended-import",
      label: "推荐自动导入",
      description: "优先使用自动探测到的微信数据目录，或手动选择目录。",
      selected: activePath === "recommended-import",
    },
    {
      id: "external-service",
      label: "连接已有服务",
      description: "连接已经运行的本机聊天服务。",
      selected: activePath === "external-service",
    },
    {
      id: "manual-advanced",
      label: "专家手动配置",
      description: "排障或迁移时手动填写高级配置。",
      selected: activePath === "manual-advanced",
    },
  ];
}

function derivePrimaryAction(input: {
  activePanel: SetupActivePanel;
  activePath: SetupPathId;
  mode: SetupMode;
  profile: SetupProfileSummary | null;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  externalBaseUrlDraft?: string;
  externalBaseUrlError?: string | null;
}): SetupCenterActionView {
  if (input.dbReady) {
    return {
      id: "open-workbench",
      label: "打开工作台",
      variant: "primary",
      disabled: input.loading,
      busy: input.loading,
    };
  }

  if (input.httpReady) {
    return {
      id: "refresh-database",
      label: "刷新数据库状态",
      variant: "primary",
      disabled: input.loading,
      busy: input.loading,
      helperText: "服务已连接，数据库尚未就绪。",
    };
  }

  if (input.activePath === "external-service") {
    const hasExternalUrl = Boolean(input.externalBaseUrlDraft?.trim());
    return {
      id: "connect-external-service",
      label: "测试连接并保存",
      variant: "primary",
      disabled: input.loading || !hasExternalUrl || Boolean(input.externalBaseUrlError),
      busy: input.loading,
    };
  }

  if (input.activePanel === "manual-advanced") {
    return {
      id: "save-manual-config",
      label: "保存并验证配置",
      variant: "primary",
      disabled: input.loading,
      busy: input.loading,
    };
  }

  if (input.profile) {
    return {
      id: "start-managed-service",
      label: "启动本机服务",
      variant: "primary",
      disabled: input.loading,
      busy: input.loading,
    };
  }

  if (input.activePath === "manual-advanced") {
    return {
      id: "save-manual-config",
      label: "保存并验证配置",
      variant: "primary",
      disabled: input.loading,
      busy: input.loading,
    };
  }

  return {
    id: "choose-data-directory",
    label: "选择微信数据目录",
    variant: "primary",
    disabled: input.loading,
    busy: input.loading,
  };
}

function deriveSecondaryActions(input: {
  activePath: SetupPathId;
  mode: SetupMode;
  profile: SetupProfileSummary | null;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  primaryActionId: SetupActionId;
}): SetupCenterActionView[] {
  const actions: SetupCenterActionView[] = [];

  if (input.profile && input.activePath !== "external-service") {
    actions.push({
      id: "choose-data-directory",
      label: "重新选择数据目录",
      variant: "secondary",
      disabled: input.loading,
    });
  }

  if (
    input.primaryActionId !== "refresh-database" &&
    (input.profile || input.activePath === "external-service") &&
    !input.dbReady
  ) {
    actions.push({
      id: "refresh-database",
      label: "刷新状态",
      variant: "secondary",
      disabled: input.loading,
    });
  }

  if (!input.dbReady && input.activePath !== "external-service") {
    actions.push({
      id: "inspect-service-port",
      label: "检查端口",
      variant: "secondary",
      disabled: input.loading,
    });
  }

  if (input.mode === "managed" && input.httpReady) {
    actions.push({
      id: "stop-managed-service",
      label: "停止服务",
      variant: "danger",
      disabled: input.loading,
      helperText: "停止后需要重新启动服务才能进入工作台。",
    });
  }

  return actions;
}

function deriveReadinessSummary(input: {
  activePath: SetupPathId;
  mode: SetupMode;
  profile: SetupProfileSummary | null;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  error: string | null;
}): SetupReadinessSummaryItem[] {
  return [
    {
      id: "config",
      status: input.profile ? "success" : "empty",
      title: input.profile ? "配置已保存" : configEmptyTitle(input.activePath),
      message: input.profile
        ? "本地配置摘要已保存，敏感字段已隐藏。"
        : configEmptyMessage(input.activePath),
    },
    {
      id: "service",
      status: serviceStatus(input),
      title: input.httpReady ? "HTTP 服务健康" : input.loading ? "正在检查服务" : serviceTitle(input.portState),
      message: input.httpReady
        ? "本机聊天服务可以连接。"
        : input.error
          ? input.error
          : input.loading
            ? "正在连接或启动本机聊天服务。"
        : serviceMessage(input),
    },
    {
      id: "database",
      status: databaseStatus(input),
      title: input.dbReady ? "数据库就绪" : input.httpReady && input.loading ? "正在检查数据库" : "数据库尚未就绪",
      message: input.dbReady
        ? "聊天数据库可读取，可以进入工作台。"
        : input.httpReady && input.error
          ? input.error
          : input.httpReady && input.loading
            ? "正在确认数据库是否可查询。"
        : input.httpReady
          ? "服务已连接，数据库尚未就绪。刷新数据库状态后再进入工作台。"
          : "需要先启动或连接本机服务，再检查数据库。",
    },
    {
      id: "privacy",
      status: input.profile ? "success" : "idle",
      title: input.profile ? "隐私保护已应用" : "隐私保护待验证",
      message: input.profile
        ? "界面和诊断只显示脱敏摘要，不显示路径、密钥或私聊内容。"
        : "导入配置后会用脱敏摘要显示目录、密钥状态和诊断信息。",
    },
  ];
}

function configEmptyTitle(activePath: SetupPathId): string {
  if (activePath === "external-service") return "等待连接服务";
  if (activePath === "manual-advanced") return "等待手动配置";
  return "等待选择数据目录";
}

function configEmptyMessage(activePath: SetupPathId): string {
  if (activePath === "external-service") {
    return "输入本机服务地址并测试连接后会保存外部服务配置。";
  }
  if (activePath === "manual-advanced") {
    return "填写必填字段并通过验证后会保存本机服务配置。";
  }
  return "选择微信数据目录后，应用会读取本机配置摘要。";
}

function serviceStatus(input: {
  portState: PortState;
  httpReady: boolean;
  loading: boolean;
  error: string | null;
}): SetupReadinessStatus {
  if (input.httpReady) return "success";
  if (input.loading) return "loading";
  if (input.error) return "error";
  if (input.portState === "occupied") return "conflict";
  return "idle";
}

function databaseStatus(input: {
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  error: string | null;
}): SetupReadinessStatus {
  if (input.dbReady) return "success";
  if (!input.httpReady) return "idle";
  if (input.loading) return "loading";
  if (input.error?.includes("数据库尚未就绪")) return "empty";
  if (input.error) return "error";
  return "empty";
}

function serviceTitle(portState: PortState): string {
  if (portState === "occupied") return "端口被占用";
  if (portState === "free") return "服务未启动";
  return "HTTP 未就绪";
}

function serviceMessage(input: {
  activePath: SetupPathId;
  mode: SetupMode;
  portState: PortState;
}): string {
  if (input.portState === "occupied") {
    return "目标端口被其他进程占用，请处理后再启动或连接服务。";
  }
  if (input.activePath === "external-service" || input.mode === "external") {
    return "测试连接已有本机服务后会继续检查数据库。";
  }
  return "保存配置后启动本机服务，应用会继续检查数据库。";
}
