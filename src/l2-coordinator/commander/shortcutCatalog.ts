import type { PrimaryWorkspaceId } from "./primaryWorkspaceNavigation";

export type ShortcutContextId = PrimaryWorkspaceId | "setup" | "settings";

export type ShortcutGroupId =
  | "global"
  | "search"
  | "chat"
  | "ai"
  | "graph"
  | "media"
  | "sns"
  | "analytics"
  | "setup"
  | "settings";

export interface ShortcutHelpShortcut {
  id: string;
  keyLabel: string;
  alternativeKeyLabel?: string;
  actionLabel: string;
  description: string;
  enabled: boolean;
  disabledReason: string | null;
}

export interface ShortcutHelpGroup {
  id: ShortcutGroupId;
  label: string;
  shortcuts: ShortcutHelpShortcut[];
}

export interface ShortcutHelpCatalog {
  contextId: ShortcutContextId;
  title: string;
  description: string;
  groups: ShortcutHelpGroup[];
}

export interface ShortcutHelpCatalogInput {
  route: string;
  privacyOn?: boolean;
  hasCurrentConversation?: boolean;
  hasSearchResults?: boolean;
  canLoadMoreSearchResults?: boolean;
  hasSearchAnchor?: boolean;
  selectionModeAvailable?: boolean;
  aiStreaming?: boolean;
  aiReady?: boolean;
  graphReady?: boolean;
  canReturn?: boolean;
  privateContextLabel?: string;
  handledShortcutIds?: readonly string[];
}

export interface ShortcutHelpKeyEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  targetTagName: string | null;
  targetRole: string | null;
  isContentEditable: boolean;
}

export function buildShortcutHelpCatalog(input: ShortcutHelpCatalogInput): ShortcutHelpCatalog {
  const contextId = getShortcutContextId(input.route);
  return {
    contextId,
    title: `${contextLabel(contextId)}快捷键`,
    description: "只显示当前页面可用的快捷键。",
    groups: [
      buildGlobalGroup(input),
      buildContextGroup(contextId, input),
    ].filter(Boolean) as ShortcutHelpGroup[],
  };
}

export function getShortcutContextId(route: string): ShortcutContextId {
  const pathname = route.split("?")[0] || "/";
  if (pathname === "/" || pathname.startsWith("/setup")) return "setup";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/media")) return "media";
  if (pathname.startsWith("/sns")) return "sns";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/ai")) return "ai";
  if (pathname.startsWith("/graph")) return "graph";
  return "workbench";
}

export function shouldHandleShortcutHelpKey(event: ShortcutHelpKeyEventLike): boolean {
  if (isEditableShortcutTarget(event)) return false;
  if ((event.key === "?" || (event.key === "/" && event.shiftKey)) && !event.ctrlKey && !event.metaKey) {
    return true;
  }
  return event.key === "/" && (event.ctrlKey || event.metaKey);
}

export function isEditableShortcutTarget(event: ShortcutHelpKeyEventLike): boolean {
  if (event.isContentEditable) return true;
  const tagName = event.targetTagName?.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
  const role = event.targetRole?.toLowerCase();
  return role === "textbox" || role === "searchbox" || role === "combobox";
}

function buildGlobalGroup(input: ShortcutHelpCatalogInput): ShortcutHelpGroup {
  return {
    id: "global",
    label: "全局",
    shortcuts: [
      shortcut(input, {
        id: "help",
        keyLabel: "?",
        alternativeKeyLabel: "Ctrl / ⌘ + /",
        actionLabel: "打开快捷键帮助",
        description: "显示当前页面可用的快捷键。",
      }),
      shortcut(input, {
        id: "close-overlay",
        keyLabel: "Esc",
        actionLabel: "关闭浮层",
        description: "关闭帮助、抽屉、菜单或对话框。",
      }),
      shortcut(input, {
        id: "toggle-privacy",
        keyLabel: "Ctrl / ⌘ + Shift + P",
        actionLabel: input.privacyOn ? "关闭隐私模式" : "开启隐私模式",
        description: "切换结构保留的隐私遮罩。",
      }),
      shortcut(input, {
        id: "return-context",
        keyLabel: "Alt + ←",
        actionLabel: "返回来源",
        description: "返回搜索结果、AI 证据或图谱来源上下文。",
        condition: Boolean(input.canReturn),
        unavailableReason: "当前页面没有来源上下文。",
      }),
    ],
  };
}

