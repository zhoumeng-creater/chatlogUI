import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import type { GraphModuleView } from "./graphViewModel";
import type { WorkbenchLayout, WorkbenchMode } from "./workbenchLayout";
import type { CompactSemanticStatus } from "./semanticViewModel";

export type WorkbenchModule = "chat" | "stats" | "media" | "sns" | "developer" | "ai" | "graph" | "settings";
export type SinglePaneView = "list" | "detail";

export interface WorkbenchRailItemState {
  module: WorkbenchModule;
  label: string;
  active: boolean;
  badge?: string;
}

export type WorkbenchModuleBadges = Partial<Record<WorkbenchModule, string>>;
export type MediaModuleBadgeStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type SnsModuleBadgeStatus = "idle" | "loading" | "ready" | "empty" | "error";
export type DeveloperModuleBadgeStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface WorkbenchShellViewInput {
  profile: SetupProfileSummary | null;
  httpReady: boolean;
  dbReady: boolean;
  devSmokeReady?: boolean;
}

export interface WorkbenchShellViewModel {
  renderWorkbench: boolean;
  effectiveHttpReady: boolean;
  effectiveDbReady: boolean;
  statusText: string;
  statusTone: "neutral" | "warning";
  title: string;
  message: string;
  setupLinkLabel: string;
}

export interface WorkbenchConversationTitleInput {
  displayName?: string | null;
}

const RAIL_MODULES: { module: WorkbenchModule; label: string }[] = [
  { module: "chat", label: "会话" },
  { module: "stats", label: "统计" },
  { module: "media", label: "媒体" },
  { module: "sns", label: "朋友圈" },
  { module: "developer", label: "开发" },
  { module: "ai", label: "AI" },
  { module: "graph", label: "图谱" },
  { module: "settings", label: "设置" },
];

export function resolveSinglePaneView(
  mode: WorkbenchMode,
  selectedConversationId: string | null,
  requestedView: SinglePaneView,
): SinglePaneView {
  if (mode !== "single") return "detail";
  if (requestedView === "list") return "list";
  return selectedConversationId ? "detail" : "list";
}

export function shouldRenderConversationListAsMain(
  layout: WorkbenchLayout,
  selectedConversationId: string | null,
  requestedView: SinglePaneView,
): boolean {
  return resolveSinglePaneView(layout.mode, selectedConversationId, requestedView) === "list";
}

export function resolveWorkbenchLayoutForModule(
  layout: WorkbenchLayout,
  module: WorkbenchModule,
): WorkbenchLayout {
  return module === "graph"
    ? {
        ...layout,
        showConversationList: false,
        inspectorMode: "hidden",
        gridTemplateColumns: "minmax(0, 1fr)",
      }
    : layout;
}

export function buildWorkbenchRailItems(
  activeModule: WorkbenchModule,
  badges: WorkbenchModuleBadges = {},
): WorkbenchRailItemState[] {
  return RAIL_MODULES.map((item) => ({
    ...item,
    active: item.module === activeModule,
    badge: badges[item.module],
  }));
}

export function buildWorkbenchModuleBadges(input: {
  semanticStatus: CompactSemanticStatus | null;
  graphView: GraphModuleView;
  media?: {
    status: MediaModuleBadgeStatus;
    unreadTotal: number;
    attachmentCount: number;
  };
  sns?: {
    status: SnsModuleBadgeStatus;
    feedCount: number;
    notificationCount: number;
  };
  developer?: {
    status: DeveloperModuleBadgeStatus;
    dbFileCount: number;
    runnerHistoryCount: number;
  };
}): WorkbenchModuleBadges {
  return {
    media: input.media ? mediaBadge(input.media) : undefined,
    sns: input.sns ? snsBadge(input.sns) : undefined,
    developer: input.developer ? developerBadge(input.developer) : undefined,
    ai: input.semanticStatus ? semanticBadge(input.semanticStatus.label) : undefined,
    graph: graphBadge(input.graphView.kind),
  };
}

