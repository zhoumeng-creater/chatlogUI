import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { WorkspaceRouteScopeView } from "./workspaceRouteScope";

export type WorkspaceScopeModuleId = "search" | "analytics" | "sns" | "media" | "ai" | "graph";
export type WorkspaceScopeKind = "currentConversation" | "allConversations" | "selectedContacts" | "selectedGroups";
export type WorkspaceScopeSensitivity = "structural" | "sensitive";
export type WorkspaceScopeCapabilityStatus = "supported" | "readonly" | "disabled" | "local-only" | "backend-applied";
export type WorkspaceScopeField =
  | "scopeKind"
  | "sourceRoute"
  | "focusMessage"
  | "dateRange"
  | "messageType"
  | "mediaType"
  | "selectedContacts"
  | "selectedGroups"
  | "snsContentType"
  | "snsMediaOnly"
  | "snsReadState";

export type WorkspaceScopeMediaType = "all" | "image" | "video" | "voice" | "file";

export interface WorkspaceScopeSelection {
  id: string;
  label: string;
}

export interface WorkspaceScopeDateRange {
  preset?: "7d" | "30d" | "90d" | "custom";
  start?: string;
  end?: string;
}

export interface WorkspaceScopeState {
  kind: WorkspaceScopeKind;
  selectedContacts?: WorkspaceScopeSelection[];
  selectedGroups?: WorkspaceScopeSelection[];
  sourceRoute?: string | null;
  focusMessage?: string | null;
  dateRange?: WorkspaceScopeDateRange | null;
  messageType?: SearchFilterType;
  mediaType?: WorkspaceScopeMediaType;
  snsContentType?: string;
  snsMediaOnly?: boolean;
  snsIncludeRead?: boolean;
}

export interface WorkspaceScopeCapability {
  field: WorkspaceScopeField;
  status: WorkspaceScopeCapabilityStatus;
  reason?: string;
}

export interface WorkspaceScopeClearAction {
  type: "clearField" | "setScope";
  field?: WorkspaceScopeField;
  scopeKind?: WorkspaceScopeKind;
}

export interface WorkspaceScopeChip {
  id: string;
  label: string;
  value: string;
  field: WorkspaceScopeField;
  sensitivity: WorkspaceScopeSensitivity;
  capability: WorkspaceScopeCapability;
  clearable: boolean;
  clearAction: WorkspaceScopeClearAction | null;
  ariaLabel: string;
}

export interface WorkspaceScopeOption {
  kind: WorkspaceScopeKind;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string | null;
  capability: WorkspaceScopeCapability;
}

export interface WorkspaceScopeTypeOption {
  value: SearchFilterType;
  label: string;
  selected: boolean;
  disabled: boolean;
  disabledReason: string | null;
  capability: WorkspaceScopeCapability;
}

export interface WorkspaceScopeModel {
  moduleId: WorkspaceScopeModuleId;
  title: string;
  summaryLabel: string;
  summaryDescription: string;
  activeChips: WorkspaceScopeChip[];
  scopeOptions: WorkspaceScopeOption[];
  messageTypeOptions: WorkspaceScopeTypeOption[];
  disabledReasons: string[];
  canReset: boolean;
  resetDisabledReason: string | null;
  announcement: string;
  pending: boolean;
}

export interface BuildWorkspaceScopeModelInput {
  moduleId: WorkspaceScopeModuleId;
  routeScope: WorkspaceRouteScopeView;
  state: WorkspaceScopeState;
  pending?: boolean;
}

export interface PersistableWorkspaceScope {
  kind: WorkspaceScopeKind;
  sourceRoute?: string;
  dateRange?: WorkspaceScopeDateRange;
  messageType?: SearchFilterType;
  mediaType?: WorkspaceScopeMediaType;
  snsContentType?: string;
  snsMediaOnly?: boolean;
  snsIncludeRead?: boolean;
}

const moduleTitles: Record<WorkspaceScopeModuleId, string> = {
  search: "搜索范围",
  analytics: "统计范围",
  sns: "朋友圈范围",
  media: "媒体范围",
  ai: "AI 范围",
  graph: "图谱范围",
};