function buildContextGroup(
  contextId: ShortcutContextId,
  input: ShortcutHelpCatalogInput,
): ShortcutHelpGroup | null {
  switch (contextId) {
    case "search":
      return {
        id: "search",
        label: "搜索",
        shortcuts: [
          shortcut(input, {
            id: "search-execute",
            keyLabel: "Enter",
            actionLabel: "执行搜索",
            description: "在搜索框中提交当前关键词。",
          }),
          shortcut(input, {
            id: "search-clear",
            keyLabel: "Esc",
            actionLabel: "清除搜索",
            description: "搜索框聚焦时清除当前关键词。",
          }),
          shortcut(input, {
            id: "search-next-result",
            keyLabel: "↓",
            actionLabel: "下一条搜索结果",
            description: "在搜索结果列表中移动焦点。",
            condition: Boolean(input.hasSearchResults),
            unavailableReason: "当前没有搜索结果。",
          }),
          shortcut(input, {
            id: "search-previous-result",
            keyLabel: "↑",
            actionLabel: "上一条搜索结果",
            description: "在搜索结果列表中向上移动焦点。",
            condition: Boolean(input.hasSearchResults),
            unavailableReason: "当前没有搜索结果。",
          }),
          shortcut(input, {
            id: "search-load-more",
            keyLabel: "Ctrl / ⌘ + Enter",
            actionLabel: "加载更多结果",
            description: "在当前筛选下继续加载搜索结果。",
            condition: Boolean(input.canLoadMoreSearchResults),
            unavailableReason: "当前没有可加载的更多结果。",
          }),
        ],
      };
    case "workbench":
      return {
        id: "chat",
        label: "会话阅读",
        shortcuts: [
          shortcut(input, {
            id: "chat-back-to-latest",
            keyLabel: "End",
            actionLabel: "回到最新消息",
            description: "跳回当前会话最新位置。",
            condition: Boolean(input.hasCurrentConversation),
            unavailableReason: "先选择一个会话。",
          }),
          shortcut(input, {
            id: "chat-return-hit",
            keyLabel: "H",
            actionLabel: "回到命中",
            description: "回到搜索或证据定位的消息附近。",
            condition: Boolean(input.hasSearchAnchor),
            unavailableReason: "当前没有消息命中定位。",
          }),
          shortcut(input, {
            id: "chat-selection-mode",
            keyLabel: "V",
            actionLabel: "进入选择模式",
            description: "选择多条消息后复制或导出片段。",
            condition: Boolean(input.hasCurrentConversation),
            unavailableReason: "先选择一个会话。",
          }),
          shortcut(input, {
            id: "chat-copy-selected",
            keyLabel: "Ctrl / ⌘ + C",
            actionLabel: "复制已选消息",
            description: "按隐私策略复制选中的消息片段。",
            condition: Boolean(input.selectionModeAvailable),
            unavailableReason: "先进入消息选择模式。",
          }),
        ],
      };
    case "ai":
      return {
        id: "ai",
        label: "AI",
        shortcuts: [
          shortcut(input, {
            id: "ai-focus-question",
            keyLabel: "Q",
            actionLabel: "聚焦问题输入",
            description: "回到 AI 问答输入框。",
            condition: Boolean(input.aiReady),
            unavailableReason: "先完成 AI 配置和索引。",
          }),
          shortcut(input, {
            id: "ai-stop-stream",
            keyLabel: "Esc",
            actionLabel: "停止生成",
            description: "停止等待当前流式回答。",
            condition: Boolean(input.aiStreaming),
            unavailableReason: "当前没有生成中的回答。",
          }),
          shortcut(input, {
            id: "ai-open-evidence",
            keyLabel: "E",
            actionLabel: "打开证据",
            description: "查看当前回答的证据来源。",
          }),
        ],
      };
    case "graph":
      return {
        id: "graph",
        label: "图谱",
        shortcuts: [
          shortcut(input, {
            id: "graph-fit",
            keyLabel: "F",
            actionLabel: "适配视图",
            description: "把当前图谱内容放回可视区域。",
            condition: Boolean(input.graphReady),
            unavailableReason: "先加载图谱数据。",
          }),
          shortcut(input, {
            id: "graph-reset",
            keyLabel: "R",
            actionLabel: "重置视角",
            description: "恢复图谱默认视角。",
          }),
          shortcut(input, {
            id: "graph-list",
            keyLabel: "L",
            actionLabel: "切到列表",
            description: "使用可访问列表查看实体和关系。",
          }),
        ],
      };
    case "media":
      return {
        id: "media",
        label: "媒体",
        shortcuts: [
          shortcut(input, { id: "media-refresh", keyLabel: "R", actionLabel: "刷新媒体", description: "重新加载当前会话媒体资源。" }),
          shortcut(input, { id: "media-copy", keyLabel: "C", actionLabel: "复制媒体摘要", description: "按隐私策略复制媒体结构摘要。" }),
        ],
      };
    case "sns":
      return {
        id: "sns",
        label: "朋友圈",
        shortcuts: [
          shortcut(input, { id: "sns-refresh", keyLabel: "R", actionLabel: "刷新朋友圈", description: "重新加载当前视图。" }),
          shortcut(input, { id: "sns-filter", keyLabel: "F", actionLabel: "打开筛选", description: "打开朋友圈筛选抽屉。" }),
        ],
      };
    case "analytics":
      return {
        id: "analytics",
        label: "统计",
        shortcuts: [
          shortcut(input, { id: "analytics-refresh", keyLabel: "R", actionLabel: "刷新统计", description: "重新加载当前统计范围。" }),
          shortcut(input, { id: "analytics-export", keyLabel: "E", actionLabel: "导出统计", description: "导出当前统计结果。" }),
        ],
      };
    case "setup":
      return {
        id: "setup",
        label: "设置中心",
        shortcuts: [
          shortcut(input, { id: "setup-next", keyLabel: "Enter", actionLabel: "执行当前主操作", description: "继续导入、连接或进入工作台。" }),
          shortcut(input, { id: "setup-diagnostics", keyLabel: "D", actionLabel: "查看诊断", description: "打开本地诊断摘要。" }),
        ],
      };
    case "settings":
      return {
        id: "settings",
        label: "设置",
        shortcuts: [
          shortcut(input, { id: "settings-search", keyLabel: "Tab", actionLabel: "切换设置项", description: "在设置分类和表单控件间移动。" }),
          shortcut(input, { id: "settings-back", keyLabel: "Alt + ←", actionLabel: "返回上一页", description: "回到进入设置前的工作区。" }),
        ],
      };
  }
}

