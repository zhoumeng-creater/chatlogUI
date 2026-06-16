import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  Bell,
  Filter,
  Image,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Button, SegmentedControl, Spinner, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import type { BusinessExportActionView } from "@l2/commander/useBusinessExportCommander";
import type { SnsDraftFilters, SnsFilterChip, SnsFilterField, SnsFilterViewModel } from "@l2/commander/snsFilterModel";
import type { ActionableEmptyStateView, EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import { ExportActionButton } from "@l3/export";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import { SnsDetailInspector } from "./SnsDetailInspector";
import { SnsExternalOpenDialog, type SnsExternalOpenPrompt } from "./SnsExternalOpenDialog";
import { formatSnsNotificationLabel, formatSnsTime } from "./snsDisplay";
import { SnsFilterChips } from "./SnsFilterChips";
import { SnsFilterDrawer } from "./SnsFilterDrawer";
import { SnsSearchPanel } from "./SnsSearchPanel";
import { SnsTimeline } from "./SnsTimeline";
import type {
  AdaptedSnsNotification,
  AdaptedSnsPost,
  SnsPostContentType,
} from "./snsTypes";

export type SnsModuleLoadStatus = "idle" | "loading" | "ready" | "empty" | "partial" | "error";
export type SnsModuleActiveTab = "timeline" | "search" | "notifications";
export type SnsModuleContentTypeFilter = "all" | SnsPostContentType;
export type SnsModuleDensity = "compact" | "comfortable";

const DETAIL_SHEET_QUERY = "(max-width: 980px)";
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function readDetailSheetMode(): boolean {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(DETAIL_SHEET_QUERY).matches;
}

export interface SnsModuleFilters {
  user: string;
  since: string;
  until: string;
  contentType: SnsModuleContentTypeFilter;
  mediaOnly: boolean;
  includeRead: boolean;
  limit: number;
}

export interface SnsModuleViewModel {
  title: string;
  subtitle: string;
  timelinePosts: AdaptedSnsPost[];
  searchResults: AdaptedSnsPost[];
  notifications: AdaptedSnsNotification[];
  notificationTargetIds: string[];
  selectedPost: AdaptedSnsPost | null;
  filterView: SnsFilterViewModel;
  summary: {
    feedCount: number;
    visibleFeedCount: number;
    notificationCount: number;
    searchCount: number;
    mediaCount: number;
  };
  loadMore: {
    nextLimit: number;
    label: string;
  };
  emptyCopy: string;
  errorCopy: string | null;
}

export interface SnsModuleEmptyStates {
  timeline: ActionableEmptyStateView;
  search: ActionableEmptyStateView;
  notifications: ActionableEmptyStateView;
}

interface SnsModuleProps {
  view: SnsModuleViewModel;
  status: SnsModuleLoadStatus;
  searchStatus: SnsModuleLoadStatus;
  activeTab: SnsModuleActiveTab;
  filters: SnsModuleFilters;
  draftFilters: SnsDraftFilters;
  filterChips: SnsFilterChip[];
  filtersDirty: boolean;
  filterDrawerOpen: boolean;
  filterError: string | null;
  density: SnsModuleDensity;
  searchQuery: string;
  error: string | null;
  searchError: string | null;
  selectedPostId: string | null;
  privacyOn: boolean;
  externalOpenPrompt: SnsExternalOpenPrompt | null;
  externalOpenError: string | null;
  emptyStates: SnsModuleEmptyStates;
  exportAction?: BusinessExportActionView;
  onRefresh: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onTabChange: (tab: SnsModuleActiveTab) => void;
  onDraftFiltersChange: (filters: Partial<SnsDraftFilters>) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onClearFilter: (field: SnsFilterField) => void;
  onFilterDrawerOpenChange: (open: boolean) => void;
  onDensityChange: (density: SnsModuleDensity) => void;
  onSearchQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  onClearSearch: () => void;
  onSelectPost: (postId: string | null) => void;
  onRequestArticleOpen: (postId: string) => void;
  onConfirmExternalOpen: () => void;
  onCancelExternalOpen: () => void;
}

export function SnsModule({
  view,
  status,
  searchStatus,
  activeTab,
  filters,
  draftFilters,
  filterChips,
  filtersDirty,
  filterDrawerOpen,
  filterError,
  density,
  searchQuery,
  error,
  searchError,
  selectedPostId,
  privacyOn,
  externalOpenPrompt,
  externalOpenError,
  emptyStates,
  exportAction,
  onRefresh,
  onRetry,
  onLoadMore,
  onTabChange,
  onDraftFiltersChange,
  onApplyFilters,
  onResetFilters,
  onClearFilter,
  onFilterDrawerOpenChange,
  onDensityChange,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  onSelectPost,
  onRequestArticleOpen,
  onConfirmExternalOpen,
  onCancelExternalOpen,
}: SnsModuleProps) {
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const detailRestoreTargetRef = useRef<HTMLElement | null>(null);
  const detailOpen = Boolean(view.selectedPost);
  const [detailSheetMode, setDetailSheetMode] = useState(readDetailSheetMode);
  const detailModalOpen = detailOpen && detailSheetMode;

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(DETAIL_SHEET_QUERY);
    const sync = () => setDetailSheetMode(query.matches);
    sync();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", sync);
      return () => query.removeEventListener("change", sync);
    }
    query.addListener(sync);
    return () => {
      query.removeListener(sync);
    };
  }, []);

  useEffect(() => {
    if (!detailModalOpen || typeof document === "undefined") return;
    const panel = detailPanelRef.current;
    const focusTarget = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? panel;
    focusTarget?.focus();

    return () => {
      detailRestoreTargetRef.current?.focus();
      detailRestoreTargetRef.current = null;
    };
  }, [detailModalOpen, view.selectedPost?.id]);

  const handleSelectPost = (postId: string | null) => {
    if (postId && detailSheetMode && typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      detailRestoreTargetRef.current = document.activeElement;
    }
    onSelectPost(postId);
  };

  const closeDetail = () => onSelectPost(null);
  const handleEmptyAction = (actionId: EmptyStateActionId) => {
    if (actionId === "clear-filters" || actionId === "clear-search") {
      onResetFilters();
      return;
    }
    if (actionId === "refresh" || actionId === "retry") {
      onRefresh();
    }
  };

  const handleDetailKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!detailModalOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDetail();
      return;
    }

    if (event.key !== "Tab" || typeof document === "undefined") return;
    const panel = detailPanelRef.current;
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !panel.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <aside className="sns-module" aria-label="朋友圈" data-limit={filters.limit}>
      <div className="sns-module__header">
        <div className="sns-module__title">
          <Typography variant="label" weight={700}>
            {view.title}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.subtitle}
          </Typography>
        </div>
        <div className="sns-module__header-actions">
          {exportAction && <ExportActionButton {...exportAction} />}
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={status === "loading"}
            aria-label="刷新朋友圈"
          >
            <RefreshCw size={14} />
          </Button>
        </div>
      </div>

      {status === "error" ? (
        <div className="workbench-error-state" role="alert">
          <Typography variant="label" weight={700}>
            朋友圈加载失败
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {error || view.errorCopy || "无法加载朋友圈"}
          </Typography>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            重试
          </Button>
        </div>
      ) : (
        <>
          {status === "partial" && (
            <div className="sns-module__partial" role="status">
              <Typography variant="label" weight={700}>
                {error || view.errorCopy || "部分朋友圈数据加载失败"}
              </Typography>
              <Typography variant="caption" color="var(--text-secondary)">
                其他朋友圈内容仍可查看，可刷新后重试缺失部分。
              </Typography>
            </div>
          )}

          <SummaryStrip view={view} loading={status === "loading"} />
          <div className="sns-module__controls">
            <SnsFilterChips
              chips={filterChips}
              dirty={filtersDirty}
              filtersOpen={filterDrawerOpen}
              onClear={onClearFilter}
              onOpenFilters={() => onFilterDrawerOpenChange(true)}
            />
            <SegmentedControl
              label="阅读密度"
              value={density}
              onChange={onDensityChange}
              options={[
                { value: "comfortable", label: "舒适" },
                { value: "compact", label: "紧凑" },
              ]}
            />
          </div>
          <SnsFilterDrawer
            open={filterDrawerOpen}
            draftFilters={draftFilters}
            filtersDirty={filtersDirty}
            filterError={filterError}
            privacyOn={privacyOn}
            onDraftChange={onDraftFiltersChange}
            onApply={onApplyFilters}
            onReset={onResetFilters}
            onClose={() => onFilterDrawerOpenChange(false)}
          />

          <SegmentedControl
            label="朋友圈视图"
            value={activeTab}
            onChange={onTabChange}
            options={[
              { value: "timeline", label: `动态 ${view.summary.visibleFeedCount}` },
              { value: "search", label: `搜索 ${view.summary.searchCount}` },
              { value: "notifications", label: `通知 ${view.summary.notificationCount}` },
            ]}
          />

          <div className="sns-module__body">
            <div className="sns-module__primary">
              {status === "loading" && (
                <div className="sns-module__loading">
                  <Spinner size={18} label="加载朋友圈..." color="var(--text-muted)" />
                </div>
              )}

              {activeTab === "timeline" && (
                <>
                  {status !== "loading" && view.timelinePosts.length === 0 ? (
                    <SnsEmptyState
                      model={emptyStates.timeline}
                      onAction={handleEmptyAction}
                    />
                  ) : (
                    <>
                      <SnsTimeline
                        posts={view.timelinePosts}
                        selectedPostId={selectedPostId}
                        privacyOn={privacyOn}
                        density={density}
                        emptyCopy={view.emptyCopy}
                        onSelectPost={handleSelectPost}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onLoadMore}
                        disabled={status === "loading"}
                        className="sns-module__load-more"
                      >
                        {view.loadMore.label}
                      </Button>
                    </>
                  )}
                </>
              )}

              {activeTab === "search" && (
                <SnsSearchPanel
                  searchQuery={searchQuery}
                  searchStatus={searchStatus}
                  searchError={searchError}
                  results={view.searchResults}
                  selectedPostId={selectedPostId}
                  privacyOn={privacyOn}
                  emptyState={emptyStates.search}
                  emptyCopy={view.emptyCopy}
                  onSearchQueryChange={onSearchQueryChange}
                  onSearch={onSearch}
                  onClearSearch={onClearSearch}
                  onEmptyAction={handleEmptyAction}
                  onSelectPost={handleSelectPost}
                  density={density}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationList
                  notifications={view.notifications}
                  notificationTargetIds={view.notificationTargetIds}
                  selectedPostId={selectedPostId}
                  privacyOn={privacyOn}
                  emptyState={emptyStates.notifications}
                  onRefresh={onRefresh}
                  onSelectPost={handleSelectPost}
                  onShowTimeline={() => onTabChange("timeline")}
                />
              )}
            </div>

            <div
              ref={detailPanelRef}
              className={classNames(
                "sns-module__detail-panel",
                detailOpen && "sns-module__detail-panel--open",
                detailModalOpen && "sns-module__detail-panel--sheet",
              )}
              role={detailModalOpen ? "dialog" : "complementary"}
              aria-modal={detailModalOpen ? true : undefined}
              aria-label="朋友圈详情面板"
              aria-hidden={!detailOpen && detailSheetMode ? true : undefined}
              tabIndex={detailModalOpen ? -1 : undefined}
              onKeyDown={detailModalOpen ? handleDetailKeyDown : undefined}
            >
              <SnsDetailInspector
                post={view.selectedPost}
                privacyOn={privacyOn}
                onRequestArticleOpen={onRequestArticleOpen}
                onClose={closeDetail}
              />
            </div>
          </div>
          {externalOpenPrompt && (
            <SnsExternalOpenDialog
              prompt={externalOpenPrompt}
              error={externalOpenError}
              onConfirm={onConfirmExternalOpen}
              onCancel={onCancelExternalOpen}
            />
          )}
        </>
      )}
    </aside>
  );
}

