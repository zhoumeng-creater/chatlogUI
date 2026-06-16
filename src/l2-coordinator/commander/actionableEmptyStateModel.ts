export type ActionableEmptyStateVariant =
  | "service-not-configured"
  | "service-not-ready"
  | "db-not-ready"
  | "no-conversation-selected"
  | "conversation-empty"
  | "search-not-started"
  | "search-no-results"
  | "filters-no-results"
  | "stats-empty"
  | "media-empty"
  | "sns-empty"
  | "ai-setup-required"
  | "ai-index-required"
  | "graph-empty";

export type EmptyStateActionId =
  | "configure-service"
  | "check-service"
  | "open-diagnostics"
  | "retry"
  | "refresh"
  | "clear-search"
  | "clear-filters"
  | "choose-conversation"
  | "search-current-conversation"
  | "build-index"
  | "open-settings";

export type EmptyStateActionVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ActionableEmptyStateAction {
  id: EmptyStateActionId;
  label: string;
  variant: EmptyStateActionVariant;
  disabled: boolean;
  disabledReason: string | null;
}

export interface ActionableEmptyStateView {
  id: ActionableEmptyStateVariant;
  title: string;
  reason: string;
  description: string;
  statusCopy?: string;
  actions: ActionableEmptyStateAction[];
}

export interface ActionableEmptyStateInput {
  variant: ActionableEmptyStateVariant;
  readiness: {
    serviceConfigured: boolean;
    httpReady: boolean;
    dbReady: boolean;
    hasCurrentConversation?: boolean;
  };
  privacyOn: boolean;
  counts?: {
    hiddenItems?: number;
  };
}

export function buildActionableEmptyState(input: ActionableEmptyStateInput): ActionableEmptyStateView {
  const readinessBlocker = buildReadinessBlocker(input);
  if (readinessBlocker) return readinessBlocker;

  const hasConversation = Boolean(input.readiness.hasCurrentConversation);
  switch (input.variant) {
    case "service-not-configured":
      return view(input.variant, "需要配置本机聊天服务", "还没有可用的本机服务配置。", "完成配置后才能读取会话、搜索、统计和媒体。", [
        action("configure-service", "配置服务", "primary"),
        action("open-diagnostics", "查看诊断", "ghost"),
      ]);
    case "service-not-ready":
      return view(input.variant, "本机聊天服务未就绪", "服务还不能响应当前请求。", "检查服务状态，或查看诊断了解端口、进程和 HTTP 状态。", [
        action("check-service", "检查服务", "secondary"),
        action("open-diagnostics", "查看诊断", "ghost"),
      ]);
    case "db-not-ready":
      return view(input.variant, "数据库未就绪", "本机服务可访问，但数据库还不能查询。", "确认数据目录和密钥配置后再刷新工作区。", [
        action("check-service", "检查数据库", "secondary"),
        action("open-diagnostics", "查看诊断", "ghost"),
      ]);
    case "no-conversation-selected":
      return view(input.variant, "选择会话", "还没有选中要阅读的会话。", "从左侧会话列表选择一个会话后，这里会显示消息、统计和上下文操作。", [
        action("choose-conversation", "选择会话", "secondary"),
        action("refresh", "刷新会话", "ghost"),
      ]);
    case "conversation-empty":
      return view(
        input.variant,
        "当前会话暂无消息",
        "数据库已就绪，但当前会话没有返回可读消息。",
        input.privacyOn
          ? "隐私模式下仍保留会话结构、消息数量和类型；可以刷新或选择其他会话。"
          : "可以刷新当前会话，或选择其他会话继续阅读。",
        [
          action("refresh", "刷新消息", "secondary"),
          action("choose-conversation", "选择其他会话", "ghost"),
        ],
        input.counts?.hiddenItems !== undefined ? `已显示 ${input.counts.hiddenItems} 条消息` : undefined,
      );
    case "search-not-started":
      return view(input.variant, "输入关键词开始搜索", "搜索不会向后端提交空白查询。", "可以先调整范围、消息类型或日期筛选，再执行搜索。", [
        ...(hasConversation ? [action("search-current-conversation", "搜索当前会话", "secondary")] : []),
        action("clear-filters", "清除筛选", "ghost"),
      ]);
    case "search-no-results":
      return view(input.variant, "没有搜索结果", "换一个关键词或放宽范围。", "当前筛选没有返回消息，隐私模式下也会保留结果数量和范围结构。", [
        action("clear-filters", "清除筛选", "secondary"),
        action("refresh", "重新搜索", "ghost"),
      ]);
    case "filters-no-results":
      return view(input.variant, "筛选后没有结果", "当前筛选组合没有可显示内容。", "可以清除部分筛选、重置范围，或刷新当前数据。", [
        action("clear-filters", "清除筛选", "secondary"),
        action("refresh", "刷新", "ghost"),
      ]);
    case "stats-empty":
      return view(input.variant, "暂无统计数据", "当前范围没有足够数据生成统计。", "可以返回会话确认消息是否存在，或刷新当前统计。", [
        action("choose-conversation", "返回会话", "secondary"),
        action("refresh", "刷新统计", "ghost"),
      ]);
    case "media-empty":
      return view(input.variant, "暂无媒体资源", "当前会话没有返回附件、收藏或媒体资源。", "可以刷新媒体，或回到会话确认是否有图片、文件、语音或视频消息。", [
        action("refresh", "刷新媒体", "secondary"),
        action("choose-conversation", "选择其他会话", "ghost"),
      ]);
    case "sns-empty":
      return view(input.variant, "暂无朋友圈内容", "当前筛选没有返回动态、通知或搜索结果。", "可以清除筛选、刷新朋友圈，或查看诊断确认服务状态。", [
        action("clear-filters", "清除筛选", "secondary"),
        action("refresh", "刷新朋友圈", "ghost"),
        action("open-diagnostics", "查看诊断", "ghost"),
      ]);
    case "ai-setup-required":
      return view(input.variant, "需要配置 AI", "还没有可用的 AI 提供方或模型配置。", "打开 AI 设置并完成连接测试后再构建索引。", [
        action("open-settings", "打开 AI 设置", "primary"),
        action("open-diagnostics", "查看诊断", "ghost"),
      ]);
    case "ai-index-required":
      return view(input.variant, "需要建立语义索引", "AI 已配置，但当前没有可用索引。", "构建索引后才能进行语义搜索、问答和证据查看。", [
        action("build-index", "构建索引", "primary"),
        action("open-settings", "打开 AI 设置", "ghost"),
      ]);
    case "graph-empty":
      return view(input.variant, "暂无图谱数据", "当前筛选条件下没有图谱节点或关系。", "可以清除筛选、刷新图谱，或回到来源会话核对上下文。", [
        action("clear-filters", "清除筛选", "secondary"),
        action("refresh", "刷新图谱", "ghost"),
        action("choose-conversation", "查看来源", "ghost"),
      ]);
  }
}

