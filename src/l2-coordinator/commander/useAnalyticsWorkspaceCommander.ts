import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import {
  buildWorkspaceScopeModel,
  type WorkspaceScopeClearAction,
  type WorkspaceScopeKind,
} from "./workspaceScopeModel";
import { useScopedWorkspaceConversation } from "./useScopedWorkspaceConversation";
import { useStatsCommander } from "./useStatsCommander";
import {
  buildStatsControlViewModel,
  createDefaultStatsControlState,
  getStatsMetricDefinitions,
  validateCustomRange,
  type StatsControlState,
  type StatsGranularity,
  type StatsObjectFilter,
  type StatsTimePreset,
} from "./statsControlModel";
import {
  bindActionableEmptyStateActions,
  buildActionableEmptyState,
} from "./actionableEmptyStateModel";

export function useAnalyticsWorkspaceCommander() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [control, setControl] = useState<StatsControlState>(() => createDefaultStatsControlState());
  const { currentChat, workspaceRouteScope } = useScopedWorkspaceConversation({
    scope: params.get("scope"),
    scopedChat: params.get("chat"),
    focus: params.get("focus"),
    source: params.get("source"),
    defaultScope: "currentChat",
  });
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const stats = useStatsCommander({
    scopeSummary: buildAnalyticsScopeSummary(workspaceRouteScope.scopeLabel, control),
    controlState: control,
  });
  const { loadAll } = stats;
  const statsControl = useMemo(
    () => buildStatsControlViewModel({
      control,
      hasTrendData: stats.trend.length > 0,
      pending: stats.loading || stats.trendStatus === "loading" || stats.comparisonStatus === "loading",
    }),
    [control, stats.comparisonStatus, stats.loading, stats.trend.length, stats.trendStatus],
  );
  const scopeController = useMemo(() => buildWorkspaceScopeModel({
    moduleId: "analytics",
    routeScope: workspaceRouteScope,
    state: {
      kind: workspaceRouteScope.scopeKind,
      sourceRoute: params.get("source"),
      focusMessage: params.get("focus"),
      dateRange: control.timePreset === "custom"
        ? { preset: "custom", start: control.customStart, end: control.customEnd }
        : { preset: control.timePreset === "all" ? undefined : control.timePreset },
    },
    pending: stats.loading,
  }), [control.customEnd, control.customStart, control.timePreset, params, stats.loading, workspaceRouteScope]);

  useEffect(() => {
    if (!currentChat || validateCustomRange(control)) return;
    loadAll({
      chat: currentChat,
      control,
      scopeSummary: buildAnalyticsScopeSummary(workspaceRouteScope.scopeLabel, control),
    });
  }, [control, currentChat, loadAll, workspaceRouteScope.scopeLabel]);

  const updateScopeParams = useCallback((update: (next: URLSearchParams) => void) => {
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      update(next);
      return next;
    }, { replace: true });
  }, [setParams]);

  const selectScope = useCallback((kind: WorkspaceScopeKind) => {
    if (kind !== "currentConversation" || !currentChat) return;
    updateScopeParams((next) => {
      next.set("scope", "currentChat");
      next.set("chat", currentChat);
    });
  }, [currentChat, updateScopeParams]);

  const clearScopeChip = useCallback((action: WorkspaceScopeClearAction) => {
    if (action.field === "dateRange") {
      setControl((previous) => ({ ...previous, timePreset: "7d", customStart: undefined, customEnd: undefined }));
      return;
    }
    if (action.field !== "focusMessage" && action.field !== "sourceRoute") return;
    updateScopeParams((next) => {
      if (action.field === "focusMessage") next.delete("focus");
      if (action.field === "sourceRoute") next.delete("source");
    });
  }, [updateScopeParams]);

  const resetScope = useCallback(() => {
    setControl(createDefaultStatsControlState());
    updateScopeParams((next) => {
      next.delete("focus");
      next.delete("source");
    });
  }, [updateScopeParams]);

  const selectTimePreset = useCallback((timePreset: StatsTimePreset) => {
    setControl((previous) => ({
      ...previous,
      timePreset,
      customStart: timePreset === "custom" ? previous.customStart : undefined,
      customEnd: timePreset === "custom" ? previous.customEnd : undefined,
      comparisonMode: timePreset === "all" ? "off" : previous.comparisonMode,
    }));
  }, []);

  const setCustomRange = useCallback((range: { start: string; end: string }) => {
    setControl((previous) => ({
      ...previous,
      timePreset: "custom",
      customStart: range.start || undefined,
      customEnd: range.end || undefined,
    }));
  }, []);

  const selectGranularity = useCallback((granularity: StatsGranularity) => {
    setControl((previous) => ({ ...previous, granularity }));
  }, []);

  const selectObjectFilter = useCallback((objectFilter: StatsObjectFilter) => {
    if (objectFilter !== "all") return;
    setControl((previous) => ({ ...previous, objectFilter }));
  }, []);

  const toggleComparison = useCallback(() => {
    setControl((previous) => ({
      ...previous,
      comparisonMode: previous.comparisonMode === "previousPeriod" ? "off" : "previousPeriod",
    }));
  }, []);

  const refresh = useCallback(() => {
    if (!currentChat || validateCustomRange(control)) return;
    loadAll({
      chat: currentChat,
      control,
      scopeSummary: buildAnalyticsScopeSummary(workspaceRouteScope.scopeLabel, control),
    });
  }, [control, currentChat, loadAll, workspaceRouteScope.scopeLabel]);

  return {
    currentChat,
    workspaceRouteScope,
    privacyOn,
    stats,
    statsControl,
    metricDefinitions: getStatsMetricDefinitions(),
    emptyStates: {
      statsEmpty: {
        ...bindActionableEmptyStateActions(buildActionableEmptyState({
          variant: "stats-empty",
          readiness: {
            serviceConfigured: true,
            httpReady: true,
            dbReady: true,
            hasCurrentConversation: Boolean(currentChat),
          },
          privacyOn,
        }), currentChat ? ["choose-conversation", "refresh"] : ["choose-conversation"]),
        title: workspaceRouteScope.missingChat ? "来源会话不可用" : "选择会话后查看统计",
        reason: "从会话工作台进入，或在搜索结果中打开一个会话后，这里会展示对应范围的统计。",
      },
    },
    scopeController,
    selectScope,
    clearScopeChip,
    resetScope,
    selectTimePreset,
    setCustomRange,
    selectGranularity,
    selectObjectFilter,
    toggleComparison,
    refresh,
    navigateBackToWorkbench: () => navigate(withSmokeQuery("/workbench")),
  };
}

function buildAnalyticsScopeSummary(scopeLabel: string, control: StatsControlState): string {
  const time = control.timePreset === "custom"
    ? [control.customStart, control.customEnd].filter(Boolean).join(" 至 ") || "自定义时间"
    : control.timePreset;
  return `${scopeLabel} · ${time}`;
}

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  return new URLSearchParams(window.location.search).get("codex-smoke") === "workbench-ready"
    ? `${route}?codex-smoke=workbench-ready`
    : route;
}
