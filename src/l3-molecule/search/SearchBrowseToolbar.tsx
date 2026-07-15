import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Check, ChevronDown, Download, MoreHorizontal } from "lucide-react";
import type {
  SearchPresentationGroupingMode,
  SearchPresentationSortMode,
} from "@l2/commander/searchResultPresentation";
import type { SearchWindowBrowseMode } from "@l2/commander/searchResultWindowModel";
import { classNames } from "@/utils/classNames";

export type SearchToolbarMenu = "browse" | "sort" | "group" | "more" | null;
export type SearchToolbarInputModality = "keyboard" | "pointer";

export function resolveSearchToolbarInputModality(clickDetail: number): SearchToolbarInputModality {
  return clickDetail === 0 ? "keyboard" : "pointer";
}

interface SearchBrowseToolbarProps {
  appliedQuery: string;
  appliedScopeLabel: string;
  loadedCount: number;
  totalCount: number;
  exactTotal: boolean;
  completeScope: boolean;
  browseMode: SearchWindowBrowseMode;
  sortMode: SearchPresentationSortMode;
  groupingMode: SearchPresentationGroupingMode;
  currentPageStart: number;
  currentPageCount: number;
  privacyOn: boolean;
  exportDisabled: boolean;
  exportDisabledReason?: string;
  pendingReplacement?: boolean;
  stale?: boolean;
  openMenu?: SearchToolbarMenu;
  onOpenMenuChange?: (menu: SearchToolbarMenu) => void;
  onBrowseModeChange: (
    mode: SearchWindowBrowseMode,
    modality: SearchToolbarInputModality,
  ) => void;
  onSortModeChange: (mode: SearchPresentationSortMode) => void;
  onGroupingModeChange: (mode: SearchPresentationGroupingMode) => void;
  onOpenExport: () => void;
  onEndSearch?: () => void;
  onRefresh?: () => void;
}

const BROWSE_OPTIONS: Array<{
  value: SearchWindowBrowseMode;
  label: string;
  description: string;
}> = [
  { value: "manual", label: "手动加载", description: "由你决定何时加载前后 50 条" },
  { value: "infinite", label: "连续浏览", description: "接近边界时自动加载，失败后停止" },
  { value: "paged", label: "分页浏览", description: "每次只显示一个 50 条页面" },
];

const SORT_OPTIONS: Array<{ value: SearchPresentationSortMode; label: string }> = [
  { value: "newest", label: "时间从新到旧" },
  { value: "oldest", label: "时间从早到晚" },
];

const GROUP_OPTIONS: Array<{ value: SearchPresentationGroupingMode; label: string }> = [
  { value: "none", label: "不分组" },
  { value: "conversation", label: "按会话分组" },
  { value: "date", label: "按日期分组" },
];

