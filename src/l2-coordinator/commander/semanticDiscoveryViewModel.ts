import type {
  ContactProfileData,
  SemanticDiscoveryWindow,
  SemanticSearchDepth,
  SemanticSearchScope,
  TopicsResponse,
} from "@/l2-coordinator/api-docs/semantic";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import {
  buildConversationOptions,
  SEMANTIC_DISCOVERY_DEPTHS,
  SEMANTIC_DISCOVERY_WINDOWS,
  type SemanticDiscoveryOption,
} from "./semanticDiscoveryRequestModel";

export interface SemanticDiscoveryContextView {
  currentLabel: string;
  scopeLabel: string;
  windowLabel: string;
  depthLabel: string;
  sourceLimitLabel: string;
  rerankLabel: string;
}

export interface SemanticDiscoveryTopicRowView {
  label: string;
  count: number;
  countLabel: string;
  keywords: string[];
}

export interface SemanticDiscoveryDailyView {
  date: string;
  count: number;
  percent: number;
}

export interface SemanticDiscoveryTopicsView {
  title: string;
  windowLabel: string;
  countLabel: string;
  truncatedLabel: string | null;
  rows: SemanticDiscoveryTopicRowView[];
  daily: SemanticDiscoveryDailyView[];
  summary: string;
  summaryError: string;
}

export interface SemanticDiscoveryProfileRowView {
  senderId: string;
  senderLabel: string;
  messagesLabel: string;
  keywords: string[];
  canAskAboutSender: boolean;
}

export interface SemanticDiscoveryProfileView {
  title: string;
  windowLabel: string;
  countLabel: string;
  truncatedLabel: string | null;
  rows: SemanticDiscoveryProfileRowView[];
  typeRows: string[];
  summary: string;
  summaryError: string;
}

export interface SemanticDiscoveryView {
  context: SemanticDiscoveryContextView;
  windowOptions: SemanticDiscoveryOption[];
  depthOptions: SemanticDiscoveryOption[];
  conversationOptions: SemanticDiscoveryOption[];
  previewTalkerOptions: SemanticDiscoveryOption[];
  topics: SemanticDiscoveryTopicsView | null;
  profile: SemanticDiscoveryProfileView | null;
}

export interface BuildSemanticDiscoveryViewInput {
  conversations: Conversation[];
  currentChat?: string | null;
  currentContactName?: string | null;
  privacyOn: boolean;
  window: SemanticDiscoveryWindow;
  scope: SemanticSearchScope;
  selectedChats: string[];
  depth: SemanticSearchDepth;
  sourceLimit: number;
  rerank: boolean;
  topics: TopicsResponse | null;
  profile: ContactProfileData | null;
}

export function buildSemanticDiscoveryView(input: BuildSemanticDiscoveryViewInput): SemanticDiscoveryView {
  const conversationOptions = buildConversationOptions(input.conversations).map((option) => ({
    ...option,
    label: mask(option.label, input.privacyOn, "未知会话"),
  }));
  const currentLabel = mask(input.currentContactName || input.currentChat || "未选择会话", input.privacyOn, "未选择会话");

  return {
    context: {
      currentLabel,
      scopeLabel: scopeLabel(input.scope, input.selectedChats.length),
      windowLabel: optionLabel(SEMANTIC_DISCOVERY_WINDOWS, input.window),
      depthLabel: optionLabel(SEMANTIC_DISCOVERY_DEPTHS, input.depth),
      sourceLimitLabel: `${input.sourceLimit} 条来源`,
      rerankLabel: input.rerank ? "重排开启" : "重排关闭",
    },
    windowOptions: SEMANTIC_DISCOVERY_WINDOWS,
    depthOptions: SEMANTIC_DISCOVERY_DEPTHS,
    conversationOptions,
    previewTalkerOptions: [
      { value: "all", label: "全部会话" },
      ...conversationOptions,
    ],
    topics: input.topics ? topicsView(input.topics, input.privacyOn) : null,
    profile: input.profile ? profileView(input.profile, input.privacyOn) : null,
  };
}

function topicsView(topics: TopicsResponse, privacyOn: boolean): SemanticDiscoveryTopicsView {
  const maxDaily = Math.max(...(topics.daily ?? []).map((entry) => entry.count), 1);

  return {
    title: "话题趋势",
    windowLabel: topics.windowLabel || optionLabel(SEMANTIC_DISCOVERY_WINDOWS, topics.window || ""),
    countLabel: `${(topics.count ?? 0).toLocaleString()} 条消息`,
    truncatedLabel: topics.truncated ? "已截断" : null,
    rows: (topics.topics ?? []).map((topic) => ({
      label: mask(topic.topic, privacyOn, "未知话题"),
      count: topic.count,
      countLabel: topic.count.toLocaleString(),
      keywords: (topic.keywords ?? []).map((keyword) => mask(keyword, privacyOn)),
    })),
    daily: (topics.daily ?? []).map((entry) => ({
      date: entry.date,
      count: entry.count,
      percent: Math.max(2, Math.min(100, (entry.count / maxDaily) * 100)),
    })),
    summary: mask(topics.summary, privacyOn),
    summaryError: topics.summaryError ?? "",
  };
}

function profileView(profile: ContactProfileData, privacyOn: boolean): SemanticDiscoveryProfileView {
  return {
    title: "联系人画像",
    windowLabel: profile.windowLabel || optionLabel(SEMANTIC_DISCOVERY_WINDOWS, profile.window || ""),
    countLabel: `${(profile.count ?? 0).toLocaleString()} 条消息`,
    truncatedLabel: profile.truncated ? "已截断" : null,
    rows: (profile.profiles ?? []).map((row) => ({
      senderId: row.sender,
      senderLabel: mask(row.senderName || row.sender, privacyOn, "未知联系人"),
      messagesLabel: `${row.messages.toLocaleString()} 条`,
      keywords: row.topKeywords.map((keyword) =>
        `${mask(keyword.topic, privacyOn)} (${keyword.count.toLocaleString()})`,
      ),
      canAskAboutSender: Boolean(row.sender),
    })),
    typeRows: (profile.typeDistribution ?? []).map((entry) => `${entry.type}: ${entry.count.toLocaleString()}`),
    summary: mask(profile.summary, privacyOn),
    summaryError: profile.summaryError ?? "",
  };
}

function scopeLabel(scope: SemanticSearchScope, selectedCount: number): string {
  if (scope === "contact") return "当前会话";
  if (scope === "selected") return selectedCount > 0 ? `${selectedCount} 个会话` : "自选会话";
  return "全部会话";
}

function optionLabel(options: SemanticDiscoveryOption[], value: string): string {
  return options.find((option) => option.value === value)?.label || value || "默认";
}

function mask(value: string | undefined | null, privacyOn: boolean, fallback = ""): string {
  const text = (value ?? "").trim() || fallback;
  return privacyOn ? text.replace(/[^\s]/g, "*") : text;
}
