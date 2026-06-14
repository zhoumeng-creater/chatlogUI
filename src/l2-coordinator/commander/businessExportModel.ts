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
  scopeSummary: string;
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
  notifications: Array<{
    id: string;
    actor: string;
    content: string;
    time: string;
    type: string;
  }>;
}

export interface ConversationExportInput {
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
  attachments: Array<{
    id: string;
    kind: string;
    fileName: string;
    sizeBytes: number;
    time: string;
    available: boolean;
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
  evidence: Array<{
    chat: string;
    time: string;
    text: string;
    score?: number;
  }>;
}

export interface GraphExportInput {
  format: BusinessExportFormat;
  privacyOn: boolean;
  requestedUnredacted?: boolean;
  unredactedConfirmed?: boolean;
  generatedAt: Date;
  scopeSummary: string;
  nodes: Array<{ id: string; label: string; kind: string }>;
  edges: Array<{ id: string; source: string; target: string; label: string }>;
}

const SOURCE_LABELS: Record<BusinessExportSourceModule, string> = {
  search: "搜索结果",
  stats: "统计",
  sns: "朋友圈",
  conversation: "当前会话",
  media: "媒体清单",
  ai: "AI 问答与证据",
  graph: "图谱",
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
  const rows = [
    ["overview", "total", String(stats?.total ?? 0)],
    ["overview", "sent", String(stats?.sentCount ?? 0)],
    ["overview", "received", String(stats?.receivedCount ?? 0)],
    ["overview", "active_senders", String(stats?.activeSenders ?? 0)],
    ["overview", "active_days", String(stats?.activeDays ?? 0)],
    ["overview", "range", stats?.queryRangeLabel ?? "当前范围"],
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
          `总消息: ${stats?.total ?? 0}`,
          `发送: ${stats?.sentCount ?? 0}`,
          `接收: ${stats?.receivedCount ?? 0}`,
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
  });
}

export function createSnsExportArtifact(input: SnsExportInput): BusinessExportArtifact {
  const redactContent = shouldRedactExportContent(input);
  const activeLabel = input.activeTab === "timeline"
    ? "动态"
    : input.activeTab === "search"
      ? "搜索"
      : "通知";
  const posts = input.posts.map((post) => ({
    time: post.time,
    author: exportText(post.author, redactContent, "已隐藏作者"),
    contentType: post.contentType,
    mediaCount: post.mediaCount,
    content: exportText(post.content, redactContent, "已隐藏朋友圈内容"),
    articleUrl: redactContent ? "" : (post.articleUrl ?? ""),
  }));
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
      `作者: ${exportText(input.filters.user || "全部", redactContent, input.filters.user ? "已隐藏作者筛选" : "全部")}`,
      `日期: ${input.filters.since || "不限"} 至 ${input.filters.until || "不限"}`,
      `类型: ${input.filters.contentType}`,
      `仅媒体: ${input.filters.mediaOnly ? "是" : "否"}`,
      `包含已读通知: ${input.filters.includeRead ? "是" : "否"}`,
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
      ...posts.map((post) => ["post", post.time, post.author, post.contentType, post.content, String(post.mediaCount)]),
      ...notifications.map((item) => ["notification", item.time, item.actor, item.type, item.content, "0"]),
    ]),
    json: () => JSON.stringify({
      title: "朋友圈当前视图",
      generatedAt: input.generatedAt.toISOString(),
      activeTab: input.activeTab,
      filters: {
        ...input.filters,
        user: exportText(input.filters.user, redactContent, input.filters.user ? "已隐藏作者筛选" : ""),
      },
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
  });
}

export function createConversationExportArtifact(input: ConversationExportInput): BusinessExportArtifact {
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
        title: "当前会话",
        generatedAt: input.generatedAt.toISOString(),
        scope: sanitizeScopeSummary(input.scopeSummary),
        loadedCount: input.loadedCount,
        totalCount: input.totalCount,
        partial,
        messages,
      }, null, 2)
    : [
        "# 当前会话",
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
    source: "conversation",
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
  const rows = input.attachments.map((attachment) => ({
    kind: attachment.kind,
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
        attachments: rows,
      }, null, 2)
    : input.format === "csv"
      ? toCsv([
          ["kind", "fileName", "sizeBytes", "time", "available"],
          ...rows.map((row) => [row.kind, row.fileName, String(row.sizeBytes), row.time, String(row.available)]),
        ])
      : [
          "# 媒体清单",
          "",
          `生成时间: ${input.generatedAt.toISOString()}`,
          `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
          ...rows.map((row) => `- ${row.time} · ${row.kind} · ${row.fileName} · ${row.sizeBytes} B · ${row.available ? "可用" : "不可用"}`),
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
  });
}

export function createAiExportArtifact(input: AiExportInput): BusinessExportArtifact {
  const redactContent = shouldRedactExportContent(input);
  const evidence = input.evidence.map((item, index) => ({
    index: index + 1,
    chat: exportText(item.chat, redactContent, "已隐藏会话"),
    time: item.time,
    text: exportText(item.text, redactContent, "已隐藏证据内容"),
    score: item.score,
  }));
  const content = [
    "# AI 问答与证据",
    "",
    `生成时间: ${input.generatedAt.toISOString()}`,
    `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
    `问题: ${exportText(input.question, redactContent, "已隐藏问题")}`,
    `答案: ${exportText(input.answer, redactContent, "已隐藏回答内容")}`,
    `证据数量: ${evidence.length}`,
    "",
    "## 证据",
    ...evidence.map((item) => `- ${item.index}. ${item.time} · ${item.chat} · 相似度 ${item.score ?? "未知"} · ${item.text}`),
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
  const nodes = input.nodes.map((node) => ({
    id: node.id,
    label: exportText(node.label, redactContent, "已隐藏实体"),
    kind: node.kind,
  }));
  const edges = input.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: exportText(edge.label, redactContent, "已隐藏关系"),
  }));
  const content = input.format === "csv"
    ? toCsv([
        ["kind", "id", "source", "target", "label", "type"],
        ...nodes.map((node) => ["node", node.id, "", "", node.label, node.kind]),
        ...edges.map((edge) => ["edge", edge.id, edge.source, edge.target, edge.label, "relation"]),
      ])
    : input.format === "markdown"
      ? [
          "# 图谱",
          "",
          `生成时间: ${input.generatedAt.toISOString()}`,
          `范围: ${sanitizeScopeSummary(input.scopeSummary)}`,
          `节点: ${nodes.length}`,
          `关系: ${edges.length}`,
          "",
          "## 节点",
          ...nodes.map((node) => `- ${node.kind}: ${node.label}`),
          "",
          "## 关系",
          ...edges.map((edge) => `- ${edge.source} -> ${edge.target}: ${edge.label}`),
          "",
        ].join("\n")
      : JSON.stringify({
          title: "图谱",
          generatedAt: input.generatedAt.toISOString(),
          scope: sanitizeScopeSummary(input.scopeSummary),
          nodes,
          edges,
        }, null, 2);

  return createArtifact({
    source: "graph",
    format: input.format,
    privacyOn: input.privacyOn,
    requestedUnredacted: input.requestedUnredacted,
    unredactedConfirmed: input.unredactedConfirmed,
    generatedAt: input.generatedAt,
    scopeSummary: input.scopeSummary,
    rowCount: nodes.length + edges.length,
    content,
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
  return `chatlog-${source}-${formatTimestampForFileName(generatedAt)}.${FORMAT_EXTENSIONS[format]}`;
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
