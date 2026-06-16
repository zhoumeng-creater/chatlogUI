import { containsUnsafeDisplayText } from "@/utils/privacyDisplay";

export const BUSINESS_EXPORT_FORMATS = ["markdown", "csv", "json"] as const;
export const BUSINESS_EXPORT_STATUSES = [
  "idle",
  "preparing",
  "confirming",
  "writing",
  "completed",
  "failed",
  "cancelling",
  "cancelled",
  "partial",
] as const;

export type BusinessExportSourceModule =
  | "search"
  | "stats"
  | "sns"
  | "conversation"
  | "conversation_selection"
  | "media"
  | "ai"
  | "graph";
export type BusinessExportFormat = (typeof BUSINESS_EXPORT_FORMATS)[number];
export type BusinessExportStatus = (typeof BUSINESS_EXPORT_STATUSES)[number];
export type BusinessExportPrivacyMode = "redacted" | "unredacted";
export type BusinessExportRedactionPolicy = "redacted" | "unredacted-confirmed" | "blocked";
export type BusinessExportErrorCategory =
  | "redaction-blocked"
  | "cancelled"
  | "permission-denied"
  | "path-invalid"
  | "disk-full"
  | "write-failed"
  | "unknown";

export interface BusinessExportError {
  category: BusinessExportErrorCategory;
  message: string;
  retryable: boolean;
}

export interface BusinessExportJob {
  id: string;
  source: BusinessExportSourceModule;
  sourceLabel: string;
  format: BusinessExportFormat;
  privacyMode: BusinessExportPrivacyMode;
  redactionPolicy: BusinessExportRedactionPolicy;
  scopeSummary: string;
  filenamePreview: string;
  rowCount: number;
  estimatedBytes: number;
  status: BusinessExportStatus;
  error: BusinessExportError | null;
  generatedAt: string;
}

export interface BusinessExportArtifact {
  job: BusinessExportJob;
  source: BusinessExportSourceModule;
  format: BusinessExportFormat;
  fileName: string;
  extension: BusinessExportExtension;
  mimeType: string;
  content: string;
  rowCount: number;
  estimatedBytes: number;
  privacyMode: BusinessExportPrivacyMode;
  redactionPolicy: BusinessExportRedactionPolicy;
  status: BusinessExportStatus;
  warnings: string[];
}

export type BusinessExportExtension = "md" | "csv" | "json";

interface BuildBusinessExportJobInput {
  source: BusinessExportSourceModule;
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  rowCount: number;
  estimatedBytes: number;
  scopeSummary: string;
  generatedAt: Date;
  status?: BusinessExportStatus;
}

export interface SearchExportMessage {
  id: string;
  sender: string;
  chat: string;
  content: string;
  timestamp?: number;
  time?: string;
  type?: string;
}

export interface SearchExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  query: string;
  scopeSummary: string;
  filterSummary: string[];
  totalCount: number;
  loadedCount: number;
  messages: SearchExportMessage[];
}

export interface StatsExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  visibleRangeLabel?: string;
  controlSummary?: string;
  metricDefinitions?: Array<{ key: string; label: string; description: string }>;
  comparison?: {
    mode: "off" | "previousPeriod";
    unavailableReason: string | null;
    rows: Array<{
      key: string;
      label: string;
      current: number;
      previous: number;
      deltaPercent: number | null;
    }>;
  };
  warnings?: string[];
  stats: {
    total: number;
    sentCount: number;
    receivedCount: number;
    activeSenders: number;
    activeDays: number;
    queryRangeLabel: string;
    topSenders: Array<{ sender: string; display: string; count: number }>;
  } | null;
  trend: Array<{ date: string; count: number }>;
}

export interface SnsExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  activeTab: "timeline" | "search" | "notifications";
  activeTabLabel?: string;
  scopeSummary: string;
  appliedFilterSummary?: string[];
  searchQuery?: string;
  visibleCount?: number;
  loadedCount?: number;
  filters: {
    user: string;
    since: string;
    until: string;
    contentType: string;
    mediaOnly: boolean;
    includeRead: boolean;
  };
  posts: Array<{
    id: string;
    author: string;
    content: string;
    time: string;
    contentType: string;
    mediaCount: number;
    articleUrl?: string | null;
  }>;
  selectedPost?: {
    id: string;
    author: string;
    content: string;
    time: string;
    contentType: string;
    mediaCount: number;
  } | null;
  notifications: Array<{
    id: string;
    actor: string;
    content: string;
    time: string;
    type: string;
  }>;
  warnings?: string[];
}

export interface ConversationExportInput {
  source?: Extract<BusinessExportSourceModule, "conversation" | "conversation_selection">;
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  totalCount: number;
  loadedCount: number;
  messages: Array<{
    id: string;
    sender: string;
    content: string;
    time: string;
    type: string;
  }>;
}

export interface MediaManifestExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  filterSummary?: string[];
  loadedCount?: number;
  visibleCount?: number;
  selectedCount?: number;
  endpointStatusSummary?: string[];
  warnings?: string[];
  attachments: Array<{
    id: string;
    kind: string;
    fileName: string;
    sizeBytes: number;
    time: string;
    available: boolean;
    source?: string;
  }>;
}