export function SearchBrowseToolbar({
  appliedQuery,
  appliedScopeLabel,
  loadedCount,
  totalCount,
  exactTotal,
  completeScope,
  browseMode,
  sortMode,
  groupingMode,
  currentPageStart,
  currentPageCount,
  privacyOn,
  exportDisabled,
  exportDisabledReason,
  pendingReplacement = false,
  stale = false,
  openMenu,
  onOpenMenuChange,
  onBrowseModeChange,
  onSortModeChange,
  onGroupingModeChange,
  onOpenExport,
  onEndSearch,
  onRefresh,
}: SearchBrowseToolbarProps) {
  const toolbarRef = useRef<HTMLElement | null>(null);
  const [internalMenu, setInternalMenu] = useState<SearchToolbarMenu>(null);
  const resolvedMenu = openMenu === undefined ? internalMenu : openMenu;
  const setMenu = useCallback(
    (menu: SearchToolbarMenu) => {
      if (openMenu === undefined) setInternalMenu(menu);
      onOpenMenuChange?.(menu);
    },
    [onOpenMenuChange, openMenu],
  );
  const closeMenu = useCallback(
    (restoreFocus = false) => {
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const trigger = active
        ?.closest<HTMLElement>(".search-browse-toolbar__menu-shell")
        ?.querySelector<HTMLButtonElement>("button[data-menu-trigger]");
      setMenu(null);
      if (restoreFocus) requestAnimationFrame(() => trigger?.focus());
    },
    [setMenu],
  );

  useEffect(() => {
    if (!resolvedMenu) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (toolbarRef.current?.contains(event.target as Node)) return;
      setMenu(null);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [resolvedMenu, setMenu]);
  const queryLabel = privacyOn ? "已隐藏关键词" : `“${appliedQuery}”`;
  const scopeLabel = privacyOn ? "受保护范围" : appliedScopeLabel;
  const countLabel = exactTotal
    ? `已加载 ${loadedCount.toLocaleString()} / 共 ${totalCount.toLocaleString()}`
    : `已加载 ${loadedCount.toLocaleString()} 条（总数待确认）`;
  const pageLabel =
    browseMode === "paged" && currentPageCount > 0
      ? `第 ${(currentPageStart + 1).toLocaleString()}–${(
          currentPageStart + currentPageCount
        ).toLocaleString()} 条`
      : null;
  const resolvedSortMode = sortMode === "oldest" ? "oldest" : "newest";

  return (
    <section ref={toolbarRef} className="search-browse-toolbar" aria-label="搜索结果工具栏">
      <div className="search-browse-toolbar__summary">
        <strong>{queryLabel}的搜索结果</strong>
        <span>已在{scopeLabel}中检索</span>
        <span>{countLabel}</span>
        {pageLabel && <span>{pageLabel}</span>}
        {!completeScope && <span>当前结果不代表全部可检索会话</span>}
        {pendingReplacement && <span role="status">正在准备新结果，当前仍显示上次结果</span>}
        {stale && (
          <span role="status">
            数据已变化，当前结果已冻结。
            {onRefresh && (
              <button type="button" disabled={pendingReplacement} onClick={onRefresh}>
                {pendingReplacement ? "等待新搜索结束后刷新" : "刷新搜索"}
              </button>
            )}
          </span>
        )}
      </div>

      <div className="search-browse-toolbar__controls">
        <ToolbarMenu
          id="browse"
          label={`浏览方式：${labelFor(BROWSE_OPTIONS, browseMode)}`}
          open={resolvedMenu === "browse"}
          onToggle={() => setMenu(resolvedMenu === "browse" ? null : "browse")}
        >
          {BROWSE_OPTIONS.map((option) => (
            <MenuChoice
              key={option.value}
              label={option.label}
              description={option.description}
              selected={browseMode === option.value}
              onChoose={(modality) => {
                onBrowseModeChange(option.value, modality);
                closeMenu(modality === "pointer");
              }}
            />
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={(event) => {
              const modality = resolveSearchToolbarInputModality(event.detail);
              onBrowseModeChange("manual", modality);
              closeMenu(modality === "pointer");
            }}
          >
            恢复默认方式
          </button>
        </ToolbarMenu>

        <ToolbarMenu
          id="sort"
          label={`排序：${labelFor(SORT_OPTIONS, resolvedSortMode)}`}
          open={resolvedMenu === "sort"}
          onToggle={() => setMenu(resolvedMenu === "sort" ? null : "sort")}
        >
          {SORT_OPTIONS.map((option) => (
            <MenuChoice
              key={option.value}
              label={option.label}
              selected={resolvedSortMode === option.value}
              onChoose={() => {
                onSortModeChange(option.value);
                closeMenu(true);
              }}
            />
          ))}
        </ToolbarMenu>

        <ToolbarMenu
          id="group"
          label={`分组：${labelFor(GROUP_OPTIONS, groupingMode)}`}
          open={resolvedMenu === "group"}
          onToggle={() => setMenu(resolvedMenu === "group" ? null : "group")}
        >
          {GROUP_OPTIONS.map((option) => (
            <MenuChoice
              key={option.value}
              label={option.label}
              selected={groupingMode === option.value}
              onChoose={() => {
                onGroupingModeChange(option.value);
                closeMenu(true);
              }}
            />
          ))}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onSortModeChange("newest");
              onGroupingModeChange("none");
              closeMenu(true);
            }}
          >
            恢复默认整理
          </button>
        </ToolbarMenu>

        <span className="search-browse-toolbar__local-note">仅整理已加载结果</span>
        <button
          type="button"
          className="search-browse-toolbar__export"
          aria-label="导出搜索结果"
          aria-describedby={exportDisabledReason ? "search-export-disabled-reason" : undefined}
          disabled={exportDisabled}
          onClick={onOpenExport}
        >
          <Download size={17} aria-hidden="true" />
        </button>
        {onEndSearch && (
          <ToolbarMenu
            id="more"
            label="更多结果操作"
            iconOnly
            open={resolvedMenu === "more"}
            onToggle={() => setMenu(resolvedMenu === "more" ? null : "more")}
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                closeMenu(true);
                onEndSearch();
              }}
            >
              结束当前搜索
            </button>
          </ToolbarMenu>
        )}
      </div>
      {exportDisabled && exportDisabledReason && (
        <span id="search-export-disabled-reason" className="search-browse-toolbar__export-reason">
          {exportDisabledReason}
        </span>
      )}
    </section>
  );
}

