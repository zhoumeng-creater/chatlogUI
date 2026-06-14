import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { X } from "lucide-react";
import { Button, Input, Select, Typography } from "@l4/ui";
import type { SnsDraftFilters } from "@l2/commander/snsFilterModel";
import type { SnsContentTypeFilter } from "@l2/data-clerk/stores/useSnsStore";

interface SnsFilterDrawerProps {
  open: boolean;
  draftFilters: SnsDraftFilters;
  filtersDirty: boolean;
  filterError: string | null;
  privacyOn: boolean;
  onDraftChange: (filters: Partial<SnsDraftFilters>) => void;
  onApply: () => void;
  onReset: () => void;
  onClose: () => void;
}

const CONTENT_TYPE_OPTIONS: SnsContentTypeFilter[] = [
  "all",
  "text",
  "image",
  "video",
  "article",
  "finder",
  "unknown",
];

const CONTENT_TYPE_LABELS: Record<SnsContentTypeFilter, string> = {
  all: "全部类型",
  text: "文本",
  image: "图片",
  video: "视频",
  article: "文章",
  finder: "视频号",
  unknown: "其他",
};

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

export function SnsFilterDrawer({
  open,
  draftFilters,
  filtersDirty,
  filterError,
  privacyOn,
  onDraftChange,
  onApply,
  onReset,
  onClose,
}: SnsFilterDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const restoreTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTarget = drawerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? drawerRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      restoreTarget?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;
  const authorHidden = privacyOn && draftFilters.user.trim().length > 0;

  const handleDrawerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || typeof document === "undefined") return;
    const drawer = drawerRef.current;
    if (!drawer) return;
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) {
      event.preventDefault();
      drawer.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !drawer.contains(active))) {
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
    <div className="sns-filter-drawer-shell">
      <button
        type="button"
        className="sns-filter-drawer__backdrop"
        aria-label="关闭朋友圈筛选"
        tabIndex={-1}
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        className="sns-filter-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sns-filter-drawer-title"
        tabIndex={-1}
        onKeyDown={handleDrawerKeyDown}
      >
      <div className="sns-filter-drawer__header">
        <div>
          <Typography id="sns-filter-drawer-title" variant="label" weight={700}>
            朋友圈筛选
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            作者、日期和通知读取状态会在应用后重新请求；类型和媒体只筛选当前结果。
          </Typography>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="关闭朋友圈筛选">
          <X size={14} />
        </Button>
      </div>

      {filtersDirty && (
        <span className="sns-filter-drawer__dirty" role="status">
          筛选未应用
        </span>
      )}
      {filterError && (
        <div className="sns-module__inline-error" role="alert">
          <Typography variant="caption" color="var(--danger)">
            {filterError}
          </Typography>
        </div>
      )}

      <div className="sns-filter-drawer__grid">
        <label className="sns-module__field">
          <span>作者</span>
          <Input
            controlSize="sm"
            value={privacyOn ? "" : draftFilters.user}
            onChange={(event) => onDraftChange({ user: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式下不可编辑作者" : "username"}
            disabled={privacyOn}
            aria-describedby={authorHidden ? "sns-filter-author-hidden" : undefined}
          />
          {authorHidden && (
            <span id="sns-filter-author-hidden" className="sns-filter-drawer__masked-value">
              已隐藏作者筛选
            </span>
          )}
          {authorHidden && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onDraftChange({ user: "" })}>
              清除作者筛选
            </Button>
          )}
        </label>
        <label className="sns-module__field">
          <span>类型</span>
          <Select
            controlSize="sm"
            value={draftFilters.contentType}
            onChange={(event) => onDraftChange({ contentType: event.currentTarget.value as SnsContentTypeFilter })}
          >
            {CONTENT_TYPE_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {CONTENT_TYPE_LABELS[item]}
              </option>
            ))}
          </Select>
        </label>
        <label className="sns-module__field">
          <span>开始</span>
          <Input
            controlSize="sm"
            type="date"
            value={draftFilters.since}
            onChange={(event) => onDraftChange({ since: event.currentTarget.value })}
          />
        </label>
        <label className="sns-module__field">
          <span>结束</span>
          <Input
            controlSize="sm"
            type="date"
            value={draftFilters.until}
            onChange={(event) => onDraftChange({ until: event.currentTarget.value })}
          />
        </label>
      </div>

      <div className="sns-filter-drawer__toggles">
        <label className="sns-module__toggle">
          <input
            type="checkbox"
            checked={draftFilters.mediaOnly}
            onChange={(event) => onDraftChange({ mediaOnly: event.currentTarget.checked })}
          />
          仅媒体
        </label>
        <label className="sns-module__toggle">
          <input
            type="checkbox"
            checked={draftFilters.includeRead}
            onChange={(event) => onDraftChange({ includeRead: event.currentTarget.checked })}
          />
          包含已读通知
        </label>
      </div>

      <div className="sns-filter-drawer__actions">
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          重置
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={onApply}>
          应用筛选
        </Button>
      </div>
      </div>
    </div>
  );
}