export interface AiExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  question: string;
  answer: string;
  requestSnapshot?: AiExportRequestSnapshot | null;
  reason?: string;
  metadata?: Record<string, unknown>;
  evidence: AiExportEvidenceInput[];
}

export interface AiExportRequestSnapshot {
  query?: string;
  scope?: string;
  chat?: string;
  chats?: string[];
  window?: string;
  retrievalDepth?: string;
  sourceLimit?: number;
  topN?: number;
  createdAt?: number;
}

export interface AiExportEvidenceInput {
  chat?: string;
  time?: string;
  text?: string;
  score?: number;
  sender?: string;
  source?: string;
  localId?: number;
  rerankScore?: number;
  reason?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface GraphExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  filterSummary?: string[];
  sourceSummary?: string;
  graphGeneratedAt?: string;
  refreshedAt?: string;
  freshnessState?: string;
  partialWarnings?: string[];
  entities?: Array<{ id: string; label: string; type: string; mentions?: number }>;
  relations?: Array<{
    id: string;
    subject: string;
    predicate: string;
    object: string;
    status: string;
    evidenceCount?: number;
  }>;
  events?: Array<{
    id: string;
    label: string;
    type: string;
    time: string;
    source: string;
    evidenceCount?: number;
  }>;
  facts?: Array<{ id: string; label: string; status: string; evidenceCount?: number }>;
  timelineRows?: Array<{
    id: string;
    time: string;
    type: string;
    title: string;
    description: string;
    source: string;
  }>;
  visualNodes?: Array<{ id: string; label: string; kind: string }>;
  visualEdges?: Array<{ id: string; source: string; target: string; label: string; evidenceCount?: number }>;
  nodes?: Array<{ id: string; label: string; kind: string }>;
  edges?: Array<{ id: string; source: string; target: string; label: string; evidenceCount?: number }>;
}

const SOURCE_LABELS: Record<BusinessExportSourceModule, string> = {
  search: "搜索结果",
  stats: "统计",
  sns: "朋友圈",
  conversation: "当前会话",
  conversation_selection: "选中消息片段",
  media: "媒体清单",
  ai: "AI 问答与证据",
  graph: "图谱",
};

const SOURCE_FILENAME_SLUGS: Record<BusinessExportSourceModule, string> = {
  search: "search",
  stats: "stats",
  sns: "sns",
  conversation: "conversation",
  conversation_selection: "conversation-selection",
  media: "media",
  ai: "ai",
  graph: "graph",
};

const FORMAT_EXTENSIONS: Record<BusinessExportFormat, BusinessExportExtension> = {
  markdown: "md",
  csv: "csv",
  json: "json",
};

const FORMAT_MIME: Record<BusinessExportFormat, string> = {
  markdown: "text/markdown;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
};

export function buildBusinessExportJob(input: BuildBusinessExportJobInput): BusinessExportJob {
  const redactionPolicy = deriveRedactionPolicy(input);
  const status: BusinessExportStatus =
    input.status ?? (redactionPolicy === "blocked" ? "failed" : "confirming");
  return {
    id: createBusinessExportJobId(input.source, input.generatedAt),
    source: input.source,
    sourceLabel: SOURCE_LABELS[input.source],
    format: input.format,
    privacyMode: redactionPolicy === "unredacted-confirmed" ? "unredacted" : "redacted",
    redactionPolicy,
    scopeSummary: sanitizeScopeSummary(input.scopeSummary),
    filenamePreview: createBusinessExportFileName(input.source, input.format, input.generatedAt),
    rowCount: Math.max(0, Math.round(input.rowCount)),
    estimatedBytes: Math.max(0, Math.round(input.estimatedBytes)),
    status,
    error: redactionPolicy === "blocked"
      ? {
          category: "redaction-blocked",
          message: "隐私模式下不能导出未脱敏内容，请使用脱敏导出。",
          retryable: true,
        }
      : null,
    generatedAt: input.generatedAt.toISOString(),
  };
}