function ToolbarMenu({
  id,
  label,
  open,
  onToggle,
  iconOnly = false,
  children,
}: {
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  iconOnly?: boolean;
  children: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    focusFirstSearchToolbarMenuItem(menuRef.current);
  }, [open]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
    );
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onToggle();
      requestAnimationFrame(() => triggerRef.current?.focus());
      return;
    }
    if (event.key === "Tab") {
      onToggle();
      return;
    }
    const nextIndex = resolveMenuFocusIndex(event.key, currentIndex, items.length);
    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  return (
    <div className="search-browse-toolbar__menu-shell">
      <button
        ref={triggerRef}
        data-menu-trigger
        type="button"
        className={classNames(iconOnly && "search-browse-toolbar__icon-trigger")}
        aria-label={iconOnly ? label : undefined}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={`search-toolbar-${id}-menu`}
        onClick={onToggle}
      >
        {iconOnly ? (
          <MoreHorizontal size={17} aria-hidden="true" />
        ) : (
          <>
            {label}
            <ChevronDown size={14} aria-hidden="true" />
          </>
        )}
      </button>
      {open && (
        <div
          ref={menuRef}
          id={`search-toolbar-${id}-menu`}
          role="menu"
          className="search-browse-toolbar__menu"
          onKeyDown={handleMenuKeyDown}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function focusFirstSearchToolbarMenuItem(menu: HTMLDivElement | null): boolean {
  const firstItem = menu?.querySelector<HTMLButtonElement>("button:not(:disabled)") ?? null;
  if (!firstItem) return false;
  firstItem.focus();
  return true;
}

export function resolveMenuFocusIndex(
  key: string,
  currentIndex: number,
  itemCount: number,
): number | null {
  if (itemCount === 0) return null;
  if (key === "Home") return 0;
  if (key === "End") return itemCount - 1;
  if (key === "ArrowDown") return currentIndex < 0 ? 0 : (currentIndex + 1) % itemCount;
  if (key === "ArrowUp") {
    return currentIndex < 0 ? itemCount - 1 : (currentIndex - 1 + itemCount) % itemCount;
  }
  return null;
}

function MenuChoice({
  label,
  description,
  selected,
  onChoose,
}: {
  label: string;
  description?: string;
  selected: boolean;
  onChoose: (modality: SearchToolbarInputModality) => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={(event) => onChoose(resolveSearchToolbarInputModality(event.detail))}
    >
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      {selected && <Check size={14} aria-hidden="true" />}
    </button>
  );
}

function labelFor<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: T,
): string {
  return options.find((option) => option.value === value)?.label ?? options[0].label;
}