export function bindActionableEmptyStateActions(
  model: ActionableEmptyStateView,
  supportedActionIds: readonly EmptyStateActionId[],
  unsupportedReason = "当前区域没有接入这个操作。",
): ActionableEmptyStateView {
  const supported = new Set(supportedActionIds);
  return {
    ...model,
    actions: model.actions.map((item) => {
      if (item.disabled || supported.has(item.id)) return item;
      return {
        ...item,
        disabled: true,
        disabledReason: unsupportedReason,
      };
    }),
  };
}

function buildReadinessBlocker(input: ActionableEmptyStateInput): ActionableEmptyStateView | null {
  if (!input.readiness.serviceConfigured) {
    return buildActionableEmptyState({
      ...input,
      variant: "service-not-configured",
      readiness: { ...input.readiness, serviceConfigured: true, httpReady: true, dbReady: true },
    });
  }

  if (!input.readiness.httpReady) {
    return buildActionableEmptyState({
      ...input,
      variant: "service-not-ready",
      readiness: { ...input.readiness, httpReady: true, dbReady: true },
    });
  }

  if (!input.readiness.dbReady) {
    return buildActionableEmptyState({
      ...input,
      variant: "db-not-ready",
      readiness: { ...input.readiness, dbReady: true },
    });
  }

  return null;
}

function view(
  id: ActionableEmptyStateVariant,
  title: string,
  reason: string,
  description: string,
  actions: ActionableEmptyStateAction[],
  statusCopy?: string,
): ActionableEmptyStateView {
  return {
    id,
    title,
    reason,
    description,
    statusCopy,
    actions: actions.slice(0, 3),
  };
}

function action(
  id: EmptyStateActionId,
  label: string,
  variant: EmptyStateActionVariant,
  disabled = false,
  disabledReason: string | null = null,
): ActionableEmptyStateAction {
  return {
    id,
    label,
    variant,
    disabled,
    disabledReason,
  };
}
