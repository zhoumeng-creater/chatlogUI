import type {
  ContactProfileData,
  SemanticSearchResultItem,
  SemanticSearchResponse,
  TopicsResponse,
} from "@/l2-coordinator/api-docs/semantic";

export interface SemanticDiscoveryViewInput {
  privacyOn: boolean;
  currentChatLabel?: string;
  window: string;
  moduleReady: boolean;
  search: {
    query: string;
    loading: boolean;
    error: string | null;
    results: SemanticSearchResponse | null;
  };
  topics: {
    loading: boolean;
    error: string | null;
    data: TopicsResponse | null;
  };
  profile: {
    loading: boolean;
    error: string | null;
    data: ContactProfileData | null;
  };
}

export type SemanticDiscoveryPanelStatus = "idle" | "loading" | "ready" | "empty" | "error";

export interface SemanticDiscoverySearchRowView extends Pick<
  SemanticSearchResultItem,
  "chat" | "senderId" | "time" | "localId"
> {
  chatLabel: string;
  senderLabel: string;
  contentPreview: string;
  scoreLabel: string;
}

export interface SemanticDiscoveryTopicRowView {
  label: string;
  count: number;
  countLabel: string;
  keywords: string[];
}

export interface SemanticDiscoveryProfileRowView {
  sender: string;
  senderLabel: string;
  messages: number;
  messagesLabel: string;
  keywords: string[];
}

export interface SemanticDiscoveryView {
  canUseDiscovery: boolean;
  context: {
    scopeLabel: string;
    windowLabel: string;
    readinessLabel: string;
    privacyLabel: string;
  };
  search: {
    status: SemanticDiscoveryPanelStatus;
    summary: string;
    error: string;
    rows: SemanticDiscoverySearchRowView[];
  };
  topics: {
    status: SemanticDiscoveryPanelStatus;
    windowLabel: string;
    countLabel: string;
    summary: string;
    summaryError: string;
    truncatedLabel: string;
    rows: SemanticDiscoveryTopicRowView[];
    dailyRows: Array<{ date: string; count: number }>;
  };
  profile: {
    status: SemanticDiscoveryPanelStatus;
    windowLabel: string;
    countLabel: string;
    summary: string;
    summaryError: string;
    rows: SemanticDiscoveryProfileRowView[];
    typeRows: Array<{ type: string; countLabel: string }>;
  };
}

export function buildSemanticDiscoveryView(input: SemanticDiscoveryViewInput): SemanticDiscoveryView {
  return {
    canUseDiscovery: input.moduleReady,
    context: {
      scopeLabel: input.privacyOn
        ? "已隐藏当前会话"
        : input.currentChatLabel || "当前会话",
      windowLabel: windowLabel(input.window),
      readinessLabel: input.moduleReady ? "语义发现可用" : "语义发现不可用",
      privacyLabel: input.privacyOn ? "隐私模式已开启" : "隐私模式未开启",
    },
    search: buildSearchView(input),
    topics: buildTopicsView(input),
    profile: buildProfileView(input),
  };
}

function buildSearchView(input: SemanticDiscoveryViewInput): SemanticDiscoveryView["search"] {
  const { search } = input;
  if (search.loading) return { status: "loading", summary: "正在语义搜索", error: "", rows: [] };
  if (search.error) return { status: "error", summary: "", error: search.error, rows: [] };
  if (!search.results) return { status: "idle", summary: "", error: "", rows: [] };
  const rows = search.results.results.map((row) => ({
    chat: row.chat,
    senderId: row.senderId,
    time: row.time,
    localId: row.localId,
    chatLabel: input.privacyOn ? "已隐藏会话" : row.chatName || row.chat || "未知会话",
    senderLabel: input.privacyOn ? "已隐藏发送者" : row.sender || "未知发送者",
    contentPreview: input.privacyOn ? "已隐藏内容" : row.content,
    scoreLabel: scoreLabel(row.relevanceScore),
  }));
  return {
    status: rows.length > 0 ? "ready" : "empty",
    summary: searchSummary(search.results),
    error: "",
    rows,
  };
}

