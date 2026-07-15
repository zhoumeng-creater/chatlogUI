import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from "react";
import { Check, ChevronDown, LoaderCircle, Search } from "lucide-react";
import { SEARCH_CATEGORIES } from "@/utils/constants";
import type { SearchCategory } from "@l2/api-docs/search";
import type {
  SearchDirectoryKind,
  SearchDirectoryModel,
  SearchDirectoryOption,
} from "@l2/commander/searchDirectoryModel";
import type {
  SearchDraft,
  SearchConditionDraftIntent,
  SearchDraftDirtySource,
  SearchDraftErrors,
} from "@l2/commander/searchDraftModel";
import type { SearchDateShortcut } from "@l2/commander/searchDateRange";
import { IntegratedDateRangeInput } from "./IntegratedDateRangeInput";

export type SearchConditionPanel =
  | "scope"
  | "categories"
  | "conversations"
  | "senders"
  | "date"
  | null;

interface SearchConditionBarProps {
  draft: SearchDraft;
  pending: boolean;
  currentConversation: { id: string; label: string } | null;
  conversationDirectory: SearchDirectoryModel;
  senderDirectory: SearchDirectoryModel;
  senderCapability: boolean;
  privacyOn: boolean;
  dirtySources: SearchDraftDirtySource[];
  validationErrors: SearchDraftErrors;
  dateErrors: { startError?: string; endError?: string; rangeError?: string };
  openPanel?: SearchConditionPanel;
  onOpenPanelChange?: (panel: SearchConditionPanel) => void;
  onConditionIntent: (intent: SearchConditionDraftIntent) => void;
  onCancelDraft: () => void;
  onClearDirectorySelection: (kind: SearchDirectoryKind) => void;
  onDateShortcut: (shortcut: SearchDateShortcut) => void;
  onOpenConversationWorkspace: () => void;
  onDirectoryQueryChange: (kind: SearchDirectoryKind, query: string) => void;
  onDirectorySearch: (kind: SearchDirectoryKind) => void;
  onDirectoryLoadMore: (kind: SearchDirectoryKind) => void;
  onToggleDirectorySelection: (
    kind: SearchDirectoryKind,
    option: SearchDirectoryOption,
  ) => void;
}

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  text: "文字",
  image_emoji: "图片与表情",
  video: "视频",
  voice: "语音",
  file: "文件",
  link_card: "链接与卡片",
  quote_forward: "引用与转发",
  location: "位置",
  system_other: "系统与其他",
};