export function createSearchExportArtifact(input: SearchExportInput): BusinessExportArtifact {
  const partial = input.loadedCount < input.totalCount;
  const redactContent = shouldRedactExportContent(input);
  const rows = input.messages.map((message) => ({
    time: formatMessageTime(message),
    chat: exportText(message.chat, redactContent, "已隐藏会话"),
    sender: exportText(message.sender, redactContent, "已隐藏发送者"),
    type: message.type || "unknown",
    content: exportText(message.content || "[空消息]", redactContent, "已隐藏消息内容"),
  }));
  const metadata = {
    title: "搜索结果",
    generatedAt: input.generatedAt.toISOString(),
    scope: sanitizeScopeSummary(input.scopeSummary),
    query: exportText(input.query, redactContent, "已隐藏查询"),
    filters: input.filterSummary,
    loadedCount: input.loadedCount,
    totalCount: input.totalCount,
    partial,
  };
  const content = serializeByFormat(input.format, {
    markdown: () => [
      "# 搜索结果",
      "",
      `生成时间: ${metadata.generatedAt}`,
      `范围: ${metadata.scope}`,
      `查询: ${metadata.query}`,
      `筛选: ${metadata.filters.length ? metadata.filters.join("、") : "无"}`,
      `已加载 ${metadata.loadedCount} / 共 ${metadata.totalCount}`,
      partial ? "状态: 当前只导出已加载数据。" : "状态: 已导出当前结果。",
      "",
      "| 时间 | 会话 | 发送者 | 类型 | 内容 |",
      "| --- | --- | --- | --- | --- |",
      ...rows.map((row) =>
        `| ${escapeMarkdownCell(row.time)} | ${escapeMarkdownCell(row.chat)} | ${escapeMarkdownCell(row.sender)} | ${escapeMarkdownCell(row.type)} | ${escapeMarkdownCell(row.content)} |`
      ),
      "",
    ].join("\n"),
    csv: () => toCsv([
      ["time", "chat", "sender", "type", "content"],
      ...rows.map((row) => [row.time, row.chat, row.sender, row.type, row.content]),
    ]),
    json: () => JSON.stringify({ ...metadata, messages: rows }, null, 2),
  });

  return createArtifact({
    source: "search",
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: rows.length,
    content,
    status: partial ? "partial" : "confirming",
    warnings: partial ? ["当前只导出已加载数据。"] : [],
  });
}