const messageTypeLabels: Record<SearchFilterType, string> = {
  all: "全部类型",
  text: "文本",
  image: "图片",
  video: "视频",
  file: "文件",
};

const snsContentTypeLabels: Record<string, string> = {
  all: "全部类型",
  text: "文本",
  image: "图片",
  video: "视频",
  article: "文章",
  finder: "视频号",
  unknown: "其他",
};

export function buildWorkspaceScopeModel({
  moduleId,
  routeScope,
  state,
  pending = false,
}: BuildWorkspaceScopeModelInput): WorkspaceScopeModel {
  const normalizedState = normalizeScopeState(routeScope, state);
  const scopeOptions = buildScopeOptions(moduleId, routeScope, normalizedState.kind);
  const messageTypeOptions = buildMessageTypeOptions(moduleId, normalizedState.messageType ?? "all");
  const activeChips = buildActiveChips(moduleId, routeScope, normalizedState);
  const disabledReasons = collectDisabledReasons(scopeOptions, messageTypeOptions, activeChips);
  const canReset = activeChips.some((chip) => chip.clearable);

  return {
    moduleId,
    title: moduleTitles[moduleId],
    summaryLabel: routeScope.scopeLabel,
    summaryDescription: describeScopeModel(moduleId, routeScope, disabledReasons),
    activeChips,
    scopeOptions,
    messageTypeOptions,
    disabledReasons,
    canReset,
    resetDisabledReason: canReset ? null : "当前没有可清除的范围条件。",
    announcement: buildAnnouncement(moduleTitles[moduleId], activeChips, pending),
    pending,
  };
}

export function toPersistableWorkspaceScope(state: WorkspaceScopeState): PersistableWorkspaceScope {
  const persistable: PersistableWorkspaceScope = {
    kind: state.kind,
  };
  const sourceRoute = sanitizeStructuralToken(state.sourceRoute);
  if (sourceRoute) persistable.sourceRoute = sourceRoute;
  if (state.dateRange) persistable.dateRange = { ...state.dateRange };
  if (state.messageType) persistable.messageType = state.messageType;
  if (state.mediaType) persistable.mediaType = state.mediaType;
  if (state.snsContentType) persistable.snsContentType = state.snsContentType;
  if (typeof state.snsMediaOnly === "boolean") persistable.snsMediaOnly = state.snsMediaOnly;
  if (typeof state.snsIncludeRead === "boolean") persistable.snsIncludeRead = state.snsIncludeRead;
  return persistable;
}

function normalizeScopeState(
  routeScope: WorkspaceRouteScopeView,
  state: WorkspaceScopeState,
): WorkspaceScopeState {
  return {
    ...state,
    kind: state.kind ?? routeScope.scopeKind,
    messageType: state.messageType ?? "all",
    mediaType: state.mediaType ?? "all",
  };
}

function buildScopeOptions(
  moduleId: WorkspaceScopeModuleId,
  routeScope: WorkspaceRouteScopeView,
  selectedKind: WorkspaceScopeKind,
): WorkspaceScopeOption[] {
  return [
    buildScopeOption(moduleId, routeScope, selectedKind, "currentConversation", "当前会话"),
    buildScopeOption(moduleId, routeScope, selectedKind, "allConversations", "全部会话"),
  ];
}

function buildScopeOption(
  moduleId: WorkspaceScopeModuleId,
  routeScope: WorkspaceRouteScopeView,
  selectedKind: WorkspaceScopeKind,
  kind: WorkspaceScopeKind,
  label: string,
): WorkspaceScopeOption {
  const capability = capabilityForScopeKind(moduleId, routeScope, kind);
  return {
    kind,
    label,
    selected: selectedKind === kind,
    disabled: capability.status === "disabled" || capability.status === "readonly",
    disabledReason: capability.reason ?? null,
    capability,
  };
}

