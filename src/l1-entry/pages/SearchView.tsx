import { useSearchWorkspaceCommander } from "@l2/commander/useSearchWorkspaceCommander";
import {
  GlobalSearch,
  shouldIgnoreSearchKeyDuringComposition,
} from "@l3/search/GlobalSearch";
import { SearchConditionBar } from "@l3/search/SearchConditionBar";
import { SearchExportDialog } from "@l3/search/SearchExportDialog";
import { SearchExportResultNotice } from "@l3/search/SearchExportResultNotice";
import { SearchReadinessNotice } from "@l3/search/SearchReadinessNotice";
import { SearchResults } from "@l3/search/SearchResults";
import { Typography } from "@l4/ui";
import "@/styles/search.css";

export function SearchView() {
  const {
    openResult,
    retryResult,
    openResultNearTime,
    privacyOn,
    search,
    endSearch,
    searchCommit,
    searchReadinessView,
    searchRequestRecoveryDisabledReason,
    searchDraftDirtySources,
    searchDraftErrors,
    searchKeywordGraphemeCount,
    searchDateErrors,
    searchConditionCurrentConversation,
    conversationDirectory,
    senderDirectory,
    senderDirectoryAvailable,
    changeSearchDraft,
    changeSearchConditionDraft,
    cancelAllSearchDraftEdits,
    applySearchDateShortcut,
    changeDirectoryQuery,
    searchDirectory,
    loadMoreDirectory,
    toggleDirectorySelection,
    clearDirectorySelection,
    searchConditionOpenPanel,
    keywordFocusRequestToken,
    requestKeywordFocus,
    handleSearchConditionPanelChange,
    recoverSearchService,
    recheckSearchDatabase,
    reprobeSearchCapabilities,
    reviewInvalidSearchField,
    openSearchRecoverySettings,
    openConversationWorkspace,
    recentQueries,
    executeSearch,
    deleteRecentQuery,
    clearRecentQueries,
    searchExport,
    openSearchExport,
    searchExportDisabledReason,
    canonicalSearchPresentation,
    resultSortMode,
    resultGroupingMode,
    appliedSearchScopeLabel,
    changeResultBrowseMode,
    changeResultSortMode,
    changeResultGroupingMode,
    activateSearchHit,
    loadSearchBoundary,
    loadSearchPage,
    loadSearchGap,
    consumeResultRestoreScrollAnchor,
    zeroResultSuggestions,
    applyZeroResultSuggestion,
  } = useSearchWorkspaceCommander();
  return (
    <div
      className="workspace-page search-workspace"
      onKeyDown={(event) => {
        if (
          event.key !== "Escape" ||
          event.defaultPrevented ||
          shouldIgnoreSearchKeyDuringComposition(event)
        ) {
          return;
        }
        if (cancelAllSearchDraftEdits()) event.preventDefault();
      }}
    >
      <header className="workspace-page__header">
        <div>
          <Typography variant="h3" as="h1">搜索</Typography>
          <Typography variant="body" color="var(--text-secondary)">
            在稳定的搜索页面中检索聊天记录，结果可返回会话上下文。
          </Typography>
        </div>
      </header>

      <section
        className="workspace-page__surface search-workspace__surface"
        aria-label="搜索工作区"
      >
        <GlobalSearch
          query={search.draft.keyword}
          loading={search.pending !== null}
          privacyOn={privacyOn}
          onSearch={(keyword) => changeSearchDraft({ ...search.draft, keyword })}
          onExecuteSearch={executeSearch}
          onClearSearch={search.clearSearch}
          recentQueries={recentQueries}
          onDeleteRecentQuery={deleteRecentQuery}
          onClearRecentQueries={clearRecentQueries}
          onEscapeWithoutOverlay={cancelAllSearchDraftEdits}
          submitLabel={searchCommit.label}
          submitDisabled={searchCommit.disabled}
          submitDisabledReason={searchCommit.disabledReason ?? undefined}
          keywordError={searchDraftErrors.keyword}
          keywordGraphemeCount={searchKeywordGraphemeCount}
          focusRequestToken={keywordFocusRequestToken}
        />
        <SearchReadinessNotice
          phase={searchReadinessView.phase}
          reason={searchReadinessView.disabledReason}
          onRecoverService={() => void recoverSearchService()}
          onRecheckDatabase={() => void recheckSearchDatabase()}
          onOpenSettings={openSearchRecoverySettings}
        />
        <SearchConditionBar
          draft={search.draft}
          pending={search.pending !== null}
          currentConversation={searchConditionCurrentConversation}
          conversationDirectory={conversationDirectory}
          senderDirectory={senderDirectory}
          senderCapability={senderDirectoryAvailable}
          privacyOn={privacyOn}
          dirtySources={searchDraftDirtySources}
          validationErrors={searchDraftErrors}
          dateErrors={searchDateErrors}
          openPanel={searchConditionOpenPanel}
          onOpenPanelChange={handleSearchConditionPanelChange}
          onConditionIntent={changeSearchConditionDraft}
          onCancelDraft={cancelAllSearchDraftEdits}
          onDateShortcut={applySearchDateShortcut}
          onOpenConversationWorkspace={openConversationWorkspace}
          onDirectoryQueryChange={changeDirectoryQuery}
          onDirectorySearch={searchDirectory}
          onDirectoryLoadMore={loadMoreDirectory}
          onToggleDirectorySelection={toggleDirectorySelection}
          onClearDirectorySelection={clearDirectorySelection}
        />
        <div className="search-workspace__results">
          <SearchResults
            window={search.resultWindow}
            presentation={canonicalSearchPresentation}
            appliedQuery={search.applied?.draft.keyword ?? ""}
            appliedScopeLabel={appliedSearchScopeLabel}
            firstRequest={search.firstRequest}
            replacementRequest={search.replacementRequest}
            pending={search.pending !== null}
            stale={search.stale}
            refreshActiveNotice={search.refreshActiveNotice}
            navigationByResultId={search.navigationByResultId}
            privacyOn={privacyOn}
            sortMode={resultSortMode}
            groupingMode={resultGroupingMode}
            exportDisabledReason={searchExportDisabledReason}
            zeroResultSuggestions={zeroResultSuggestions}
            onApplyZeroResultSuggestion={applyZeroResultSuggestion}
            onRequestKeywordFocus={requestKeywordFocus}
            onOpenResult={(hit, anchor) => void openResult(hit, anchor)}
            onRetryResult={(hit, anchor) => void retryResult(hit, anchor)}
            onOpenNearbyResult={(hit, anchor) => void openResultNearTime(hit, anchor)}
            onActivateResult={activateSearchHit}
            onBrowseModeChange={changeResultBrowseMode}
            onSortModeChange={changeResultSortMode}
            onGroupingModeChange={changeResultGroupingMode}
            onOpenExport={openSearchExport}
            onEndSearch={endSearch}
            onLoadBoundary={loadSearchBoundary}
            onLoadPage={(cursor, targetPageStart, anchor) =>
              void loadSearchPage(cursor, targetPageStart, anchor)}
            onLoadGap={loadSearchGap}
            onCancelWindowOperation={search.cancelWindowOperation}
            retryAvailable={Boolean(search.retryCandidate)}
            requestRecoveryDisabledReason={searchRequestRecoveryDisabledReason}
            resubmitDisabled={searchCommit.disabled}
            resubmitDisabledReason={searchCommit.disabledReason}
            onRetrySearch={() => void search.retrySearch()}
            onRefreshSearch={() => void search.refreshSearch()}
            onResubmitSearch={() => executeSearch(search.draft.keyword)}
            onRecoverService={() => void recoverSearchService()}
            onRecheckDatabase={() => void recheckSearchDatabase()}
            onReprobeCapabilities={() => void reprobeSearchCapabilities()}
            onReviewInvalidField={reviewInvalidSearchField}
            onOpenRecoverySettings={openSearchRecoverySettings}
            onCancelPending={search.cancelSearch}
            onConsumeRestoreScrollAnchor={consumeResultRestoreScrollAnchor}
          />
        </div>
        {searchExport.task?.status === "completed" && searchExport.result && (
          <SearchExportResultNotice
            result={searchExport.result}
            onDismiss={() => void searchExport.close()}
          />
        )}
        {searchExport.isOpen && <SearchExportDialog view={searchExport} />}
      </section>
    </div>
  );
}