export function createStatsExportArtifact(input: StatsExportInput): BusinessExportArtifact {
  const stats = input.stats;
  const topSenders = stats?.topSenders ?? [];
  const redactContent = shouldRedactExportContent(input);
  const controlSummary = input.controlSummary ?? input.visibleRangeLabel ?? stats?.queryRangeLabel ?? "当前范围";
  const metricDefinitions = input.metricDefinitions ?? [];
  const comparisonRows = input.comparison?.rows ?? [];
  const rows = [
    ["metadata", "control", controlSummary],
    ["metadata", "visible_range", input.visibleRangeLabel ?? stats?.queryRangeLabel ?? "当前范围"],
    ["overview", "total", String(stats?.total ?? 0)],
    ["overview", "sent", String(stats?.sentCount ?? 0)],
    ["overview", "received", String(stats?.receivedCount ?? 0)],
    ["overview", "active_senders", String(stats?.activeSenders ?? 0)],
    ["overview", "active_days", String(stats?.activeDays ?? 0)],
    ["overview", "range", stats?.queryRangeLabel ?? "当前范围"],
    ...metricDefinitions.map((definition) => ["definition", definition.label, definition.description]),
    ...comparisonRows.map((row) => ["comparison", row.label, formatExportDelta(row.deltaPercent)]),
    ...(input.comparison?.unavailableReason
      ? [["comparison", "unavailable", input.comparison.unavailableReason]]
      : []),
    ...(input.warnings ?? []).map((warning) => ["warning", "note", warning]),
    ...input.trend.map((point) => ["trend", point.date, String(point.count)]),
    ...topSenders.map((sender) => [
      "top_sender",
      exportText(sender.display || sender.sender, redactContent, "已隐藏对象"),
      String(sender.count),
    ]),
  ];
  const content = input.format === "json"
    ? JSON.stringify({
        title: "统计",
        generatedAt: input.generatedAt.toISOString(),
        scope: sanitizeScopeSummary(input.scopeSummary),
        visibleRangeLabel: input.visibleRangeLabel,
        controlSummary,
        metricDefinitions,
        comparison: input.comparison,
        warnings: input.warnings ?? [],
        stats: {
          ...stats,
          topSenders: topSenders.map((sender) => ({
            label: exportText(sender.display || sender.sender, redactContent, "已隐藏对象"),
            count: sender.count,
          })),
        },
        trend: input.trend,
      }, null, 2)
    : input.format === "csv"
      ? toCsv([["section", "label", "value"], ...rows])
      : [
          "# 统计",
          "",
          `生成时间: ${input.generatedAt.toISOString()}`,
          `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
          `控制: ${controlSummary}`,
          `可见时间: ${input.visibleRangeLabel ?? stats?.queryRangeLabel ?? "当前范围"}`,
          `总消息: ${stats?.total ?? 0}`,
          `发送: ${stats?.sentCount ?? 0}`,
          `接收: ${stats?.receivedCount ?? 0}`,
          "",
          "## 指标说明",
          ...metricDefinitions.map((definition) => `- ${definition.label}: ${definition.description}`),
          "",
          "## 上一周期比较",
          ...(input.comparison?.unavailableReason
            ? [`- ${input.comparison.unavailableReason}`]
            : comparisonRows.map((row) => `- ${row.label}: ${formatExportDelta(row.deltaPercent)}`)),
          "",
          "## 趋势",
          ...input.trend.map((point) => `- ${point.date}: ${point.count}`),
          "",
          "## 活跃对象",
          ...topSenders.map((sender) =>
            `- ${exportText(sender.display || sender.sender, redactContent, "已隐藏对象")}: ${sender.count}`
          ),
          "",
        ].join("\n");

  return createArtifact({
    source: "stats",
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: rows.length,
    content,
    warnings: input.warnings ?? [],
  });
}

export function createSnsExportArtifact(input: SnsExportInput): BusinessExportArtifact {
  const redactContent = shouldRedactExportContent(input);
  const activeLabel = input.activeTabLabel ?? (input.activeTab === "timeline"
    ? "动态"
    : input.activeTab === "search"
      ? "搜索"
      : "通知");
  const appliedFilterSummary = input.appliedFilterSummary ?? [];
  const loadedCount = input.loadedCount ?? input.posts.length + input.notifications.length;
  const visibleCount = input.visibleCount ?? input.posts.length + input.notifications.length;
  const hasExternalArticleUrl = input.posts.some((post) => Boolean(post.articleUrl));
  const selectedDetailRedacted = Boolean(input.selectedPost && redactContent);
  const warnings = Array.from(new Set([
    ...(input.warnings ?? []),
    "当前只导出已加载的朋友圈记录。",
    ...(input.filters.contentType !== "all" || input.filters.mediaOnly
      ? ["类型和仅媒体筛选只作用于已加载记录。"]
      : []),
    ...(selectedDetailRedacted
      ? ["选中动态详情已脱敏；关闭隐私模式并确认未脱敏导出后才会包含原文。"]
      : []),
    ...(hasExternalArticleUrl
      ? ["文章外链不会导出原始 URL。"]
      : []),
  ]));
  const posts = input.posts.map((post) => ({
    time: post.time,
    author: exportText(post.author, redactContent, "已隐藏作者"),
    contentType: post.contentType,
    mediaCount: post.mediaCount,
    content: exportText(post.content, redactContent, "已隐藏朋友圈内容"),
    articleUrl: "",
  }));
  const selectedPost = input.selectedPost
    ? {
        id: input.selectedPost.id,
        time: input.selectedPost.time,
        author: exportText(input.selectedPost.author, redactContent, "已隐藏作者"),
        contentType: input.selectedPost.contentType,
        mediaCount: input.selectedPost.mediaCount,
        content: exportText(input.selectedPost.content, redactContent, "已隐藏朋友圈内容"),
      }
    : null;
  const notifications = input.notifications.map((item) => ({
    time: item.time,
    actor: exportText(item.actor, redactContent, "已隐藏互动者"),
    type: item.type,
    content: exportText(item.content, redactContent, "已隐藏通知内容"),
  }));
  const content = serializeByFormat(input.format, {
    markdown: () => [
      "# 朋友圈当前视图",
      "",
      `生成时间: ${input.generatedAt.toISOString()}`,
      `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
      `当前视图: ${activeLabel}`,
      `已加载 ${loadedCount.toLocaleString()} 条`,
      `当前可见 ${visibleCount.toLocaleString()} 条`,
      `查询: ${input.searchQuery?.trim() ? exportText(input.searchQuery.trim(), redactContent, "已隐藏查询") : "无"}`,
      `筛选: ${appliedFilterSummary.length ? appliedFilterSummary.join("、") : "无"}`,
      `作者: ${exportText(input.filters.user || "全部", redactContent, input.filters.user ? "已隐藏作者筛选" : "全部")}`,
      `日期: ${input.filters.since || "不限"} 至 ${input.filters.until || "不限"}`,
      `类型: ${input.filters.contentType}`,
      `仅媒体: ${input.filters.mediaOnly ? "是" : "否"}`,
      `包含已读通知: ${input.filters.includeRead ? "是" : "否"}`,
      warnings.length ? `提示: ${warnings.join("；")}` : "",
      "",
      "## 选中动态",
      selectedPost
        ? `- ${selectedPost.time} · ${selectedPost.author} · ${selectedPost.contentType} · 媒体 ${selectedPost.mediaCount} · ${selectedPost.content}`
        : "- 未选中动态",
      "",
      "## 动态",
      ...posts.map((post) => `- ${post.time} · ${post.author} · ${post.contentType} · 媒体 ${post.mediaCount} · ${post.content}`),
      "",
      "## 通知",
      ...notifications.map((item) => `- ${item.time} · ${item.actor} · ${item.type} · ${item.content}`),
      "",
    ].join("\n"),
    csv: () => toCsv([
      ["kind", "time", "actor", "type", "content", "mediaCount"],
      ["metadata", input.generatedAt.toISOString(), activeLabel, "loaded", String(loadedCount), String(visibleCount)],
      ...(input.searchQuery?.trim()
        ? [["metadata", "", exportText(input.searchQuery.trim(), redactContent, "已隐藏查询"), "query", "", ""]]
        : []),
      ...appliedFilterSummary.map((item) => ["filter", "", item, "", "", ""]),
      ...warnings.map((warning) => ["warning", "", warning, "", "", ""]),
      ...(selectedPost
        ? [["selected_post", selectedPost.time, selectedPost.author, selectedPost.contentType, selectedPost.content, String(selectedPost.mediaCount)]]
        : []),
      ...posts.map((post) => ["post", post.time, post.author, post.contentType, post.content, String(post.mediaCount)]),
      ...notifications.map((item) => ["notification", item.time, item.actor, item.type, item.content, "0"]),
    ]),
    json: () => JSON.stringify({
      title: "朋友圈当前视图",
      generatedAt: input.generatedAt.toISOString(),
      activeTab: input.activeTab,
      activeTabLabel: activeLabel,
      loadedCount,
      visibleCount,
      searchQuery: exportText(input.searchQuery ?? "", redactContent, input.searchQuery ? "已隐藏查询" : ""),
      appliedFilterSummary,
      warnings,
      filters: {
        ...input.filters,
        user: exportText(input.filters.user, redactContent, input.filters.user ? "已隐藏作者筛选" : ""),
      },
      selectedPost,
      posts,
      notifications,
    }, null, 2),
  });

  return createArtifact({
    source: "sns",
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: posts.length + notifications.length,
    content,
    warnings,
  });
}

