import type { SemanticModuleView, SemanticQaStatus } from "./semanticViewModel";

export type SemanticPrimaryTaskCommand =
  | "wait"
  | "open_setup"
  | "build_index"
  | "pause_index"
  | "resume_index"
  | "retry_index"
  | "focus_question"
  | "open_search"
  | "open_analysis"
  | "open_preview";

export interface SemanticPrimaryTaskAction {
  label: string;
  command: SemanticPrimaryTaskCommand;
  tone?: "primary" | "secondary" | "ghost" | "danger";
  disabledReason?: string;
}

export interface SemanticPrimaryTaskView {
  kind: SemanticModuleView["kind"];
  title: string;
  description: string;
  primaryAction: SemanticPrimaryTaskAction;
  secondaryActions: SemanticPrimaryTaskAction[];
  statusItems: string[];
  canShowSecondaryTabs: boolean;
  ariaLiveMessage: string;
}

interface SemanticPrimaryTaskInput {
  moduleView: SemanticModuleView;
  scopeLabel: string;
  qaStatus: SemanticQaStatus;
  qaHasMessages: boolean;
  indexStatusItems?: string[];
}

export function buildSemanticPrimaryTaskView({
  moduleView,
  scopeLabel,
  qaStatus,
  qaHasMessages,
  indexStatusItems = [],
}: SemanticPrimaryTaskInput): SemanticPrimaryTaskView {
  const baseStatusItems = compactStatusItems(indexStatusItems);
  const qaStatusText = semanticQaStatusText(qaStatus, qaHasMessages);

  if (moduleView.kind === "checking_config") {
    return primaryTask({
      moduleView,
      title: "检查 AI 配置",
      description: "正在确认本机 AI 设置和语义索引状态，聊天主流程不会被阻塞。",
      primaryAction: { label: "继续等待", command: "wait", tone: "ghost" },
      statusItems: baseStatusItems,
      qaStatusText,
    });
  }

  if (moduleView.kind === "setup_required") {
    return primaryTask({
      moduleView,
      title: "配置 AI",
      description: "先配置本机或已授权的 AI 提供方，完成后即可使用语义问答。",
      primaryAction: { label: "打开 AI 设置", command: "open_setup", tone: "primary" },
      statusItems: baseStatusItems,
      qaStatusText,
    });
  }

  if (moduleView.kind === "index_running") {
    return primaryTask({
      moduleView,
      title: "正在建立语义索引",
      description: "索引完成后才能进行语义问答；当前聊天、搜索和统计仍可继续使用。",
      primaryAction: { label: "暂停", command: "pause_index", tone: "secondary" },
      secondaryActions: [{ label: "后台继续", command: "wait", tone: "ghost" }],
      statusItems: baseStatusItems,
      qaStatusText,
    });
  }

  if (moduleView.kind === "index_paused") {
    return primaryTask({
      moduleView,
      title: "继续建立语义索引",
      description: "恢复索引后，AI 问答会继续基于本机聊天数据建立证据来源。",
      primaryAction: { label: "继续", command: "resume_index", tone: "primary" },
      secondaryActions: [{ label: "重新构建", command: "build_index", tone: "secondary" }],
      statusItems: baseStatusItems,
      qaStatusText,
    });
  }

  if (moduleView.kind === "failed") {
    return primaryTask({
      moduleView,
      title: "修复语义索引",
      description: "语义索引暂不可用，请重试检查或重新构建后再提问。",
      primaryAction: { label: "重试", command: "retry_index", tone: "primary" },
      secondaryActions: [{ label: "重新构建", command: "build_index", tone: "secondary" }],
      statusItems: baseStatusItems,
      qaStatusText,
    });
  }

  if (moduleView.kind === "ready") {
    return primaryTask({
      moduleView,
      title: "问当前范围",
      description: `直接对${scopeLabel || "当前范围"}提问，答案会保留证据来源并可导出。`,
      primaryAction: { label: "输入问题", command: "focus_question", tone: "primary" },
      secondaryActions: [
        { label: "语义搜索", command: "open_search", tone: "secondary" },
        { label: "会话分析", command: "open_analysis", tone: "secondary" },
        { label: "索引预览", command: "open_preview", tone: "secondary" },
      ],
      statusItems: baseStatusItems,
      qaStatusText,
      canShowSecondaryTabs: true,
    });
  }

  return primaryTask({
    moduleView,
    title: "建立语义索引",
    description: "先建立本机语义索引，AI 才能基于聊天记录回答并给出证据。",
    primaryAction: { label: "开始构建", command: "build_index", tone: "primary" },
    statusItems: baseStatusItems,
    qaStatusText,
  });
}

function primaryTask(input: {
  moduleView: SemanticModuleView;
  title: string;
  description: string;
  primaryAction: SemanticPrimaryTaskAction;
  secondaryActions?: SemanticPrimaryTaskAction[];
  statusItems: string[];
  qaStatusText: string;
  canShowSecondaryTabs?: boolean;
}): SemanticPrimaryTaskView {
  const statusItems = input.qaStatusText
    ? [...input.statusItems, input.qaStatusText]
    : input.statusItems;
  const ariaLiveMessage = [input.title, input.description, ...statusItems]
    .filter(Boolean)
    .join("。");

  return {
    kind: input.moduleView.kind,
    title: input.title,
    description: input.description,
    primaryAction: input.primaryAction,
    secondaryActions: input.secondaryActions ?? [],
    statusItems,
    canShowSecondaryTabs: input.canShowSecondaryTabs ?? false,
    ariaLiveMessage,
  };
}

function compactStatusItems(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function semanticQaStatusText(status: SemanticQaStatus, hasMessages: boolean): string {
  if (status === "connecting") return "正在连接 AI 问答";
  if (status === "streaming") return "正在生成回答";
  if (status === "stopped") return "已停止，保留当前回答";
  if (status === "failed") return "当前回答失败，可重试问题";
  if (status === "empty") return "本次未返回可显示答案";
  if (status === "completed" && hasMessages) return "最近回答已完成";
  return "";
}
