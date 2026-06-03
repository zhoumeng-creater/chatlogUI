import type {
  HermesStatusView,
  HookClearResult,
  HookConfigDraft,
  HookConfigView,
  HookEventSummary,
  HookStatusView,
} from "@l4/network";
import type {
  HookLoadStatus,
  HookStoreSnapshot,
  HookStreamStatus,
  HookSubtab,
} from "@l2/data-clerk/stores/useHookStore";

export interface HookConfigViewModel {
  keywordsCount: number;
  notifyMode: string;
  targets: Array<{ id: keyof HookConfigView["notifyTargets"]; label: string; enabled: boolean }>;
  postUrlLabel: string;
  contextWindow: string;
  forwardScope: string;
}

export interface HookStatusViewModel {
  statusSummary: string;
  detail: string;
  bridges: HermesBridgeView[];
}

export interface HermesBridgeView {
  id: HermesStatusView["channel"];
  label: string;
  editable: boolean;
  installedLabel: string;
  enabledLabel: string;
  credentialLabel: string;
  channelLabel: string;
  pathLabel: string;
  error: string | null;
}

export interface HookEventRowView extends HookEventSummary {
  deliveryLabel: string;
  contextLabel: string;
}

export interface HookView {
  activeSubtab: HookSubtab;
  configStatus: HookLoadStatus;
  statusStatus: HookLoadStatus;
  eventsStatus: HookLoadStatus;
  streamStatus: HookStreamStatus;
  clearStatus: HookLoadStatus;
  statusSummary: string;
  config: HookConfigViewModel | null;
  status: HookStatusViewModel | null;
  eventRows: HookEventRowView[];
  clearCopy: string;
  streamCopy: string;
  clearResult: HookClearResult | null;
  errorCopy: string | null;
}

const TARGET_LABELS: Record<keyof HookConfigView["notifyTargets"], string> = {
  mcp: "MCP",
  post: "POST",
  weixin: "企业微信",
  qq: "QQ",
};

export function buildHookView(state: HookStoreSnapshot, privacyOn: boolean): HookView {
  const statusSummary = state.statusSummary
    ? `${state.statusSummary.running ? "运行中" : "已停止"} · ${state.statusSummary.keywordsCount} keywords · ${state.statusSummary.eventCount} events`
    : "Hook 状态未加载";

  return {
    activeSubtab: state.activeSubtab,
    configStatus: state.configStatus,
    statusStatus: state.statusStatus,
    eventsStatus: state.eventsStatus,
    streamStatus: state.streamStatus,
    clearStatus: state.clearStatus,
    statusSummary,
    config: state.config ? buildConfigView(state.config) : null,
    status: state.statusSummary ? buildStatusView(state.statusSummary) : null,
    eventRows: state.events.map((event) => safeEventRow(event, privacyOn)),
    clearCopy: state.clearConfirmationPending
      ? "再次确认清空 Hook 事件"
      : "清空 Hook 事件需要先确认",
    streamCopy: streamCopy(state.streamStatus),
    clearResult: state.clearResult ?? null,
    errorCopy:
      state.configError ??
      state.statusError ??
      state.eventsError ??
      state.streamError ??
      state.clearError,
  };
}

export function validateHookConfigSave(
  current: HookConfigView | null,
  draft: Partial<HookConfigDraft> & Pick<HookConfigDraft, "notifyTargets">,
): string | null {
  if (!current) return null;
  if (current.postUrlConfigured && !draft.postUrl?.trim()) {
    return "POST 目标已配置，但当前表单没有新的 POST URL。请输入完整 POST URL 后再保存，避免清空现有目标。";
  }
  if (draft.forwardAll === true) return null;
  if (current.forwardContactCount > 0 && !draft.forwardContactsText?.trim()) {
    return "联系人转发名单已配置，但当前表单没有新的联系人名单。请输入完整联系人名单后再保存，避免清空现有名单。";
  }
  if (current.forwardChatroomCount > 0 && !draft.forwardChatroomsText?.trim()) {
    return "群聊转发名单已配置，但当前表单没有新的群聊名单。请输入完整群聊名单后再保存，避免清空现有名单。";
  }
  return null;
}

function buildConfigView(config: HookConfigView): HookConfigViewModel {
  return {
    keywordsCount: config.keywords.length,
    notifyMode: config.notifyMode,
    targets: (Object.keys(TARGET_LABELS) as Array<keyof HookConfigView["notifyTargets"]>).map((id) => ({
      id,
      label: TARGET_LABELS[id],
      enabled: config.notifyTargets[id],
    })),
    postUrlLabel: config.postUrlConfigured ? "已配置 POST 目标" : "未配置 POST 目标",
    contextWindow: `${config.beforeCount} before / ${config.afterCount} after`,
    forwardScope: config.forwardAll
      ? "全部会话"
      : `${config.forwardContactCount} contacts · ${config.forwardChatroomCount} chatrooms`,
  };
}

function buildStatusView(status: HookStatusView): HookStatusViewModel {
  return {
    statusSummary: `${status.running ? "运行中" : "已停止"} · ${status.sseClients} SSE · ${status.eventCount} events`,
    detail: `${status.keywordsCount} keywords · ${status.beforeCount}/${status.afterCount} context · ${status.eventsStoreConfigured ? "事件存储已配置" : "事件存储未配置"}`,
    bridges: [bridgeView(status.weixin), bridgeView(status.qq)],
  };
}

function bridgeView(status: HermesStatusView): HermesBridgeView {
  return {
    id: status.channel,
    label: status.channel === "weixin" ? "企业微信" : "QQ",
    editable: status.editable,
    installedLabel: status.installed ? "已安装" : "未安装",
    enabledLabel: status.enabled ? "已启用" : "未启用",
    credentialLabel: status.hasCredential ? "凭据已配置" : "凭据未配置",
    channelLabel: status.hasChannel ? "频道已配置" : "频道未配置",
    pathLabel: status.hasPath ? "路径已配置" : "路径未配置",
    error: status.error || null,
  };
}

function safeEventRow(event: HookEventSummary, privacyOn: boolean): HookEventRowView {
  return {
    ...event,
    identityLabel: privacyOn ? "已隐藏对象" : event.identityLabel,
    contentPreview: privacyOn ? "已隐藏内容" : event.contentPreview,
    deliveryLabel: `${event.deliverySummary}${event.deliveryTargets.length > 0 ? ` · ${event.deliveryTargets.join(", ")}` : ""}`,
    contextLabel: `${event.contextCount} context`,
  };
}

function streamCopy(status: HookStreamStatus): string {
  if (status === "connecting") return "正在连接 Hook SSE";
  if (status === "streaming") return "Hook SSE 正在接收事件";
  if (status === "error") return "Hook SSE 连接失败";
  if (status === "stopped") return "Hook SSE 已停止";
  return "Hook SSE 未连接";
}
