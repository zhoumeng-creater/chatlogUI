type RawRecord = Record<string, unknown>;

export interface HookNotifyTargets {
  mcp: boolean;
  post: boolean;
  weixin: boolean;
  qq: boolean;
}

export interface HookConfigView {
  keywords: string[];
  notifyMode: string;
  notifyTargets: HookNotifyTargets;
  postUrlConfigured: boolean;
  beforeCount: number;
  afterCount: number;
  forwardAll: boolean;
  forwardContactCount: number;
  forwardChatroomCount: number;
}

export interface HookConfigDraft {
  keywordsText?: string;
  notifyTargets: HookNotifyTargets;
  postUrl?: string;
  beforeCount?: number;
  afterCount?: number;
  forwardAll?: boolean;
  forwardContactsText?: string;
  forwardChatroomsText?: string;
}

export interface HookConfigPayload {
  keywords: string;
  notify_mode: string;
  post_url: string;
  before_count: number;
  after_count: number;
  forward_all: boolean;
  forward_contacts: string;
  forward_chatrooms: string;
}

export interface HermesStatusView {
  channel: "weixin" | "qq";
  installed: boolean;
  enabled: boolean;
  available: boolean;
  editable: boolean;
  hasCredential: boolean;
  hasChannel: boolean;
  hasPath: boolean;
  error: string;
}

export interface HermesWeixinDraft {
  hermesHome?: string;
  accountId?: string;
  token?: string;
  baseUrl?: string;
  cdnBaseUrl?: string;
  homeChannel?: string;
  homeChannelName?: string;
}

export interface HermesWeixinPayload {
  hermes_home: string;
  account_id: string;
  token: string;
  base_url: string;
  cdn_base_url: string;
  home_channel: string;
  home_channel_name: string;
}

export interface HermesQQDraft {
  hermesHome?: string;
  appId?: string;
  clientSecret?: string;
  homeChannel?: string;
  homeChannelName?: string;
}

export interface HermesQQPayload {
  hermes_home: string;
  app_id: string;
  client_secret: string;
  home_channel: string;
  home_channel_name: string;
}

export interface HookStatusView {
  running: boolean;
  keywordsCount: number;
  notifyMode: string;
  notifyTargets: HookNotifyTargets;
  postUrlConfigured: boolean;
  beforeCount: number;
  afterCount: number;
  forwardAll: boolean;
  forwardContactCount: number;
  forwardChatroomCount: number;
  sseClients: number;
  eventCount: number;
  lastEventAt: string;
  eventsStoreConfigured: boolean;
  mcpNotificationMethod: string;
  weixin: HermesStatusView;
  qq: HermesStatusView;
}

export interface HookEventSummary {
  id: string;
  createdAt: string;
  ruleType: string;
  ruleLabel: string;
  keywordMatched: boolean;
  identityLabel: string;
  contentPreview: string;
  triggerTime: string;
  triggerSeq: number;
  contextCount: number;
  deliverySummary: string;
  deliveryTargets: string[];
}

export interface HookClearResult {
  ok: boolean;
  cleared: number;
  message: string;
}

export function adaptHookConfig(raw: unknown): HookConfigView {
  const data = asRecord(raw);
  const forwardAll = boolValue(data.forward_all);
  return {
    keywords: splitList(data.keywords),
    notifyMode: canonicalNotifyMode(data.notify_mode),
    notifyTargets: parseNotifyTargets(data.notify_mode),
    postUrlConfigured: stringValue(data.post_url).length > 0,
    beforeCount: numberValue(data.before_count, 5),
    afterCount: numberValue(data.after_count, 5),
    forwardAll,
    forwardContactCount: forwardAll ? 0 : splitList(data.forward_contacts).length,
    forwardChatroomCount: forwardAll ? 0 : splitList(data.forward_chatrooms).length,
  };
}

export function buildHookConfigPayload(draft: HookConfigDraft): HookConfigPayload {
  const forwardAll = draft.forwardAll === true;
  return {
    keywords: forwardAll ? "" : stringValue(draft.keywordsText),
    notify_mode: canonicalNotifyModeFromTargets(draft.notifyTargets),
    post_url: stringValue(draft.postUrl),
    before_count: clampCount(draft.beforeCount),
    after_count: clampCount(draft.afterCount),
    forward_all: forwardAll,
    forward_contacts: forwardAll ? "" : stringValue(draft.forwardContactsText),
    forward_chatrooms: forwardAll ? "" : stringValue(draft.forwardChatroomsText),
  };
}

export function buildHermesWeixinPayload(draft: HermesWeixinDraft): HermesWeixinPayload {
  return {
    hermes_home: stringValue(draft.hermesHome),
    account_id: stringValue(draft.accountId),
    token: stringValue(draft.token),
    base_url: stringValue(draft.baseUrl),
    cdn_base_url: stringValue(draft.cdnBaseUrl),
    home_channel: stringValue(draft.homeChannel),
    home_channel_name: stringValue(draft.homeChannelName),
  };
}

export function buildHermesQQPayload(draft: HermesQQDraft): HermesQQPayload {
  return {
    hermes_home: stringValue(draft.hermesHome),
    app_id: stringValue(draft.appId),
    client_secret: stringValue(draft.clientSecret),
    home_channel: stringValue(draft.homeChannel),
    home_channel_name: stringValue(draft.homeChannelName),
  };
}