function capabilityForScopeKind(
  moduleId: WorkspaceScopeModuleId,
  routeScope: WorkspaceRouteScopeView,
  kind: WorkspaceScopeKind,
): WorkspaceScopeCapability {
  if (kind === "selectedContacts") {
    return disabled("scopeKind", "指定联系人范围将在高级筛选任务中启用。");
  }
  if (kind === "selectedGroups") {
    return disabled("scopeKind", "指定群聊范围将在高级筛选任务中启用。");
  }

  if (moduleId === "search") {
    if (kind === "currentConversation" && !routeScope.currentConversation) {
      return disabled("scopeKind", "先选择一个会话。选择会话后可搜索当前会话。");
    }
    return backendApplied("scopeKind");
  }

  if (moduleId === "analytics") {
    if (kind === "allConversations") {
      return disabled("scopeKind", "统计暂不支持全部会话；请从会话工作台选择一个会话查看统计。");
    }
    if (!routeScope.currentConversation) {
      return disabled("scopeKind", "先选择一个会话后再查看统计。");
    }
    return backendApplied("scopeKind");
  }

  if (moduleId === "sns") {
    return kind === "allConversations"
      ? backendApplied("scopeKind")
      : disabled("scopeKind", "朋友圈当前按全部动态加载，指定会话范围暂不可用。");
  }

  if (moduleId === "graph") {
    return kind === "allConversations"
      ? readonly("scopeKind", "图谱当前使用全局图谱；会话上下文只作为定位线索。")
      : readonly("scopeKind", "图谱会话范围会作为定位线索，深层图谱筛选将在图谱任务中处理。");
  }

  if (moduleId === "media") {
    return kind === "currentConversation"
      ? backendApplied("scopeKind")
      : disabled("scopeKind", "媒体库当前只支持当前会话；全部会话媒体范围将在媒体任务中启用。");
  }

  return kind === "currentConversation"
    ? localOnly("scopeKind", "AI 当前沿用当前会话上下文；切换范围不会改写正在生成的回答。")
    : disabled("scopeKind", "AI 全部会话/指定对象范围将在语义任务中启用。");
}

function buildMessageTypeOptions(
  moduleId: WorkspaceScopeModuleId,
  selectedType: SearchFilterType,
): WorkspaceScopeTypeOption[] {
  if (moduleId !== "search") {
    return [];
  }

  return (Object.keys(messageTypeLabels) as SearchFilterType[]).map((value) => {
    const capability = capabilityForMessageType(moduleId);
    return {
      value,
      label: messageTypeLabels[value],
      selected: selectedType === value,
      disabled: capability.status === "disabled" || capability.status === "readonly",
      disabledReason: capability.reason ?? null,
      capability,
    };
  });
}

function capabilityForMessageType(moduleId: WorkspaceScopeModuleId): WorkspaceScopeCapability {
  if (moduleId === "search") return backendApplied("messageType");
  if (moduleId === "sns") return localOnly("messageType", "朋友圈类型筛选只影响已加载内容。");
  return disabled("messageType", "消息类型筛选将在对应模块的生产力任务中启用。");
}