function SnsEmptyState({
  model,
  onAction,
}: {
  model: ActionableEmptyStateView;
  onAction: (actionId: EmptyStateActionId) => void;
}) {
  return (
    <ActionableEmptyState
      className="sns-module__empty"
      model={model}
      onAction={onAction}
    />
  );
}

function SummaryStrip({
  view,
  loading,
}: {
  view: SnsModuleViewModel;
  loading: boolean;
}) {
  const items = [
    { icon: <MessageCircle size={14} />, label: "动态", value: view.summary.feedCount },
    { icon: <Filter size={14} />, label: "可见", value: view.summary.visibleFeedCount },
    { icon: <Bell size={14} />, label: "通知", value: view.summary.notificationCount },
    { icon: <Image size={14} />, label: "媒体", value: view.summary.mediaCount },
  ];

  return (
    <div className="sns-module__summary" aria-busy={loading}>
      {items.map((item) => (
        <div key={item.label} className="sns-module__summary-item">
          {item.icon}
          <span>{item.label}</span>
          <strong>{item.value.toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
}

function NotificationList({
  notifications,
  notificationTargetIds,
  selectedPostId,
  privacyOn,
  emptyState,
  onSelectPost,
  onRefresh,
  onShowTimeline,
}: {
  notifications: AdaptedSnsNotification[];
  notificationTargetIds: string[];
  selectedPostId: string | null;
  privacyOn: boolean;
  emptyState: ActionableEmptyStateView;
  onRefresh: () => void;
  onSelectPost: (postId: string | null) => void;
  onShowTimeline: () => void;
}) {
  if (notifications.length === 0) {
    const handleAction = (actionId: EmptyStateActionId) => {
      if (actionId === "refresh" || actionId === "retry") {
        onRefresh();
        return;
      }
      if (actionId === "clear-filters") {
        onShowTimeline();
      }
    };

    return (
      <ActionableEmptyState
        className="sns-module__empty"
        model={emptyState}
        onAction={handleAction}
      />
    );
  }

  return (
    <div className="sns-notification-list" aria-label="朋友圈通知">
      {notifications.map((notification) => {
        const targetAvailable = Boolean(notification.feedId && notificationTargetIds.includes(notification.feedId));
        const label = formatSnsNotificationLabel(notification, privacyOn);
        const content = privacyOn ? "已隐藏通知内容" : notification.content || notification.feedPreview || "互动通知";
        const time = formatSnsTime(notification.time, privacyOn);
        if (!targetAvailable) {
          return (
            <div
              key={notification.id}
              role="group"
              aria-label={`${label} 无法定位原动态`}
              className="sns-notification-row sns-notification-row--unavailable"
            >
              <Bell size={15} />
              <span className="sns-notification-row__main">
                <strong>{label}</strong>
                <span>{content}</span>
                <span className="sns-notification-row__note">
                  原动态未在当前结果中，刷新或调整筛选后再定位。
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={onShowTimeline}>
                  查看动态列表
                </Button>
              </span>
              <span className="sns-notification-row__time">
                {time}
              </span>
            </div>
          );
        }

        return (
          <button
            key={notification.id}
            type="button"
            className={classNames(
              "sns-notification-row",
              targetAvailable && selectedPostId === notification.feedId && "sns-notification-row--selected",
            )}
            onClick={() => {
              if (targetAvailable) onSelectPost(notification.feedId);
            }}
          >
            <Bell size={15} />
            <span className="sns-notification-row__main">
              <strong>{label}</strong>
              <span>{content}</span>
            </span>
            <span className="sns-notification-row__time">
              {time}
            </span>
          </button>
        );
      })}
    </div>
  );
}
