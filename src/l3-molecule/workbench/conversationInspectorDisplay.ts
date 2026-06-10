export type ConversationInspectorState = "empty" | "summary";
export type ConversationInspectorSectionStatus = "ready" | "loading" | "error";

export interface ConversationInspectorConversation {
  displayName?: string | null;
  typeLabel?: string | null;
}

export interface ConversationInspectorStats {
  messageCount?: number;
  total?: number;
  activeSenders?: number;
  mediaCount?: number;
  activeDays?: number;
  queryRangeLabel?: string;
}

export interface ConversationInspectorInput {
  conversation: ConversationInspectorConversation | null;
  currentChat: string;
  stats: ConversationInspectorStats | null;
  statsLoading: boolean;
  statsError: string | null;
  mediaCount: number;
  semanticLabel: string | null;
  graphLabel: string | null;
  privacyOn: boolean;
}

export interface ConversationInspectorItem {
  label: string;
  value: string;
}

export interface ConversationInspectorSection {
  title: string;
  status: ConversationInspectorSectionStatus;
  body?: string;
  items: ConversationInspectorItem[];
}

export interface ConversationInspectorView {
  title: string;
  state: ConversationInspectorState;
  heading: string;
  body: string;
  sections: ConversationInspectorSection[];
}

export function deriveConversationInspectorView(
  input: ConversationInspectorInput,
): ConversationInspectorView {
  if (!input.conversation) {
    return {
      title: "会话详情",
      state: "empty",
      heading: "选择会话",
      body: "打开会话后显示上下文摘要和相关入口。",
      sections: [],
    };
  }

  const heading = input.privacyOn
    ? "已隐藏会话"
    : normalizeDisplayName(input.conversation.displayName);

  return {
    title: "会话详情",
    state: "summary",
    heading,
    body: "这里仅展示当前会话的安全摘要和上下文入口。",
    sections: [
      {
        title: "当前会话",
        status: "ready",
        items: [
          {
            label: "类型",
            value: input.conversation.typeLabel?.trim() || "聊天",
          },
          {
            label: "标识",
            value: input.privacyOn ? "已隐藏" : safeIdentifier(input.currentChat),
          },
        ],
      },
      buildStatsSection(input),
      {
        title: "相关能力",
        status: "ready",
        items: [
          {
            label: "最近媒体",
            value: `${Math.max(input.mediaCount, 0).toLocaleString()} 项`,
          },
          {
            label: "AI 状态",
            value: input.semanticLabel ?? "未检查",
          },
          {
            label: "图谱状态",
            value: input.graphLabel ?? "未加载",
          },
        ],
      },
    ],
  };
}

function buildStatsSection(input: ConversationInspectorInput): ConversationInspectorSection {
  if (input.statsLoading) {
    return {
      title: "当前会话统计",
      status: "loading",
      body: "正在加载当前会话统计。",
      items: [],
    };
  }

  if (input.statsError) {
    return {
      title: "当前会话统计",
      status: "error",
      body: input.statsError,
      items: [],
    };
  }

  return {
    title: "当前会话统计",
    status: "ready",
    items: [
      {
        label: "消息",
        value: `${getMessageCount(input.stats).toLocaleString()} 条`,
      },
      {
        label: "参与者",
        value: `${Math.max(input.stats?.activeSenders ?? 0, 0).toLocaleString()} 人`,
      },
      {
        label: "活跃天数",
        value: `${Math.max(input.stats?.activeDays ?? 0, 0).toLocaleString()} 天`,
      },
    ],
  };
}

function getMessageCount(stats: ConversationInspectorStats | null): number {
  return Math.max(stats?.messageCount ?? stats?.total ?? 0, 0);
}

function normalizeDisplayName(displayName?: string | null): string {
  return displayName?.trim() || "未命名会话";
}

function safeIdentifier(identifier: string): string {
  if (!identifier.trim()) return "未选择";
  return "已选择";
}