export function SearchConditionBar({
  draft,
  pending,
  currentConversation,
  conversationDirectory,
  senderDirectory,
  senderCapability,
  privacyOn,
  dirtySources,
  validationErrors,
  dateErrors,
  openPanel,
  onOpenPanelChange,
  onConditionIntent,
  onCancelDraft,
  onClearDirectorySelection,
  onDateShortcut,
  onOpenConversationWorkspace,
  onDirectoryQueryChange,
  onDirectorySearch,
  onDirectoryLoadMore,
  onToggleDirectorySelection,
}: SearchConditionBarProps) {
  const [internalPanel, setInternalPanel] = useState<SearchConditionPanel>(null);
  const barRef = useRef<HTMLElement | null>(null);
  const resolvedPanel = openPanel === undefined ? internalPanel : openPanel;
  const restoreTargetRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusOnCloseRef = useRef(false);
  const previousPanelRef = useRef<SearchConditionPanel>(resolvedPanel);
  const panelTransitionRef = useRef(false);
  const hasDirtyDraft = dirtySources.length > 0;
  const dirtyStatusText = getSearchDraftStatusText(dirtySources);
  const scopeResolutionError =
    draft.scope.kind === "current" && !draft.scope.chatId
      ? validationErrors.scope
      : undefined;

  const setPanel = useCallback(
    (
      panel: SearchConditionPanel,
      target?: HTMLButtonElement | null,
      restoreFocusOnClose = true,
    ) => {
      if (panel && resolvedPanel && panel !== resolvedPanel) {
        panelTransitionRef.current = true;
        requestAnimationFrame(() => {
          panelTransitionRef.current = false;
        });
      }
      if (target) {
        restoreTargetRef.current = target;
        restoreFocusOnCloseRef.current = true;
      }
      if (!panel) restoreFocusOnCloseRef.current = restoreFocusOnClose;
      if (openPanel === undefined) setInternalPanel(panel);
      onOpenPanelChange?.(panel);
    },
    [onOpenPanelChange, openPanel, resolvedPanel],
  );

  useEffect(() => {
    if (previousPanelRef.current && !resolvedPanel) {
      if (restoreFocusOnCloseRef.current && restoreTargetRef.current?.isConnected) {
        restoreTargetRef.current.focus({ preventScroll: true });
      }
      restoreFocusOnCloseRef.current = false;
    }
    previousPanelRef.current = resolvedPanel;
  }, [resolvedPanel]);

  useEffect(() => {
    if (!resolvedPanel) return;
    const focusFrame = requestAnimationFrame(() => {
      if (resolvedPanel === "date") return;
      const panel = barRef.current?.querySelector<HTMLElement>(
        `[data-search-condition-panel="${resolvedPanel}"]`,
      );
      if (!panel) return;
      if (resolvedPanel === "scope" || resolvedPanel === "categories") {
        const items = getCompositeFocusItems(panel);
        items.forEach((item, index) => {
          item.tabIndex = index === 0 ? 0 : -1;
        });
        items[0]?.focus();
        return;
      }
      panel.querySelector<HTMLElement>("input, button:not(:disabled)")?.focus();
    });
    const handlePointerDown = (event: PointerEvent) => {
      if (barRef.current?.contains(event.target as Node)) return;
      setPanel(null, undefined, false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [resolvedPanel, setPanel]);

  const closeOnEscape = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    setPanel(null);
  };

  const handleConditionMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (shouldCloseSearchConditionMenuOnTab(event.key)) {
      setPanel(null, undefined, false);
      return;
    }
    if (event.key === "Escape") {
      closeOnEscape(event);
      return;
    }
    moveCompositeFocus(event);
  };

  const closeOnFocusLeave = (event: FocusEvent<HTMLElement>) => {
    if (panelTransitionRef.current) {
      panelTransitionRef.current = false;
      return;
    }
    if (
      !shouldCloseSearchConditionPanelOnBlur(
        Boolean(resolvedPanel),
        Boolean(event.currentTarget.contains(event.relatedTarget as Node | null)),
        event.relatedTarget !== null,
      )
    ) {
      return;
    }
    setPanel(null, undefined, false);
  };

  const scopeLabel = getScopeLabel(draft, currentConversation, privacyOn);
  const categoryLabel = getCategoryLabel(draft.categories);

  return (
    <section
      ref={barRef}
      className={
        scopeResolutionError
          ? "search-condition-bar search-condition-bar--scope-resolution-error"
          : "search-condition-bar"
      }
      aria-label="搜索条件"
      onBlur={closeOnFocusLeave}
      onKeyDown={(event) => {
        if (!shouldCancelSearchDraftOnConditionEscape(
          event.key,
          resolvedPanel,
          dirtySources,
        )) return;
        event.preventDefault();
        event.stopPropagation();
        onCancelDraft();
      }}
    >
      <div className="search-condition-bar__primary">
        <div className="search-condition-bar__control">
          <button
            type="button"
            className="search-condition-bar__trigger"
            data-coach-anchor="workspace-scope"
            aria-haspopup="menu"
            aria-expanded={resolvedPanel === "scope"}
            onClick={(event) =>
              setPanel(resolvedPanel === "scope" ? null : "scope", event.currentTarget)
            }
          >
            {scopeLabel}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {resolvedPanel === "scope" && (
            <div
              role="menu"
              data-search-condition-panel="scope"
              aria-label="搜索范围"
              className="search-condition-bar__menu"
              onKeyDown={handleConditionMenuKeyDown}
            >
              <MenuChoice
                label="全部会话"
                selected={draft.scope.kind === "all"}
                onClick={() => {
                  onConditionIntent({ type: "choose-all-conversations" });
                  setPanel(null);
                }}
              />
              <MenuChoice
                label={
                  currentConversation
                    ? privacyOn
                      ? "当前会话（名称已隐藏）"
                      : `当前会话 · ${currentConversation.label}`
                    : "当前会话不可用"
                }
                selected={draft.scope.kind === "current"}
                disabled={!currentConversation}
                onClick={() => {
                  if (!currentConversation) return;
                  onConditionIntent({
                    type: "choose-current-conversation",
                    conversationId: currentConversation.id,
                  });
                  setPanel(null);
                }}
              />
              {!currentConversation && (
                <button
                  type="button"
                  role="menuitem"
                  className="search-condition-bar__recovery"
                  onClick={onOpenConversationWorkspace}
                >
                  去会话工作台选择
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                className="search-condition-bar__menu-choice"
                onClick={() => setPanel("conversations")}
              >
                <span>指定会话</span>
                {draft.scope.kind === "selected" && (
                  <span>{draft.scope.chatIds.length.toLocaleString()} 个</span>
                )}
              </button>
              {validationErrors.scope && draft.scope.kind !== "current" && (
                <p className="search-condition-bar__field-error">{validationErrors.scope}</p>
              )}
            </div>
          )}
        </div>

        <div className="search-condition-bar__control">
          <button
            type="button"
            className="search-condition-bar__trigger"
            aria-haspopup="menu"
            aria-expanded={resolvedPanel === "categories"}
            onClick={(event) =>
              setPanel(
                resolvedPanel === "categories" ? null : "categories",
                event.currentTarget,
              )
            }
          >
            {categoryLabel}
            <ChevronDown size={14} aria-hidden="true" />
          </button>
          {resolvedPanel === "categories" && (
            <div
              role="menu"
              data-search-condition-panel="categories"
              aria-label="消息类型"
              className="search-condition-bar__menu search-condition-bar__category-menu"
              onKeyDown={handleConditionMenuKeyDown}
            >
              <MenuChoice
                label="全部消息类型"
                selected={draft.categories.length === 0}
                onClick={() => {
                  onConditionIntent({ type: "clear-message-categories" });
                  setPanel(null);
                }}
              />
              {SEARCH_CATEGORIES.map((category) => {
                const selected = draft.categories.includes(category);
                return (
                  <button
                    key={category}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={selected}
                    onClick={() =>
                      onConditionIntent({
                        type: "toggle-message-category",
                        category,
                      })
                    }
                  >
                    <span>{CATEGORY_LABELS[category]}</span>
                    {selected && <Check size={14} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {senderCapability && (
          <div className="search-condition-bar__control">
            <button
              type="button"
              className="search-condition-bar__trigger"
              aria-haspopup="dialog"
              aria-expanded={resolvedPanel === "senders"}
              onClick={(event) =>
                setPanel(resolvedPanel === "senders" ? null : "senders", event.currentTarget)
              }
            >
              {draft.senderIds.length > 0
                ? `发送者 · ${draft.senderIds.length.toLocaleString()}`
                : "更多筛选"}
              <ChevronDown size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        <IntegratedDateRangeInput
          value={draft.dateRange}
          onChange={(value) => onConditionIntent({ type: "change-date-range", value })}
          disabled={pending}
          errors={dateErrors}
          onShortcut={onDateShortcut}
          open={resolvedPanel === "date"}
          onOpenChange={(next, trigger) => setPanel(next ? "date" : null, trigger)}
        />
      </div>

      {resolvedPanel === "conversations" && (
        <DirectoryPicker
          heading="选择会话范围"
          panel="conversations"
          kind="conversation"
          model={conversationDirectory}
          draft={draft}
          privacyOn={privacyOn}
          onClose={() => setPanel(null)}
          onQueryChange={onDirectoryQueryChange}
          onSearch={onDirectorySearch}
          onLoadMore={onDirectoryLoadMore}
          onToggle={onToggleDirectorySelection}
          onClearSelected={onClearDirectorySelection}
          onKeyDown={closeOnEscape}
        />
      )}
      {resolvedPanel === "senders" && senderCapability && (
        <DirectoryPicker
          heading="按发送者筛选"
          panel="senders"
          kind="sender"
          model={senderDirectory}
          draft={draft}
          privacyOn={privacyOn}
          onClose={() => setPanel(null)}
          onQueryChange={onDirectoryQueryChange}
          onSearch={onDirectorySearch}
          onLoadMore={onDirectoryLoadMore}
          onToggle={onToggleDirectorySelection}
          onClearSelected={onClearDirectorySelection}
          onKeyDown={closeOnEscape}
        />
      )}

      <div className="search-condition-bar__status">
        {scopeResolutionError && (
          <div
            className="search-condition-bar__scope-resolution-error"
            role="alert"
            aria-live="assertive"
          >
            <span>{scopeResolutionError}</span>
            <div className="search-condition-bar__scope-resolution-actions">
              <button
                type="button"
                disabled={pending}
                onClick={(event) => setPanel("conversations", event.currentTarget)}
              >
                选择会话
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  onConditionIntent({ type: "choose-all-conversations" });
                  setPanel(null, undefined, false);
                }}
              >
                改为全部会话
              </button>
            </div>
          </div>
        )}
        {hasDirtyDraft && dirtyStatusText && (
          <>
            <span className="search-condition-bar__dirty" role="status">
              {dirtyStatusText}
            </span>
            <button type="button" disabled={pending} onClick={onCancelDraft}>
              取消修改
            </button>
          </>
        )}
      </div>
    </section>
  );
}

function MenuChoice({
  label,
  selected,
  disabled = false,
  onClick,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      className="search-condition-bar__menu-choice"
      onClick={onClick}
    >
      <span>{label}</span>
      {selected && <Check size={14} aria-hidden="true" />}
    </button>
  );
}

function DirectoryPicker({
  heading,
  panel,
  kind,
  model,
  draft,
  privacyOn,
  onClose,
  onQueryChange,
  onSearch,
  onLoadMore,
  onToggle,
  onClearSelected,
  onKeyDown,
}: {
  heading: string;
  panel: "conversations" | "senders";
  kind: SearchDirectoryKind;
  model: SearchDirectoryModel;
  draft: SearchDraft;
  privacyOn: boolean;
  onClose: () => void;
  onQueryChange: (kind: SearchDirectoryKind, query: string) => void;
  onSearch: (kind: SearchDirectoryKind) => void;
  onLoadMore: (kind: SearchDirectoryKind) => void;
  onToggle: (kind: SearchDirectoryKind, option: SearchDirectoryOption) => void;
  onClearSelected: (kind: SearchDirectoryKind) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}) {
  const queryInputRef = useRef<HTMLInputElement | null>(null);
  const [privacyEditing, setPrivacyEditing] = useState(false);
  useEffect(() => {
    if (privacyOn) setPrivacyEditing(false);
  }, [privacyOn]);
  const sections = buildDirectoryPickerSections(kind, model, draft);
  const kindLabel = kind === "conversation" ? "会话" : "发送者";
  return (
    <div
      role="dialog"
      aria-label={heading}
      data-search-condition-panel={panel}
      className="search-condition-directory"
      onKeyDown={onKeyDown}
    >
      <div className="search-condition-directory__header">
        <strong>{heading}</strong>
        <button type="button" onClick={onClose}>
          完成
        </button>
      </div>
      <form
        className="search-condition-directory__search"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(kind);
          if (privacyOn) {
            setPrivacyEditing(false);
            queryInputRef.current?.blur();
          }
        }}
      >
        <input
          ref={queryInputRef}
          type={privacyOn ? "password" : "search"}
          autoComplete="off"
          aria-label={kind === "conversation" ? "搜索会话目录" : "搜索发送者目录"}
          placeholder={kind === "conversation" ? "输入会话名称" : "输入发送者名称"}
          value={privacyOn && !privacyEditing && model.query.length > 0 ? "••••••••" : model.query}
          onFocus={() => {
            if (privacyOn) setPrivacyEditing(true);
          }}
          onClick={() => {
            if (privacyOn) setPrivacyEditing(true);
          }}
          onBlur={() => {
            if (privacyOn) setPrivacyEditing(false);
          }}
          onChange={(event) => {
            if (privacyOn && !privacyEditing) return;
            onQueryChange(kind, event.currentTarget.value);
          }}
        />
        <button type="submit" aria-label="查询目录">
          <Search size={16} aria-hidden="true" />
        </button>
      </form>
      {model.status === "loading" && model.loadingMode === "replace" && (
        <p role="status">
          <LoaderCircle size={15} aria-hidden="true" /> 正在加载目录…
        </p>
      )}
      {model.status === "error" && (
        <p role="alert">目录暂不可用，请手动重试。</p>
      )}
      {sections.selectedCount > 0 && (
        <section
          className="search-condition-directory__selected"
          aria-label={`已选${kindLabel}`}
        >
          <div className="search-condition-directory__selected-header">
            <strong>已选 {sections.selectedCount.toLocaleString()} 个</strong>
            <button type="button" onClick={() => onClearSelected(kind)}>
              清空全部已选（{sections.selectedCount.toLocaleString()}）
            </button>
          </div>
          {sections.selected.length > 0 && (
            <div role="group" aria-label={`已选${kindLabel}选项`} onKeyDown={moveCompositeFocus}>
              {sections.selected.map((option, index) => (
                <DirectoryOptionButton
                  key={option.id}
                  option={option}
                  selected
                  privacyOn={privacyOn}
                  privacyIndex={index}
                  onToggle={() => onToggle(kind, option)}
                />
              ))}
            </div>
          )}
          {sections.unresolvedSelectedCount > 0 && (
            <p>
              另有 {sections.unresolvedSelectedCount.toLocaleString()} 个已选项的名称暂未加载；
              可保留选择或清空全部已选。
            </p>
          )}
        </section>
      )}
      <div
        role="group"
        aria-label={`${heading}查询结果`}
        onKeyDown={moveCompositeFocus}
      >
        {sections.results.map((option, index) => (
          <DirectoryOptionButton
            key={option.id}
            option={option}
            selected={false}
            privacyOn={privacyOn}
            privacyIndex={sections.selected.length + index}
            onToggle={() => onToggle(kind, option)}
          />
        ))}
      </div>
      {model.status === "ready" && sections.results.length === 0 && <p>没有匹配目录项。</p>}
      {model.hasMore && (
        <button
          type="button"
          disabled={model.status === "loading"}
          onClick={() => onLoadMore(kind)}
        >
          {model.status === "loading" ? "正在加载更多…" : "加载更多"}
        </button>
      )}
    </div>
  );
}

function DirectoryOptionButton({
  option,
  selected,
  privacyOn,
  privacyIndex,
  onToggle,
}: {
  option: SearchDirectoryOption;
  selected: boolean;
  privacyOn: boolean;
  privacyIndex: number;
  onToggle: () => void;
}) {
  const visibleName = privateSafeDirectoryName(option, privacyOn, privacyIndex);
  return (
    <button
      type="button"
      aria-label={`${selected ? "取消选择" : "选择"}：${visibleName}`}
      aria-pressed={selected}
      className="search-condition-directory__option"
      onClick={onToggle}
    >
      <span>{visibleName}</span>
      {!privacyOn && option.disambiguator && <small>{option.disambiguator}</small>}
      {!privacyOn && option.kind === "sender" && option.contextLabel && (
        <small>{option.contextLabel}</small>
      )}
      {selected && <Check size={14} aria-hidden="true" />}
    </button>
  );
}

export interface DirectoryPickerSections {
  selected: SearchDirectoryOption[];
  results: SearchDirectoryOption[];
  selectedCount: number;
  unresolvedSelectedCount: number;
}

export function buildDirectoryPickerSections(
  kind: SearchDirectoryKind,
  model: SearchDirectoryModel,
  draft: SearchDraft,
): DirectoryPickerSections {
  const selectedIds = getVisibleDirectorySelectionIds(draft, kind);
  const selectedIdSet = new Set(selectedIds);
  const optionById = new Map<string, SearchDirectoryOption>();
  for (const option of [...model.selected, ...model.items]) {
    if (option.kind !== kind || !option.id || optionById.has(option.id)) continue;
    optionById.set(option.id, option);
  }
  const selected = selectedIds.flatMap((id) => {
    const option = optionById.get(id);
    return option ? [option] : [];
  });
  const results = uniqueDirectoryOptions(model.items)
    .filter((option) => option.kind === kind && !selectedIdSet.has(option.id));
  return {
    selected,
    results,
    selectedCount: selectedIds.length,
    unresolvedSelectedCount: selectedIds.length - selected.length,
  };
}

function getVisibleDirectorySelectionIds(
  draft: SearchDraft,
  kind: SearchDirectoryKind,
): string[] {
  const ids = kind === "sender"
    ? draft.senderIds
    : draft.scope.kind === "selected"
      ? draft.scope.chatIds
      : [];
  const seen = new Set<string>();
  return ids.flatMap((value) => {
    const id = value.trim();
    if (!id || seen.has(id)) return [];
    seen.add(id);
    return [id];
  });
}

export function resolveCompositeFocusIndex(
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

export function getSearchDraftStatusText(
  dirtySources: readonly SearchDraftDirtySource[],
): "修改尚未应用" | "筛选尚未应用" | null {
  if (dirtySources.length === 0) return null;
  return dirtySources.every((source) => source === "keyword")
    ? "修改尚未应用"
    : "筛选尚未应用";
}

export function shouldCancelSearchDraftOnConditionEscape(
  key: string,
  openPanel: SearchConditionPanel,
  dirtySources: readonly SearchDraftDirtySource[],
): boolean {
  return key === "Escape" && openPanel === null && dirtySources.length > 0;
}

export function shouldCloseSearchConditionMenuOnTab(key: string): boolean {
  return key === "Tab";
}

function moveCompositeFocus(event: KeyboardEvent<HTMLElement>) {
  const items = getCompositeFocusItems(event.currentTarget);
  const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
  const nextIndex = resolveCompositeFocusIndex(event.key, currentIndex, items.length);
  if (nextIndex === null) return;
  event.preventDefault();
  items.forEach((item, index) => {
    item.tabIndex = index === nextIndex ? 0 : -1;
  });
  items[nextIndex]?.focus();
}

function getCompositeFocusItems(root: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    root.querySelectorAll<HTMLButtonElement>(
      'button:not(:disabled)[role="menuitem"], button:not(:disabled)[role="menuitemradio"], button:not(:disabled)[role="menuitemcheckbox"], button:not(:disabled)[aria-pressed="true"], button:not(:disabled)[aria-pressed="false"]',
    ),
  );
}

function getScopeLabel(
  draft: SearchDraft,
  currentConversation: SearchConditionBarProps["currentConversation"],
  privacyOn: boolean,
): string {
  if (draft.scope.kind === "all") return "全部会话";
  if (draft.scope.kind === "selected") {
    return `指定会话 · ${draft.scope.chatIds.length.toLocaleString()}`;
  }
  if (!currentConversation) return "当前会话不可用";
  return privacyOn ? "当前会话" : `当前会话 · ${currentConversation.label}`;
}

function getCategoryLabel(categories: SearchCategory[]): string {
  if (categories.length === 0) return "全部消息类型";
  if (categories.length === 1) return CATEGORY_LABELS[categories[0]];
  return `消息类型 · ${categories.length.toLocaleString()}`;
}

function uniqueDirectoryOptions(options: readonly SearchDirectoryOption[]): SearchDirectoryOption[] {
  const seen = new Set<string>();
  return options.filter((option) => {
    if (!option.id || seen.has(option.id)) return false;
    seen.add(option.id);
    return true;
  });
}

export function shouldCloseSearchConditionPanelOnBlur(
  panelOpen: boolean,
  focusRemainsInside: boolean,
  hasRelatedTarget = true,
): boolean {
  return panelOpen && hasRelatedTarget && !focusRemainsInside;
}

function privateSafeDirectoryName(
  option: SearchDirectoryOption,
  privacyOn: boolean,
  index: number,
): string {
  if (!privacyOn) return option.displayName;
  const kindLabel = option.kind === "conversation" ? "会话" : "发送者";
  return `${kindLabel} ${index + 1}（名称已隐藏）`;
}