function buildTopicsView(input: SemanticDiscoveryViewInput): SemanticDiscoveryView["topics"] {
  const { topics } = input;
  if (topics.loading) {
    return emptyTopicsView("loading");
  }
  if (topics.error) {
    return { ...emptyTopicsView("error"), summaryError: topics.error };
  }
  if (!topics.data) {
    return emptyTopicsView("idle");
  }
  const rows = (topics.data.topics ?? []).map((topic) => ({
    label: input.privacyOn ? "已隐藏话题" : topic.topic,
    count: topic.count,
    countLabel: `${topic.count} 条`,
    keywords: (topic.keywords ?? []).map((keyword) => input.privacyOn ? "已隐藏关键词" : keyword),
  }));
  return {
    status: rows.length > 0 ? "ready" : "empty",
    windowLabel: topics.data.windowLabel || windowLabel(topics.data.window),
    countLabel: `${topics.data.count ?? 0} 条消息`,
    summary: summaryText(topics.data.summary, input.privacyOn),
    summaryError: topics.data.summaryError ?? "",
    truncatedLabel: topics.data.truncated ? "样本已截断" : "",
    rows,
    dailyRows: [...(topics.data.daily ?? [])],
  };
}

function buildProfileView(input: SemanticDiscoveryViewInput): SemanticDiscoveryView["profile"] {
  const { profile } = input;
  if (profile.loading) {
    return emptyProfileView("loading");
  }
  if (profile.error) {
    return { ...emptyProfileView("error"), summaryError: profile.error };
  }
  if (!profile.data) {
    return emptyProfileView("idle");
  }
  const rows = (profile.data.profiles ?? []).map((row) => ({
    sender: row.sender,
    senderLabel: input.privacyOn ? "已隐藏发送者" : row.senderName || row.sender,
    messages: row.messages,
    messagesLabel: `${row.messages} 条消息`,
    keywords: row.topKeywords.map((keyword) => input.privacyOn ? "已隐藏关键词" : keyword.topic),
  }));
  return {
    status: rows.length > 0 ? "ready" : "empty",
    windowLabel: profile.data.windowLabel || windowLabel(profile.data.window),
    countLabel: `${profile.data.count ?? 0} 条消息`,
    summary: summaryText(profile.data.summary, input.privacyOn),
    summaryError: profile.data.summaryError ?? "",
    rows,
    typeRows: (profile.data.typeDistribution ?? []).map((row) => ({
      type: row.type,
      countLabel: `${row.count} 条`,
    })),
  };
}

function searchSummary(results: SemanticSearchResponse): string {
  const parts = [
    `${results.count ?? results.totalCount ?? results.results.length} 条结果`,
    `${results.sourceCount ?? 0} 条候选`,
  ];
  if (results.window) parts.push(results.window);
  if (results.depth) parts.push(results.depth);
  if (results.rerank?.error) parts.push("rerank 异常");
  else if (results.rerank?.applied) parts.push("rerank 已应用");
  else if (results.rerank?.tried) parts.push("rerank 已尝试");
  return parts.join(" / ");
}

function scoreLabel(score: number): string {
  const percent = score <= 1 ? score * 100 : score;
  return `${Math.round(Math.max(0, Math.min(100, percent)))}%`;
}

function windowLabel(window: string | undefined): string {
  switch (window) {
    case "today":
      return "今天";
    case "yesterday":
      return "昨天";
    case "7d":
      return "7 天";
    case "30d":
      return "30 天";
    case "90d":
      return "90 天";
    case "1y":
      return "1 年";
    case "all":
      return "全部";
    default:
      return window || "未选择";
  }
}

function summaryText(summary: string | undefined, privacyOn: boolean): string {
  if (!summary) return "";
  return privacyOn ? "已隐藏总结" : summary;
}

function emptyTopicsView(status: SemanticDiscoveryPanelStatus): SemanticDiscoveryView["topics"] {
  return {
    status,
    windowLabel: "",
    countLabel: "",
    summary: "",
    summaryError: "",
    truncatedLabel: "",
    rows: [],
    dailyRows: [],
  };
}

function emptyProfileView(status: SemanticDiscoveryPanelStatus): SemanticDiscoveryView["profile"] {
  return {
    status,
    windowLabel: "",
    countLabel: "",
    summary: "",
    summaryError: "",
    rows: [],
    typeRows: [],
  };
}