function buildActiveChips(
  moduleId: WorkspaceScopeModuleId,
  routeScope: WorkspaceRouteScopeView,
  state: WorkspaceScopeState,
): WorkspaceScopeChip[] {
  const chips: WorkspaceScopeChip[] = [
    {
      id: "scope",
      label: "范围",
      value: scopeValue(routeScope, state),
      field: "scopeKind",
      sensitivity: "structural",
      capability: capabilityForScopeKind(moduleId, routeScope, state.kind),
      clearable: state.kind !== "allConversations" && moduleId === "search",
      clearAction: state.kind !== "allConversations" && moduleId === "search"
        ? { type: "setScope", scopeKind: "allConversations" }
        : null,
      ariaLabel: `范围：${scopeValue(routeScope, state)}`,
    },
  ];

  for (const chip of routeScope.contextChips) {
    chips.push({
      id: chip.id,
      label: chip.label,
      value: chip.value,
      field: chip.id,
      sensitivity: chip.id === "focusMessage" ? "sensitive" : "structural",
      capability: chip.id === "focusMessage"
        ? readonly("focusMessage", "上下文定位来自上一页，可清除后返回普通范围。")
        : readonly("sourceRoute", "来源只用于解释上下文，不会改变后端请求。"),
      clearable: true,
      clearAction: { type: "clearField", field: chip.id },
      ariaLabel: `${chip.label}：${chip.value}`,
    });
  }

  if (state.selectedContacts?.length) {
    chips.push(selectionChip(
      moduleId,
      "selectedContacts",
      moduleId === "sns" ? "作者" : "联系人",
      moduleId === "sns" ? "已选择作者" : `${state.selectedContacts.length} 个联系人`,
    ));
  }
  if (state.selectedGroups?.length) {
    chips.push(selectionChip(moduleId, "selectedGroups", "群聊", `${state.selectedGroups.length} 个群聊`));
  }
  if (state.dateRange) {
    const capability = capabilityForDateRange(moduleId);
    chips.push({
      id: "dateRange",
      label: "时间",
      value: formatDateRange(state.dateRange),
      field: "dateRange",
      sensitivity: "structural",
      capability,
      clearable: capability.status === "backend-applied" || capability.status === "local-only" || capability.status === "supported",
      clearAction: capability.status === "readonly" || capability.status === "disabled"
        ? null
        : { type: "clearField", field: "dateRange" },
      ariaLabel: `时间：${formatDateRange(state.dateRange)}`,
    });
  }
  if (state.messageType && state.messageType !== "all") {
    const capability = capabilityForMessageType(moduleId);
    chips.push({
      id: "messageType",
      label: "消息类型",
      value: messageTypeLabels[state.messageType],
      field: "messageType",
      sensitivity: "structural",
      capability,
      clearable: capability.status === "backend-applied" || capability.status === "local-only" || capability.status === "supported",
      clearAction: { type: "clearField", field: "messageType" },
      ariaLabel: `消息类型：${messageTypeLabels[state.messageType]}`,
    });
  }
  if (state.mediaType && state.mediaType !== "all") {
    const capability = capabilityForMediaType(moduleId);
    chips.push({
      id: "mediaType",
      label: "媒体类型",
      value: mediaTypeLabel(state.mediaType),
      field: "mediaType",
      sensitivity: "structural",
      capability,
      clearable: capability.status === "backend-applied" || capability.status === "local-only" || capability.status === "supported",
      clearAction: { type: "clearField", field: "mediaType" },
      ariaLabel: `媒体类型：${mediaTypeLabel(state.mediaType)}`,
    });
  }
  if (state.snsContentType && state.snsContentType !== "all") {
    chips.push({
      id: "snsContentType",
      label: "朋友圈类型",
      value: snsContentTypeLabels[state.snsContentType] ?? "其他",
      field: "snsContentType",
      sensitivity: "structural",
      capability: localOnly("snsContentType", "朋友圈类型筛选只影响已加载内容。"),
      clearable: true,
      clearAction: { type: "clearField", field: "snsContentType" },
      ariaLabel: `朋友圈类型：${snsContentTypeLabels[state.snsContentType] ?? "其他"}`,
    });
  }
  if (state.snsMediaOnly) {
    chips.push({
      id: "snsMediaOnly",
      label: "朋友圈媒体",
      value: "只看含媒体",
      field: "snsMediaOnly",
      sensitivity: "structural",
      capability: localOnly("snsMediaOnly", "只看媒体会过滤已加载动态。"),
      clearable: true,
      clearAction: { type: "clearField", field: "snsMediaOnly" },
      ariaLabel: "朋友圈媒体：只看含媒体",
    });
  }
  if (state.snsIncludeRead) {
    chips.push({
      id: "snsReadState",
      label: "通知",
      value: "包含已读",
      field: "snsReadState",
      sensitivity: "structural",
      capability: backendApplied("snsReadState"),
      clearable: true,
      clearAction: { type: "clearField", field: "snsReadState" },
      ariaLabel: "通知：包含已读",
    });
  }

  return chips;
}

function capabilityForDateRange(moduleId: WorkspaceScopeModuleId): WorkspaceScopeCapability {
  if (moduleId === "sns") return backendApplied("dateRange");
  if (moduleId === "analytics") return readonly("dateRange", "统计时间窗口当前固定为近 7 天。");
  return disabled("dateRange", "日期范围筛选将在对应模块的生产力任务中启用。");
}

function capabilityForMediaType(moduleId: WorkspaceScopeModuleId): WorkspaceScopeCapability {
  if (moduleId === "sns") return localOnly("mediaType", "朋友圈媒体类型只影响已加载内容。");
  return disabled("mediaType", "媒体类型筛选将在媒体任务中启用。");
}