export function adaptHookStatus(raw: unknown): HookStatusView {
  const data = asRecord(raw);
  const notifyMode = canonicalNotifyMode(data.notify_mode);
  const forwardAll = boolValue(data.forward_all);
  return {
    running: boolValue(data.running),
    keywordsCount: numberValue(data.keywords_count, splitList(data.keywords).length),
    notifyMode,
    notifyTargets: parseNotifyTargets(notifyMode),
    postUrlConfigured: stringValue(data.post_url).length > 0,
    beforeCount: numberValue(data.before_count, 5),
    afterCount: numberValue(data.after_count, 5),
    forwardAll,
    forwardContactCount: forwardAll ? 0 : splitList(data.forward_contacts).length,
    forwardChatroomCount: forwardAll ? 0 : splitList(data.forward_chatrooms).length,
    sseClients: numberValue(data.sse_clients),
    eventCount: numberValue(data.event_count),
    lastEventAt: stringValue(data.last_event_at),
    eventsStoreConfigured: stringValue(data.events_store_file).length > 0,
    mcpNotificationMethod: stringValue(data.mcp_notification_method),
    weixin: adaptHermesStatus("weixin", data.weixin),
    qq: adaptHermesStatus("qq", data.qq),
  };
}

export function adaptHermesStatus(channel: "weixin" | "qq", raw: unknown): HermesStatusView {
  const data = asRecord(raw);
  const credentialKeys =
    channel === "weixin"
      ? ["token", "account_id"]
      : ["client_secret", "app_id"];
  const pathKeys = ["hermes_bin", "hermes_home", "env_file", "config_file", "channel_file", "account_file"];
  return {
    channel,
    installed: boolValue(data.installed),
    enabled: boolValue(data.enabled),
    available: boolValue(data.available),
    editable: boolValue(data.editable),
    hasCredential: credentialKeys.some((key) => stringValue(data[key]).length > 0),
    hasChannel:
      stringValue(data.home_channel).length > 0 ||
      stringValue(data.home_channel_name).length > 0 ||
      stringValue(data.home_channel_from).length > 0,
    hasPath: pathKeys.some((key) => stringValue(data[key]).length > 0),
    error: stringValue(data.error),
  };
}

export function adaptHookEvent(raw: unknown): HookEventSummary {
  const data = asRecord(raw);
  const deliveries = arrayValue(data.deliveries).map(asRecord);
  const successCount = deliveries.filter((delivery) => boolValue(delivery.success)).length;
  return {
    id: stringValue(data.id) || String(numberValue(data.id)),
    createdAt: stringValue(data.created_at),
    ruleType: stringValue(data.rule_type),
    ruleLabel: stringValue(data.rule_label),
    keywordMatched: stringValue(data.keyword).length > 0,
    identityLabel: "已隐藏对象",
    contentPreview: "已隐藏内容",
    triggerTime: stringValue(data.trigger_time),
    triggerSeq: numberValue(data.trigger_seq),
    contextCount: arrayValue(data.context).length,
    deliverySummary: `${successCount}/${deliveries.length} delivered`,
    deliveryTargets: deliveries.map((delivery) => stringValue(delivery.target)).filter(Boolean),
  };
}

export function adaptHookEventsResponse(raw: unknown): HookEventSummary[] {
  const data = asRecord(raw);
  return arrayValue(data.events).map(adaptHookEvent);
}

export function adaptHookClearResult(raw: unknown): HookClearResult {
  const data = asRecord(raw);
  return {
    ok: boolValue(data.ok, true),
    cleared: numberValue(data.cleared, numberValue(data.count)),
    message: stringValue(data.message) || "Hook events cleared",
  };
}

export function parseNotifyTargets(raw: unknown): HookNotifyTargets {
  const value = stringValue(raw).toLowerCase();
  if (!value) return { mcp: true, post: false, weixin: false, qq: false };

  const targets: HookNotifyTargets = { mcp: false, post: false, weixin: false, qq: false };
  for (const token of value.replace(/[|+;\s]+/g, ",").split(",")) {
    const part = token.trim();
    if (!part) continue;
    if (part === "all") {
      return { mcp: true, post: true, weixin: true, qq: true };
    }
    if (part === "both") {
      targets.mcp = true;
      targets.post = true;
      continue;
    }
    if (part === "mcp" || part === "post" || part === "weixin" || part === "qq") {
      targets[part] = true;
    }
  }

  return targets.mcp || targets.post || targets.weixin || targets.qq
    ? targets
    : { mcp: true, post: false, weixin: false, qq: false };
}

export function canonicalNotifyMode(raw: unknown): string {
  return canonicalNotifyModeFromTargets(parseNotifyTargets(raw));
}

export function canonicalNotifyModeFromTargets(targets: HookNotifyTargets): string {
  if (targets.mcp && targets.post && targets.weixin && targets.qq) return "all";
  if (targets.mcp && targets.post && !targets.weixin && !targets.qq) return "both";
  const parts = [
    targets.mcp ? "mcp" : "",
    targets.post ? "post" : "",
    targets.weixin ? "weixin" : "",
    targets.qq ? "qq" : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(",") : "mcp";
}

function splitList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(stringValue).filter(Boolean);
  return stringValue(value)
    .replace(/[，;|\n]+/g, ",")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function clampCount(value: unknown): number {
  return Math.max(0, Math.min(50, numberValue(value)));
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}
