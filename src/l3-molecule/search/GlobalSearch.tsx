import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { Button, DisabledReason, IconButton, Input, Spinner, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";

interface GlobalSearchProps {
  query: string;
  loading: boolean;
  privacyOn: boolean;
  recentQueries?: string[];
  onSearch: (keyword: string) => void;
  onExecuteSearch: (keyword: string) => void;
  onClearSearch: () => void;
  onUseRecentQuery?: (query: string) => void;
  onDeleteRecentQuery?: (query: string) => void;
  onClearRecentQueries?: () => void;
  onEscapeWithoutOverlay?: () => boolean;
  historyOpen?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  submitDisabledReason?: string;
  keywordError?: string;
  keywordGraphemeCount?: number;
  focusRequestToken?: number;
  className?: string;
}

export function GlobalSearch({
  query,
  loading,
  privacyOn,
  recentQueries = [],
  onSearch,
  onExecuteSearch,
  onClearSearch,
  onUseRecentQuery,
  onDeleteRecentQuery,
  onClearRecentQueries,
  onEscapeWithoutOverlay,
  historyOpen,
  submitLabel = "搜索",
  submitDisabled,
  submitDisabledReason,
  keywordError,
  keywordGraphemeCount = 0,
  focusRequestToken = 0,
  className,
}: GlobalSearchProps) {
  const inputId = useId();
  const keywordErrorId = `${inputId}-keyword-error`;
  const keywordCountId = `${inputId}-keyword-count`;
  const historyLabelId = `${inputId}-history-label`;
  const historyMenuId = `${inputId}-history-menu`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [uncontrolledHistoryOpen, setUncontrolledHistoryOpen] = useState(false);
  const [activeHistoryIndex, setActiveHistoryIndex] = useState(-1);
  const [privacyEditing, setPrivacyEditing] = useState(false);
  const resolvedHistoryOpen = historyOpen ?? (inputFocused && uncontrolledHistoryOpen);
  const showHistory = shouldShowSearchHistory({
    focused: resolvedHistoryOpen,
    query,
    privacyOn,
    historyCount: recentQueries.length,
  });
  const searchDisabled = submitDisabled ?? (loading || query.trim().length === 0);
  const visibleQuery = privacyOn && !privacyEditing && query.length > 0 ? "••••••••" : query;
  const activeHistoryItemId = showHistory && activeHistoryIndex >= 0
    ? `${historyMenuId}-item-${activeHistoryIndex}`
    : undefined;

  useEffect(() => {
    if (privacyOn) setPrivacyEditing(false);
  }, [privacyOn]);

  useEffect(() => {
    if (focusRequestToken <= 0) return;
    inputRef.current?.focus({ preventScroll: true });
    inputRef.current?.select();
  }, [focusRequestToken]);

  useEffect(() => {
    if (!showHistory) {
      setActiveHistoryIndex(-1);
      return;
    }
    setActiveHistoryIndex((current) => current >= recentQueries.length ? -1 : current);
  }, [recentQueries.length, showHistory]);

  useEffect(() => {
    const handleShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLocaleLowerCase() !== "f") return;
      if (
        !shouldFocusGlobalSearchShortcut(
          isTextEditingTarget(event.target),
          Boolean(document.querySelector('[aria-modal="true"]')),
        )
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, []);

  const fillRecentQuery = (term: string) => {
    onUseRecentQuery?.(term);
    onSearch(term);
    setActiveHistoryIndex(-1);
    setUncontrolledHistoryOpen(false);
    inputRef.current?.focus();
  };

  const executeCurrentSearch = () => {
    onExecuteSearch(query);
    if (!privacyOn) return;
    setPrivacyEditing(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (shouldIgnoreSearchKeyDuringComposition(event)) return;
    if (
      showHistory &&
      (event.key === "ArrowDown" || event.key === "ArrowUp")
    ) {
      event.preventDefault();
      const direction = event.key as "ArrowDown" | "ArrowUp";
      setActiveHistoryIndex((current) =>
        moveSearchHistoryActiveIndex(current, direction, recentQueries.length));
      return;
    }
    if (shouldSubmitSearchKey(event)) {
      event.preventDefault();
      const enterAction = resolveSearchHistoryEnterAction(
        showHistory,
        activeHistoryIndex,
        searchDisabled,
      );
      if (enterAction === "fill-suggestion") {
        const term = recentQueries[activeHistoryIndex];
        if (term) fillRecentQuery(term);
        return;
      }
      if (enterAction === "none" || !shouldExecuteSearchKey(event, searchDisabled)) return;
      executeCurrentSearch();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      const draftCancelled = !showHistory && Boolean(onEscapeWithoutOverlay?.());
      const action = resolveGlobalSearchEscape(showHistory, draftCancelled);
      if (action === "close-history") {
        setActiveHistoryIndex(-1);
        setUncontrolledHistoryOpen(false);
      } else if (action === "cancel-draft") {
        setUncontrolledHistoryOpen(false);
      } else {
        event.currentTarget.blur();
      }
    }
  };

  const submitDisabledReasonId = searchDisabled && submitDisabledReason
    ? "search-submit-disabled-reason"
    : undefined;

  const submitButton = (
    <Button
      variant="primary"
      className="search-panel__submit"
      disabled={searchDisabled}
      loading={loading}
      aria-label={searchDisabled && submitDisabledReason ? undefined : submitLabel}
      aria-describedby={submitDisabledReasonId}
      onClick={executeCurrentSearch}
    >
      <Search size={17} aria-hidden="true" />
      {submitLabel}
    </Button>
  );

  return (
    <div className={className}>
      <div
        ref={controlsRef}
        className="search-panel__controls"
        onBlur={(event) => {
          if (controlsRef.current?.contains(event.relatedTarget as Node | null)) return;
          setInputFocused(false);
          setUncontrolledHistoryOpen(false);
        }}
      >
        <div className="search-panel__field">
          <label className="search-panel__label" htmlFor={inputId}>
            搜索内容
          </label>
          <div className="search-panel__input-shell">
            <Input
              ref={inputRef}
              id={inputId}
              data-search-keyword-input="true"
              variant="search"
              role="combobox"
              aria-label="搜索聊天记录"
              aria-autocomplete="list"
              aria-haspopup="menu"
              aria-expanded={showHistory}
              aria-controls={showHistory ? historyMenuId : undefined}
              aria-activedescendant={activeHistoryItemId}
              aria-invalid={Boolean(keywordError) || undefined}
              aria-describedby={
                [
                  keywordError ? keywordErrorId : null,
                  keywordGraphemeCount >= 160 ? keywordCountId : null,
                ]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              placeholder="搜索聊天记录，例如：发票、聚餐、项目名称"
              type={privacyOn ? "password" : "search"}
              autoComplete="off"
              value={visibleQuery}
              onFocus={() => {
                setInputFocused(true);
                if (privacyOn) setPrivacyEditing(true);
                if (!query) setUncontrolledHistoryOpen(true);
              }}
              onClick={() => {
                if (privacyOn) setPrivacyEditing(true);
              }}
              onBlur={() => {
                if (privacyOn) setPrivacyEditing(false);
              }}
              onChange={(event) => {
                if (privacyOn && !privacyEditing) return;
                const next = event.currentTarget.value;
                onSearch(next);
                setUncontrolledHistoryOpen(next.length === 0);
              }}
              onKeyDown={handleKeyDown}
            />
            {query && (
              <IconButton
                icon={<X size={14} />}
                label="清除搜索内容"
                tooltip="清除搜索内容"
                size="sm"
                className="search-panel__clear"
                onClick={onClearSearch}
              />
            )}
            {loading && (
              <div className="search-panel__spinner">
                <Spinner size={16} color="var(--text-tertiary)" />
              </div>
            )}
          </div>
          <div className="search-panel__keyword-meta" aria-live="polite">
            {keywordError && (
              <span id={keywordErrorId} className="search-panel__keyword-error" role="alert">
                {keywordError}
              </span>
            )}
            {keywordGraphemeCount >= 160 && (
              <span id={keywordCountId} className="search-panel__keyword-count">
                {privacyOn ? "关键词长度已隐藏" : `${keywordGraphemeCount} / 200`}
              </span>
            )}
          </div>
          {showHistory && (
            <div className="search-panel__history">
              <Typography
                id={historyLabelId}
                variant="caption"
                color="var(--text-secondary)"
              >
                最近搜索
              </Typography>
              <div className="search-panel__history-list-shell">
                <div
                  id={historyMenuId}
                  className="search-panel__history-list"
                  role="menu"
                  aria-labelledby={historyLabelId}
                >
                  {recentQueries.map((term, index) => (
                    <button
                      key={term}
                      id={`${historyMenuId}-item-${index}`}
                      type="button"
                      role="menuitem"
                      data-active={activeHistoryIndex === index || undefined}
                      className={classNames(
                        "search-panel__history-term",
                        activeHistoryIndex === index && "search-panel__history-term--active",
                      )}
                      onMouseEnter={() => setActiveHistoryIndex(index)}
                      onClick={() => fillRecentQuery(term)}
                    >
                      {term}
                    </button>
                  ))}
                </div>
                <div className="search-panel__history-delete-list" aria-label="管理最近搜索">
                  {recentQueries.map((term) => (
                    <IconButton
                      key={term}
                      icon={<X size={12} />}
                      label={`删除搜索记录：${term}`}
                      tooltip={`删除搜索记录：${term}`}
                      size="sm"
                      onClick={() => onDeleteRecentQuery?.(term)}
                    />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="search-panel__history-clear"
                onClick={onClearRecentQueries}
              >
                清空搜索历史
              </button>
            </div>
          )}
        </div>
        {searchDisabled && submitDisabledReason ? (
          <DisabledReason
            id={submitDisabledReasonId}
            reason={submitDisabledReason}
            variant="compact"
          >
            {submitButton}
          </DisabledReason>
        ) : (
          submitButton
        )}
      </div>
    </div>
  );
}

interface SearchKeyboardEventLike {
  key: string;
  keyCode?: number;
  nativeEvent?: { isComposing?: boolean };
}

export function shouldIgnoreSearchKeyDuringComposition(
  event: SearchKeyboardEventLike,
): boolean {
  return event.keyCode === 229 || Boolean(event.nativeEvent?.isComposing);
}

export function shouldSubmitSearchKey(event: SearchKeyboardEventLike): boolean {
  return event.key === "Enter" && !shouldIgnoreSearchKeyDuringComposition(event);
}

export function shouldExecuteSearchKey(
  event: Parameters<typeof shouldSubmitSearchKey>[0],
  disabled: boolean,
): boolean {
  return !disabled && shouldSubmitSearchKey(event);
}

export function moveSearchHistoryActiveIndex(
  current: number,
  key: "ArrowDown" | "ArrowUp",
  historyCount: number,
): number {
  if (!Number.isInteger(historyCount) || historyCount <= 0) return -1;
  if (key === "ArrowUp") {
    return current <= 0 || current >= historyCount ? historyCount - 1 : current - 1;
  }
  return current < 0 || current >= historyCount - 1 ? 0 : current + 1;
}

export function resolveSearchHistoryEnterAction(
  historyVisible: boolean,
  activeHistoryIndex: number,
  searchDisabled: boolean,
): "fill-suggestion" | "submit-search" | "none" {
  if (historyVisible && activeHistoryIndex >= 0) return "fill-suggestion";
  return searchDisabled ? "none" : "submit-search";
}

export function shouldFocusGlobalSearchShortcut(
  editingTarget: boolean,
  modalOpen: boolean,
): boolean {
  return !editingTarget && !modalOpen;
}

export function shouldShowSearchHistory({
  focused,
  query,
  privacyOn,
  historyCount,
}: {
  focused: boolean;
  query: string;
  privacyOn: boolean;
  historyCount: number;
}): boolean {
  return focused && query.length === 0 && !privacyOn && historyCount > 0;
}

export function resolveGlobalSearchEscape(
  historyVisible: boolean,
  draftCancelled = false,
): "close-history" | "cancel-draft" | "blur-input" {
  if (historyVisible) return "close-history";
  return draftCancelled ? "cancel-draft" : "blur-input";
}

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target.isContentEditable;
}