export function deriveWorkbenchShellView(input: WorkbenchShellViewInput): WorkbenchShellViewModel {
  const renderWorkbench = input.dbReady || input.devSmokeReady === true;
  const effectiveHttpReady = input.httpReady || input.devSmokeReady === true;
  const effectiveDbReady = input.dbReady || input.devSmokeReady === true;

  return {
    renderWorkbench,
    effectiveHttpReady,
    effectiveDbReady,
    statusText: effectiveHttpReady ? "服务运行中，数据库未就绪" : "服务未启动",
    statusTone: effectiveHttpReady ? "warning" : "neutral",
    title: input.profile ? "服务尚未完全就绪" : "尚未配置",
    message: !input.profile
      ? "请先完成设置中心的基本配置后再进入工作台。"
      : !effectiveHttpReady
        ? "chatlog_alpha 服务尚未启动，请在设置中心启动服务。"
        : "服务已启动但数据库尚未就绪，请稍候。",
    setupLinkLabel: "前往设置中心",
  };
}

export function formatWorkbenchConversationTitle(
  conversation: WorkbenchConversationTitleInput | null | undefined,
  privacyOn: boolean,
): string {
  if (!conversation) return "选择会话";
  if (privacyOn) return "已隐藏会话";

  const displayName = conversation.displayName?.trim();
  return displayName || "未命名会话";
}

export function getInspectorTitle(module: WorkbenchModule): string {
  switch (module) {
    case "ai":
      return "AI 分析";
    case "graph":
      return "知识图谱";
    case "settings":
      return "设置";
    case "media":
      return "媒体与扩展";
    case "sns":
      return "朋友圈";
    case "developer":
      return "开发者工具";
    case "chat":
    case "stats":
      return "统计数据";
  }
}

export function isInspectorModule(module: WorkbenchModule): boolean {
  return module === "stats" || module === "media" || module === "sns" || module === "developer" || module === "ai";
}

function semanticBadge(label: string): string {
  if (label.includes("streaming")) return "生成中";
  if (label.includes("not configured")) return "未配置";
  if (label.includes("paused")) return "暂停";
  if (label.includes("failed")) return "异常";
  if (label.includes("ready")) return "就绪";
  if (label.includes("Indexing")) return "索引中";
  return "待就绪";
}

function graphBadge(kind: GraphModuleView["kind"]): string {
  const labels: Record<GraphModuleView["kind"], string> = {
    idle: "待加载",
    loading: "加载中",
    empty: "无数据",
    loaded: "已加载",
    error: "异常",
    malformed: "异常",
    oversized: "过大",
    cancelled: "已停止",
    unavailable: "不可用",
    failed: "异常",
  };
  return labels[kind];
}

function mediaBadge(input: {
  status: MediaModuleBadgeStatus;
  unreadTotal: number;
  attachmentCount: number;
}): string | undefined {
  if (input.status === "loading") return "加载中";
  if (input.status === "error") return "异常";
  if (input.unreadTotal > 0) return `${Math.min(input.unreadTotal, 99)}未读`;
  if (input.attachmentCount > 0) return `${Math.min(input.attachmentCount, 99)}项`;
  if (input.status === "empty") return "无数据";
  return undefined;
}

function snsBadge(input: {
  status: SnsModuleBadgeStatus;
  feedCount: number;
  notificationCount: number;
}): string | undefined {
  if (input.status === "loading") return "加载中";
  if (input.status === "error") return "异常";
  if (input.notificationCount > 0) return `${Math.min(input.notificationCount, 99)}通知`;
  if (input.feedCount > 0) return `${Math.min(input.feedCount, 99)}条`;
  if (input.status === "empty") return "无数据";
  return undefined;
}

function developerBadge(input: {
  status: DeveloperModuleBadgeStatus;
  dbFileCount: number;
  runnerHistoryCount: number;
}): string | undefined {
  if (input.status === "loading") return "加载中";
  if (input.status === "error") return "异常";
  if (input.dbFileCount > 0) return `${Math.min(input.dbFileCount, 99)}库`;
  if (input.runnerHistoryCount > 0) return "API";
  if (input.status === "empty") return "无数据";
  return undefined;
}