function shortcut(
  input: ShortcutHelpCatalogInput,
  definition: {
    id: string;
    keyLabel: string;
    alternativeKeyLabel?: string;
    actionLabel: string;
    description: string;
    condition?: boolean;
    unavailableReason?: string;
  },
): ShortcutHelpShortcut {
  const handled = isShortcutHandled(input, definition.id);
  const available = definition.condition ?? true;
  return {
    id: definition.id,
    keyLabel: definition.keyLabel,
    alternativeKeyLabel: definition.alternativeKeyLabel,
    actionLabel: definition.actionLabel,
    description: definition.description,
    enabled: handled && available,
    disabledReason: !available
      ? definition.unavailableReason ?? "当前状态不可用。"
      : handled
        ? null
        : "此快捷键尚未在当前页面启用。",
  };
}

function isShortcutHandled(input: ShortcutHelpCatalogInput, id: string): boolean {
  const handledIds = new Set(input.handledShortcutIds ?? ["help", "close-overlay"]);
  return handledIds.has(id);
}

function contextLabel(contextId: ShortcutContextId): string {
  if (contextId === "workbench") return "会话阅读";
  if (contextId === "search") return "搜索";
  if (contextId === "media") return "媒体";
  if (contextId === "sns") return "朋友圈";
  if (contextId === "analytics") return "统计";
  if (contextId === "ai") return "AI";
  if (contextId === "graph") return "图谱";
  if (contextId === "settings") return "设置";
  return "设置中心";
}
