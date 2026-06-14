import {
  Bell,
  CalendarDays,
  Filter,
  Image,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Button, Input, SegmentedControl, Select, Spinner, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";
import type { BusinessExportActionView } from "@l2/commander/useBusinessExportCommander";
import { ExportActionButton } from "@l3/export";
import { SnsDetailInspector } from "./SnsDetailInspector";
import { SnsExternalOpenDialog, type SnsExternalOpenPrompt } from "./SnsExternalOpenDialog";
import { formatSnsNotificationLabel, formatSnsTime } from "./snsDisplay";
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

interface SnsModuleProps {
  view: SnsModuleViewModel;
  status: SnsModuleLoadStatus;
  searchStatus: SnsModuleLoadStatus;
  activeTab: SnsModuleActiveTab;
  filters: SnsModuleFilters;
  searchQuery: string;
  error: string | null;
  searchError: string | null;
  selectedPostId: string | null;
  privacyOn: boolean;
  externalOpenPrompt: SnsExternalOpenPrompt | null;
  externalOpenError: string | null;
  exportAction?: BusinessExportActionView;
  onRefresh: () => void;
  onRetry: () => void;
  onLoadMore: () => void;
  onTabChange: (tab: SnsModuleActiveTab) => void;
  onFiltersChange: (filters: Partial<SnsModuleFilters>) => void;
  onSearchQueryChange: (query: string) => void;
  onSearch: (query?: string) => void;
  onClearSearch: () => void;
  onSelectPost: (postId: string | null) => void;
  onRequestArticleOpen: (postId: string) => void;
  onConfirmExternalOpen: () => void;
  onCancelExternalOpen: () => void;
}

const CONTENT_TYPE_OPTIONS: Array<{ value: SnsModuleContentTypeFilter; label: string }> = [
  { value: "all", label: "全部类型" },
  { value: "text", label: "文本" },
  { value: "image", label: "图片" },
  { value: "video", label: "视频" },
  { value: "article", label: "文章" },
  { value: "finder", label: "视频号" },
  { value: "unknown", label: "其他" },
];

export function SnsModule({
  view,
  status,
  searchStatus,
  activeTab,
  filters,
  searchQuery,
  error,
  searchError,
  selectedPostId,
  privacyOn,
  externalOpenPrompt,
  externalOpenError,
  exportAction,
  onRefresh,
  onRetry,
  onLoadMore,
  onTabChange,
  onFiltersChange,
  onSearchQueryChange,
  onSearch,
  onClearSearch,
  onSelectPost,
  onRequestArticleOpen,
  onConfirmExternalOpen,
  onCancelExternalOpen,
}: SnsModuleProps) {
  return (
    <aside className="sns-module" aria-label="朋友圈">
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
          <FilterPanel filters={filters} onFiltersChange={onFiltersChange} onApply={onRefresh} />

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
                  <SnsTimeline
                    posts={view.timelinePosts}
                    selectedPostId={selectedPostId}
                    privacyOn={privacyOn}
                    emptyCopy={view.emptyCopy}
                    onSelectPost={onSelectPost}
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

              {activeTab === "search" && (
                <SnsSearchPanel
                  searchQuery={searchQuery}
                  searchStatus={searchStatus}
                  searchError={searchError}
                  results={view.searchResults}
                  selectedPostId={selectedPostId}
                  privacyOn={privacyOn}
                  emptyCopy={view.emptyCopy}
                  onSearchQueryChange={onSearchQueryChange}
                  onSearch={onSearch}
                  onClearSearch={onClearSearch}
                  onSelectPost={onSelectPost}
                />
              )}

              {activeTab === "notifications" && (
                <NotificationList
                  notifications={view.notifications}
                  notificationTargetIds={view.notificationTargetIds}
                  selectedPostId={selectedPostId}
                  privacyOn={privacyOn}
                  emptyCopy={view.emptyCopy}
                  onSelectPost={onSelectPost}
                  onShowTimeline={() => onTabChange("timeline")}
                />
              )}
            </div>

            <SnsDetailInspector
              post={view.selectedPost}
              privacyOn={privacyOn}
              onRequestArticleOpen={onRequestArticleOpen}
            />
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

function FilterPanel({
  filters,
  onFiltersChange,
  onApply,
}: {
  filters: SnsModuleFilters;
  onFiltersChange: (filters: Partial<SnsModuleFilters>) => void;
  onApply: () => void;
}) {
  return (
    <div className="sns-module__filters" aria-label="朋友圈筛选">
      <div className="sns-module__filter-row">
        <label className="sns-module__field">
          <span>作者</span>
          <Input
            controlSize="sm"
            value={filters.user}
            onChange={(event) => onFiltersChange({ user: event.currentTarget.value })}
            placeholder="username"
          />
        </label>
        <label className="sns-module__field">
          <span>类型</span>
          <Select
            controlSize="sm"
            value={filters.contentType}
            onChange={(event) =>
              onFiltersChange({ contentType: event.currentTarget.value as SnsModuleContentTypeFilter })
            }
          >
            {CONTENT_TYPE_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="sns-module__filter-row sns-module__filter-row--dates">
        <label className="sns-module__field">
          <span>开始</span>
          <Input
            controlSize="sm"
            type="date"
            value={filters.since}
            onChange={(event) => onFiltersChange({ since: event.currentTarget.value })}
          />
        </label>
        <label className="sns-module__field">
          <span>结束</span>
          <Input
            controlSize="sm"
            type="date"
            value={filters.until}
            onChange={(event) => onFiltersChange({ until: event.currentTarget.value })}
          />
        </label>
        <Button type="button" variant="secondary" size="sm" onClick={onApply}>
          <CalendarDays size={14} />
          应用
        </Button>
      </div>
      <div className="sns-module__toggles">
        <label className="sns-module__toggle">
          <input
            type="checkbox"
            checked={filters.mediaOnly}
            onChange={(event) => onFiltersChange({ mediaOnly: event.currentTarget.checked })}
          />
          仅媒体
        </label>
        <label className="sns-module__toggle">
          <input
            type="checkbox"
            checked={filters.includeRead}
            onChange={(event) => onFiltersChange({ includeRead: event.currentTarget.checked })}
          />
          含已读通知
        </label>
      </div>
    </div>
  );
}

function NotificationList({
  notifications,
  notificationTargetIds,
  selectedPostId,
  privacyOn,
  emptyCopy,
  onSelectPost,
  onShowTimeline,
}: {
  notifications: AdaptedSnsNotification[];
  notificationTargetIds: string[];
  selectedPostId: string | null;
  privacyOn: boolean;
  emptyCopy: string;
  onSelectPost: (postId: string | null) => void;
  onShowTimeline: () => void;
}) {
  if (notifications.length === 0) {
    return (
      <div className="sns-module__empty">
        <Typography variant="label" weight={700}>
          {emptyCopy}
        </Typography>
      </div>
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