export function createConversationExportArtifact(input: ConversationExportInput): BusinessExportArtifact {
  const source = input.source ?? "conversation";
  const title = source === "conversation_selection" ? "选中消息片段" : "当前会话";
  const partial = input.loadedCount < input.totalCount;
  const redactContent = shouldRedactExportContent(input);
  const messages = input.messages.map((message) => ({
    id: message.id,
    time: message.time,
    type: message.type,
    sender: exportText(message.sender, redactContent, "已隐藏发送者"),
    content: exportText(message.content, redactContent, "已隐藏消息内容"),
  }));
  const content = input.format === "json"
    ? JSON.stringify({
        title,
        generatedAt: input.generatedAt.toISOString(),
        scope: sanitizeScopeSummary(input.scopeSummary),
        loadedCount: input.loadedCount,
        totalCount: input.totalCount,
        partial,
        messages,
      }, null, 2)
    : [
        `# ${title}`,
        "",
        `生成时间: ${input.generatedAt.toISOString()}`,
        `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
        `已加载 ${input.loadedCount} / 共 ${input.totalCount}`,
        partial ? "状态: 当前只导出已加载消息。" : "状态: 已导出当前消息。",
        "",
        ...messages.map((message) => `- ${message.time} · ${message.sender} · ${message.type}: ${message.content}`),
        "",
      ].join("\n");

  return createArtifact({
    source,
    format: input.format === "csv" ? "markdown" : input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: messages.length,
    content,
    status: partial ? "partial" : "confirming",
    warnings: partial ? ["当前只导出已加载消息。"] : [],
  });
}

export function createMediaManifestExportArtifact(input: MediaManifestExportInput): BusinessExportArtifact {
  const redactContent = shouldRedactExportContent(input);
  const filterSummary = input.filterSummary ?? ["媒体筛选：无"];
  const loadedCount = input.loadedCount ?? input.attachments.length;
  const visibleCount = input.visibleCount ?? input.attachments.length;
  const selectedCount = input.selectedCount ?? 0;
  const warnings = Array.from(new Set([
    "当前只导出已加载媒体记录。",
    ...(selectedCount > 0 ? ["当前导出已选媒体记录。"] : ["当前导出筛选后可见媒体记录。"]),
    ...(input.warnings ?? []),
    ...(input.endpointStatusSummary ?? []),
  ]));
  const rows = input.attachments.map((attachment) => ({
    kind: attachment.kind,
    source: attachment.source ?? "",
    fileName: exportFileName(attachment.fileName, redactContent),
    sizeBytes: attachment.sizeBytes,
    time: attachment.time,
    available: attachment.available,
  }));
  const content = input.format === "json"
    ? JSON.stringify({
        title: "媒体清单",
        generatedAt: input.generatedAt.toISOString(),
        scope: sanitizeScopeSummary(input.scopeSummary),
        filters: filterSummary,
        loadedCount,
        visibleCount,
        selectedCount,
        warnings,
        attachments: rows,
      }, null, 2)
    : input.format === "csv"
      ? toCsv([
          ["kind", "source", "fileName", "sizeBytes", "time", "available"],
          ...rows.map((row) => [row.kind, row.source, row.fileName, String(row.sizeBytes), row.time, String(row.available)]),
        ])
      : [
          "# 媒体清单",
          "",
          `生成时间: ${input.generatedAt.toISOString()}`,
          `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
          `筛选: ${filterSummary.join("、")}`,
          `已加载 ${loadedCount.toLocaleString()} 项，当前可见 ${visibleCount.toLocaleString()} 项，已选 ${selectedCount.toLocaleString()} 项`,
          warnings.length ? `提示: ${warnings.join("；")}` : "",
          ...rows.map((row) => `- ${row.time} · ${row.source} · ${row.kind} · ${row.fileName} · ${row.sizeBytes} B · ${row.available ? "可用" : "不可用"}`),
          "",
        ].join("\n");

  return createArtifact({
    source: "media",
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: rows.length,
    content,
    warnings,
  });
}

