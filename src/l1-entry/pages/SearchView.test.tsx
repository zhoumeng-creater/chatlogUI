import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchView } from "./SearchView";

const useSearchWorkspaceCommander = vi.hoisted(() => vi.fn());

vi.mock("@l2/commander/useSearchWorkspaceCommander", () => ({
  useSearchWorkspaceCommander,
}));

vi.mock("@l3/search/GlobalSearch", () => ({
  GlobalSearch: () => null,
  shouldIgnoreSearchKeyDuringComposition: () => false,
}));
vi.mock("@l3/search/SearchConditionBar", () => ({ SearchConditionBar: () => null }));
vi.mock("@l3/search/SearchReadinessNotice", () => ({ SearchReadinessNotice: () => null }));
vi.mock("@l3/search/SearchResults", () => ({ SearchResults: () => null }));
vi.mock("@l3/search/SearchExportDialog", () => ({
  SearchExportDialog: ({ view }: { view: { task: { status?: string } | null } }) => (
    <div data-testid="search-export-dialog">{view.task?.status}</div>
  ),
}));
vi.mock("@l4/ui", () => ({
  Typography: ({ children, as: Component = "div" }: {
    children: React.ReactNode;
    as?: React.ElementType;
  }) => <Component>{children}</Component>,
}));

beforeEach(() => {
  useSearchWorkspaceCommander.mockReset();
});

describe("SearchView export completion composition", () => {
  it("does not announce completion while native commit confirmation is pending", () => {
    useSearchWorkspaceCommander.mockReturnValue(workspace("commit_pending"));

    const html = renderToStaticMarkup(<SearchView />);

    expect(html).toContain("commit_pending");
    expect(html).not.toContain("导出完成");
    expect(html).not.toContain("已保存到所选位置");
  });

  it("announces completion after the coordinator reaches completed", () => {
    useSearchWorkspaceCommander.mockReturnValue(workspace("completed"));

    const html = renderToStaticMarkup(<SearchView />);

    expect(html).toContain("导出完成");
    expect(html).toContain("已保存到所选位置");
    expect(html).toContain('aria-label="关闭导出完成提示"');
  });
});

function workspace(status: "commit_pending" | "completed") {
  const noop = vi.fn();
  return {
    privacyOn: false,
    search: {
      draft: { keyword: "", scope: { kind: "all" }, categories: [], senderIds: [], dateRange: {} },
      pending: null,
      applied: null,
      resultWindow: null,
      firstRequest: { status: "idle" },
      replacementRequest: null,
      stale: false,
      refreshActiveNotice: null,
      navigationByResultId: {},
      retryCandidate: null,
      clearSearch: noop,
      cancelWindowOperation: noop,
      retrySearch: noop,
      refreshSearch: noop,
      cancelSearch: noop,
    },
    searchCommit: { label: "搜索", disabled: true, disabledReason: null },
    searchReadinessView: { phase: "ready", disabledReason: null },
    searchRequestRecoveryDisabledReason: null,
    searchDraftDirtySources: [],
    searchDraftErrors: {},
    searchKeywordGraphemeCount: 0,
    searchDateErrors: {},
    searchConditionCurrentConversation: null,
    conversationDirectory: null,
    senderDirectory: null,
    senderDirectoryAvailable: false,
    searchConditionOpenPanel: null,
    keywordFocusRequestToken: 0,
    recentQueries: [],
    searchExport: {
      isOpen: status === "commit_pending",
      task: { status },
      result: {
        fileName: "chatlog-search.json",
        extension: "json",
        bytesWritten: 128,
        locationSummary: "已保存到所选位置",
      },
      close: noop,
    },
    searchExportDisabledReason: null,
    canonicalSearchPresentation: null,
    resultSortMode: "newest",
    resultGroupingMode: "none",
    appliedSearchScopeLabel: "全部会话",
    zeroResultSuggestions: [],
    openResult: noop,
    retryResult: noop,
    openResultNearTime: noop,
    endSearch: noop,
    changeSearchDraft: noop,
    changeSearchConditionDraft: noop,
    cancelAllSearchDraftEdits: noop,
    applySearchDateShortcut: noop,
    changeDirectoryQuery: noop,
    searchDirectory: noop,
    loadMoreDirectory: noop,
    toggleDirectorySelection: noop,
    clearDirectorySelection: noop,
    requestKeywordFocus: noop,
    handleSearchConditionPanelChange: noop,
    recoverSearchService: noop,
    recheckSearchDatabase: noop,
    reprobeSearchCapabilities: noop,
    reviewInvalidSearchField: noop,
    openSearchRecoverySettings: noop,
    openConversationWorkspace: noop,
    executeSearch: noop,
    deleteRecentQuery: noop,
    clearRecentQueries: noop,
    openSearchExport: noop,
    changeResultBrowseMode: noop,
    changeResultSortMode: noop,
    changeResultGroupingMode: noop,
    activateSearchHit: noop,
    loadSearchBoundary: noop,
    loadSearchPage: noop,
    loadSearchGap: noop,
    consumeResultRestoreScrollAnchor: noop,
    applyZeroResultSuggestion: noop,
  };
}