function scopeValue(routeScope: WorkspaceRouteScopeView, state: WorkspaceScopeState): string {
  if (state.kind === "allConversations") {
    return "全部会话";
  }
  if (state.kind === "selectedContacts") {
    return `${state.selectedContacts?.length ?? 0} 个联系人`;
  }
  if (state.kind === "selectedGroups") {
    return `${state.selectedGroups?.length ?? 0} 个群聊`;
  }
  return routeScope.scopeLabel;
}

function selectionChip(
  moduleId: WorkspaceScopeModuleId,
  field: "selectedContacts" | "selectedGroups",
  label: string,
  value: string,
): WorkspaceScopeChip {
  const capability = moduleId === "sns" && field === "selectedContacts"
    ? backendApplied(field)
    : disabled(field, `${label}筛选将在高级筛选任务中启用。`);
  return {
    id: field,
    label,
    value,
    field,
    sensitivity: "sensitive",
    capability,
    clearable: true,
    clearAction: { type: "clearField", field },
    ariaLabel: `${label}：${value}`,
  };
}

function formatDateRange(dateRange: WorkspaceScopeDateRange): string {
  if (dateRange.preset === "7d") return "近 7 天";
  if (dateRange.preset === "30d") return "近 30 天";
  if (dateRange.preset === "90d") return "近 90 天";
  if (dateRange.start && dateRange.end) return `${dateRange.start} 到 ${dateRange.end}`;
  if (dateRange.start) return `${dateRange.start} 之后`;
  if (dateRange.end) return `${dateRange.end} 之前`;
  return "自定义时间";
}

function mediaTypeLabel(mediaType: WorkspaceScopeMediaType): string {
  if (mediaType === "image") return "图片";
  if (mediaType === "video") return "视频";
  if (mediaType === "voice") return "语音";
  if (mediaType === "file") return "文件";
  return "全部媒体";
}

function describeScopeModel(
  moduleId: WorkspaceScopeModuleId,
  routeScope: WorkspaceRouteScopeView,
  disabledReasons: string[],
): string {
  if (disabledReasons.length > 0) {
    return disabledReasons[0];
  }
  if (moduleId === "search") {
    return "切换范围或消息类型会取消旧搜索并按新范围重新检索。";
  }
  if (moduleId === "sns") {
    return "朋友圈作者和日期会进入接口请求，类型筛选会标记为本地范围。";
  }
  if (routeScope.state === "missing-chat") {
    return "来源会话不可用，请返回会话工作台重新选择。";
  }
  return routeScope.scopeDescription;
}

function collectDisabledReasons(
  scopeOptions: WorkspaceScopeOption[],
  messageTypeOptions: WorkspaceScopeTypeOption[],
  activeChips: WorkspaceScopeChip[],
): string[] {
  return Array.from(new Set([
    ...scopeOptions.map((option) => option.disabledReason),
    ...messageTypeOptions.map((option) => option.disabledReason),
    ...activeChips.map((chip) => chip.capability.reason),
  ].filter((reason): reason is string => Boolean(reason))));
}

function buildAnnouncement(title: string, chips: WorkspaceScopeChip[], pending: boolean): string {
  const suffix = chips.map((chip) => `${chip.label}：${chip.value}`).join("，");
  if (pending) return `${title}正在更新，${suffix}`;
  return suffix ? `${title}已更新，${suffix}` : `${title}已重置`;
}

function backendApplied(field: WorkspaceScopeField): WorkspaceScopeCapability {
  return { field, status: "backend-applied" };
}

function readonly(field: WorkspaceScopeField, reason: string): WorkspaceScopeCapability {
  return { field, status: "readonly", reason };
}

function disabled(field: WorkspaceScopeField, reason: string): WorkspaceScopeCapability {
  return { field, status: "disabled", reason };
}

function localOnly(field: WorkspaceScopeField, reason: string): WorkspaceScopeCapability {
  return { field, status: "local-only", reason };
}

function sanitizeStructuralToken(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized || normalized.length > 40) return undefined;
  return /^[a-z0-9_-]+$/i.test(normalized) ? normalized : undefined;
}