export function createAiExportArtifact(input: AiExportInput): BusinessExportArtifact {
  const redactContent = shouldRedactExportContent(input);
  const request = input.requestSnapshot ?? {};
  const metadata = input.metadata ?? {};
  const requestWindow = firstString(request.window, metadata.window);
  const requestDepth = firstString(request.retrievalDepth, metadata.retrievalDepth, metadata.depth);
  const requestSourceLimit = firstNumber(request.sourceLimit, metadata.sourceLimit, metadata.source_limit);
  const requestTopN = firstNumber(request.topN, metadata.topN, metadata.top_n);
  const evidence = input.evidence.map((item, index) => {
    const metadataRecord = asExportRecord(item.metadata);
    const chat = firstString(
      item.chat,
      item.talker_name,
      item.chat_name,
      item.talker,
    );
    const sender = firstString(item.sender, item.sender_name);
    const source = firstString(item.source, item.chunk_type, metadataRecord.chunk_type, "message");
    const text = firstString(item.text, item.content, item.snippet, item.summary);
    const localId = firstNumber(item.localId, item.local_id, item.seq);
    const score = firstNumber(item.score);
    const rerankScore = firstNumber(item.rerankScore, item.rerank_score);
    const reason = firstString(item.reason, metadataRecord.reason);
    return {
      index: index + 1,
      chat: exportText(chat, redactContent, "已隐藏会话"),
      sender: exportText(sender, redactContent, "已隐藏发送者"),
      time: firstString(item.time, item.created_at, item.timestamp),
      text: exportText(text, redactContent, "已隐藏证据内容"),
      source,
      localId,
      score,
      rerankScore,
      reason: reason ? exportText(reason, redactContent, "已隐藏证据说明") : "",
    };
  });
  const content = [
    "# AI 问答与证据",
    "",
    `生成时间: ${input.generatedAt.toISOString()}`,
    `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
    `检索窗口: ${requestWindow || "未指定"}`,
    `检索深度: ${requestDepth || "standard"}`,
    `来源上限: ${formatExportOptionalNumber(requestSourceLimit)}`,
    `Top N: ${formatExportOptionalNumber(requestTopN)}`,
    `问题: ${exportText(input.question, redactContent, "已隐藏问题")}`,
    `答案: ${exportText(input.answer, redactContent, "已隐藏回答内容")}`,
    input.reason ? `检索说明: ${exportText(input.reason, redactContent, "已隐藏推理摘要")}` : "",
    `证据数量: ${evidence.length}`,
    "",
    "## 证据",
    ...evidence.map((item) => [
      `- 证据 ${item.index}`,
      item.time || "未知时间",
      item.chat,
      item.sender,
      item.source,
      item.localId === null ? "" : `localId ${item.localId}`,
      item.score === null ? "score 未知" : `score ${item.score}`,
      item.rerankScore === null ? "" : `rerank ${item.rerankScore}`,
      item.reason,
      item.text,
    ].filter(Boolean).join(" · ")),
    "",
  ].join("\n");

  return createArtifact({
    source: "ai",
    format: "markdown",
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: evidence.length,
    content,
  });
}

export function createGraphExportArtifact(input: GraphExportInput): BusinessExportArtifact {
  const redactContent = shouldRedactExportContent(input);
  const visualNodes = (input.visualNodes ?? input.nodes ?? []).map((node) => ({
    id: node.id,
    label: exportText(node.label, redactContent, "已隐藏实体"),
    kind: node.kind,
  }));
  const visualEdges = (input.visualEdges ?? input.edges ?? []).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: exportText(edge.label, redactContent, "已隐藏关系"),
    evidenceCount: edge.evidenceCount ?? 0,
  }));
  const entities = (input.entities ?? []).map((entity) => ({
    id: entity.id,
    label: exportText(entity.label, redactContent, "已隐藏实体"),
    type: entity.type,
    mentions: entity.mentions ?? 0,
  }));
  const relations = (input.relations ?? []).map((relation) => ({
    id: relation.id,
    subject: exportText(relation.subject, redactContent, "已隐藏主体"),
    predicate: exportText(relation.predicate, redactContent, "已隐藏关系"),
    object: exportText(relation.object, redactContent, "已隐藏客体"),
    status: relation.status,
    evidenceCount: relation.evidenceCount ?? 0,
  }));
  const events = (input.events ?? []).map((event) => ({
    id: event.id,
    label: exportText(event.label, redactContent, "已隐藏事件"),
    type: event.type,
    time: event.time,
    source: exportText(event.source, redactContent, "已隐藏来源"),
    evidenceCount: event.evidenceCount ?? 0,
  }));
  const facts = (input.facts ?? []).map((fact) => ({
    id: fact.id,
    label: exportText(fact.label, redactContent, "已隐藏事实"),
    status: fact.status,
    evidenceCount: fact.evidenceCount ?? 0,
  }));
  const timelineRows = (input.timelineRows ?? []).map((row) => ({
    id: row.id,
    time: row.time,
    type: row.type,
    title: exportText(row.title, redactContent, "已隐藏时间线标题"),
    description: exportText(row.description, redactContent, "已隐藏时间线描述"),
    source: exportText(row.source, redactContent, "已隐藏来源"),
  }));
  const filterSummary = input.filterSummary ?? [];
  const warnings = input.partialWarnings ?? [];
  const rowCount = entities.length + relations.length + events.length + facts.length + timelineRows.length + visualNodes.length + visualEdges.length;
  const metadata = {
    title: "图谱",
    generatedAt: input.generatedAt.toISOString(),
    scope: sanitizeScopeSummary(input.scopeSummary),
    source: input.sourceSummary ?? "来源：图谱当前视图",
    filters: filterSummary,
    rowCount,
  };
  const freshness = {
    state: input.freshnessState ?? (rowCount > 0 ? "fresh" : "empty"),
    graphGeneratedAt: input.graphGeneratedAt ?? "",
    refreshedAt: input.refreshedAt ?? "",
    warnings,
  };
  const content = input.format === "csv"
    ? toCsv([
        ["kind", "id", "time", "source", "target", "label", "type", "status", "evidence_count"],
        ...entities.map((entity) => ["entity", entity.id, "", "", "", entity.label, entity.type, "", String(entity.mentions)]),
        ...relations.map((relation) => [
          "relation",
          relation.id,
          "",
          relation.subject,
          relation.object,
          relation.predicate,
          "relation",
          relation.status,
          String(relation.evidenceCount),
        ]),
        ...events.map((event) => ["event", event.id, event.time, event.source, "", event.label, event.type, "", String(event.evidenceCount)]),
        ...facts.map((fact) => ["fact", fact.id, "", "", "", fact.label, "fact", fact.status, String(fact.evidenceCount)]),
        ...timelineRows.map((row) => ["timeline", row.id, row.time, row.source, "", row.title, row.type, "", ""]),
        ...visualNodes.map((node) => ["visual_node", node.id, "", "", "", node.label, node.kind, "", ""]),
        ...visualEdges.map((edge) => ["visual_edge", edge.id, "", edge.source, edge.target, edge.label, "relation", "", String(edge.evidenceCount)]),
      ])
    : input.format === "markdown"
      ? [
          "# 图谱",
          "",
          `生成时间: ${input.generatedAt.toISOString()}`,
          `范围: ${metadata.scope}`,
          `来源: ${metadata.source}`,
          `筛选: ${filterSummary.length ? filterSummary.join("、") : "无"}`,
          `图谱生成: ${freshness.graphGeneratedAt || "未生成"}`,
          `刷新: ${freshness.refreshedAt || "待刷新"}`,
          `新鲜度: ${freshness.state}`,
          `节点: ${visualNodes.length}`,
          `关系: ${visualEdges.length}`,
          warnings.length ? `提示: ${warnings.join("；")}` : "",
          "",
          "## 实体",
          ...(entities.length ? entities.map((entity) => `- ${entity.type}: ${entity.label} · 提及 ${entity.mentions}`) : ["- 无"]),
          "",
          "## 关系",
          ...(relations.length ? relations.map((relation) =>
            `- ${relation.subject} -> ${relation.object}: ${relation.predicate} · ${relation.status} · 证据 ${relation.evidenceCount}`
          ) : ["- 无"]),
          "",
          "## 事件",
          ...(events.length ? events.map((event) =>
            `- ${event.time} · ${event.type}: ${event.label} · ${event.source} · 证据 ${event.evidenceCount}`
          ) : ["- 无"]),
          "",
          "## 事实",
          ...(facts.length ? facts.map((fact) => `- ${fact.status}: ${fact.label} · 证据 ${fact.evidenceCount}`) : ["- 无"]),
          "",
          "## 时间线",
          ...(timelineRows.length ? timelineRows.map((row) =>
            `- ${row.time} · ${row.type}: ${row.title} · ${row.description} · ${row.source}`
          ) : ["- 无"]),
          "",
          "## 可视化节点",
          ...(visualNodes.length ? visualNodes.map((node) => `- ${node.kind}: ${node.label}`) : ["- 无"]),
          "",
          "## 可视化关系",
          ...(visualEdges.length ? visualEdges.map((edge) => `- ${edge.source} -> ${edge.target}: ${edge.label}`) : ["- 无"]),
          "",
        ].join("\n")
      : JSON.stringify({
          metadata,
          freshness,
          entities,
          relations,
          events,
          facts,
          timeline: timelineRows,
          nodes: visualNodes,
          edges: visualEdges,
          visualNodes,
          visualEdges,
        }, null, 2);

  return createArtifact({
    source: "graph",
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount,
    content,
    status: freshness.state === "partial" ? "partial" : "confirming",
    warnings,
  });
}

export function validateBusinessExportArtifact(artifact: BusinessExportArtifact): {
  ok: boolean;
  error: BusinessExportError | null;
} {
  if (artifact.redactionPolicy === "blocked" || containsForbiddenExportMarker(artifact.content)) {
    return {
      ok: false,
      error: {
        category: "redaction-blocked",
        message: "导出内容仍包含密钥、本机路径或原始私密标记，已阻止写入。",
        retryable: true,
      },
    };
  }
  return { ok: true, error: null };
}

export function getBusinessExportExtension(format: BusinessExportFormat): BusinessExportExtension {
  return FORMAT_EXTENSIONS[format];
}

function createArtifact(input: {
  source: BusinessExportSourceModule;
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  rowCount: number;
  content: string;
  status?: BusinessExportStatus;
  warnings?: string[];
}): BusinessExportArtifact {
  const estimatedBytes = measureUtf8Bytes(input.content);
  const job = buildBusinessExportJob({
    source: input.source,
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    rowCount: input.rowCount,
    estimatedBytes,
    scopeSummary: input.scopeSummary,
    generatedAt: input.generatedAt,
    status: input.status,
  });

  return {
    job,
    source: input.source,
    format: input.format,
    fileName: job.filenamePreview,
    extension: FORMAT_EXTENSIONS[input.format],
    mimeType: FORMAT_MIME[input.format],
    content: input.content,
    rowCount: job.rowCount,
    estimatedBytes,
    privacyMode: job.privacyMode,
    redactionPolicy: job.redactionPolicy,
    status: job.status,
    warnings: input.warnings ?? [],
  };
}

function deriveRedactionPolicy(input: Pick<BuildBusinessExportJobInput, "privacyOn" | "requestedUnredacted" | "unredactedConfirmed">): BusinessExportRedactionPolicy {
  if (!input.requestedUnredacted) return "redacted";
  if (input.privacyOn) return "blocked";
  return input.unredactedConfirmed ? "unredacted-confirmed" : "blocked";
}

function shouldRedactExportContent(
  input: Pick<BuildBusinessExportJobInput, "privacyOn" | "requestedUnredacted" | "unredactedConfirmed">,
): boolean {
  return deriveRedactionPolicy(input) !== "unredacted-confirmed";
}

function createBusinessExportJobId(source: BusinessExportSourceModule, generatedAt: Date): string {
  return `business-export-${source}-${formatTimestampForFileName(generatedAt)}`;
}

function createBusinessExportFileName(
  source: BusinessExportSourceModule,
  format: BusinessExportFormat,
  generatedAt: Date,
): string {
  return `chatlog-${SOURCE_FILENAME_SLUGS[source]}-${formatTimestampForFileName(generatedAt)}.${FORMAT_EXTENSIONS[format]}`;
}

function formatTimestampForFileName(value: Date): string {
  const year = value.getUTCFullYear().toString().padStart(4, "0");
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");
  const hour = value.getUTCHours().toString().padStart(2, "0");
  const minute = value.getUTCMinutes().toString().padStart(2, "0");
  const second = value.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

function sanitizeScopeSummary(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "当前范围";
  if (!containsUnsafeDisplayText(trimmed)) return trimmed;
  const firstSafePart = trimmed
    .split("·")
    .map((part) => part.trim())
    .find((part) => part && !containsUnsafeDisplayText(part));
  return firstSafePart ? `${firstSafePart} · 已隐藏私密范围` : "已隐藏私密范围";
}

function exportText(value: string, privacyOn: boolean, redactedLabel: string): string {
  if (privacyOn) return redactedLabel;
  return value || "";
}

function exportFileName(value: string, privacyOn: boolean): string {
  if (privacyOn) return "已隐藏文件名";
  const fileName = value.split(/[\\/]/).filter(Boolean).pop() ?? value;
  return containsUnsafeDisplayText(value) || containsUnsafeDisplayText(fileName)
    ? "已隐藏文件名"
    : fileName;
}

function serializeByFormat(format: BusinessExportFormat, serializers: Record<BusinessExportFormat, () => string>): string {
  return serializers[format]();
}

function toCsv(rows: Array<Array<string | number | boolean>>): string {
  return rows
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\n");
}

function escapeCsvCell(value: string): string {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeMarkdownCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatMessageTime(message: SearchExportMessage): string {
  if (message.time) return message.time;
  const timestamp = message.timestamp ?? 0;
  const date = new Date(timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatExportDelta(deltaPercent: number | null): string {
  if (deltaPercent === null || !Number.isFinite(deltaPercent)) return "无法计算";
  const rounded = Math.round(deltaPercent);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function asExportRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function formatExportOptionalNumber(value: number | null): string {
  return value === null ? "未指定" : String(value);
}

function measureUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function containsForbiddenExportMarker(value: string): boolean {
  if (containsUnsafeDisplayText(value)) return true;
  return [
    /\bdata[_-]?key\b/i,
    /\bapi[_-]?key\b/i,
    /\btoken\b/i,
    /\bsecret\b/i,
    /\bbearer\s+/i,
    /\bsk-[A-Za-z0-9_-]+/i,
    /wxid_[A-Za-z0-9_-]+/i,
    /[A-Z]:[\\/]+Users[\\/]+/i,
    new RegExp(["WeChat", "Files"].join("\\s+"), "i"),
  ].some((pattern) => pattern.test(value));
}
