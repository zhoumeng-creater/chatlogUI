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

export interface ShortcutHelpOverview {
  title: string;
  description: string;
  items: string[];
}

export interface ShortcutHelpCatalog {
  contextId: ShortcutContextId;
  title: string;
  description: string;
  overview: ShortcutHelpOverview;
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
    title: `${contextLabel(contextId)}帮助`,
    description: "查看当前页面说明、主要操作和可用快捷键。",
    overview: contextOverview(contextId),
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
        actionLabel: "打开页面帮助",
        description: "显示当前页面说明和可用快捷键。",
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

function contextOverview(contextId: ShortcutContextId): ShortcutHelpOverview {
  switch (contextId) {
    case "setup":
      return {
        title: "连接本地聊天数据",
        description: "设置中心用于连接本机 chatlog 服务并确认数据库可用，优先完成数据目录选择和配置验证。",
        items: [
          "先选择微信数据目录，应用会自动读取目录配置和密钥状态。",
          "高级手动配置只用于迁移或排障，密钥覆盖应作为最后的补充手段。",
          "保存并验证配置会检查目录、服务地址和数据库 readiness。",
        ],
      };
    case "settings":
      return {
        title: "调整应用设置",
        description: "设置页用于管理隐私、外观、AI、开发者工具等应用级选项。",
        items: [
          "先选择左侧设置分类，再修改对应选项。",
          "涉及私密内容、外部服务或诊断导出的选项会在当前区域给出状态和恢复提示。",
        ],
      };
    case "search":
      return {
        title: "搜索聊天记录",
        description: "搜索页用于在聊天数据中查找关键词，并通过筛选、结果列表和上下文跳转定位原始消息。",
        items: [
          "先输入关键词，再按需要切换会话范围、时间或消息类型筛选。",
          "搜索结果只显示必要摘要，隐私模式开启时会保留结构并遮罩具体内容。",
          "点击结果可回到原始会话上下文，方便继续阅读前后消息。",
        ],
      };
    case "media":
      return {
        title: "浏览媒体资源",
        description: "媒体页用于查看图片、视频、语音和文件等聊天资源，并处理缺失或无法解密的资源状态。",
        items: [
          "先选择范围或会话，再查看对应媒体列表。",
          "媒体缺失、未解密或隐私模式开启时，页面会保留结构并显示原因。",
        ],
      };
    case "sns":
      return {
        title: "查看朋友圈内容",
        description: "朋友圈页用于检查动态、评论、点赞、媒体和链接内容。",
        items: [
          "先浏览时间线或使用筛选定位内容。",
          "缺失媒体、空文本和隐私遮罩会在条目内说明，不应显示原始路径或内部错误。",
        ],
      };
    case "analytics":
      return {
        title: "查看统计摘要",
        description: "统计页用于理解聊天数量、趋势和分布，不用于展示原始私密消息。",
        items: [
          "先确认统计范围，再查看趋势和分布。",
          "数据为空或服务未准备好时，页面会给出原因和下一步。",
        ],
      };
    case "ai":
      return {
        title: "使用 AI 问答和分析",
        description: "AI 页用于配置模型、建立索引、提出问题，并检查回答证据。",
        items: [
          "先完成 AI 配置和索引准备，再提交问题。",
          "生成中可以停止，回答完成后应查看证据来源判断可信度。",
        ],
      };
    case "graph":
      return {
        title: "查看知识图谱",
        description: "图谱页用于理解聊天中的实体、关系和事件，适合从结构上追踪上下文。",
        items: [
          "先加载或刷新图谱数据，再使用筛选、缩放和列表辅助定位。",
          "图谱回答和跳转需要保留证据来源，避免把推断当成事实。",
        ],
      };
    case "workbench":
      return {
        title: "阅读聊天会话",
        description: "会话阅读页用于查看联系人、群聊和消息上下文，是连接数据库后的主要工作区。",
        items: [
          "先选择一个会话，再阅读消息、媒体、成员或相关模块。",
          "隐私模式会遮罩具体内容，但会保留列表、时间和结构用于定位。",
        ],
      };
  }
}
