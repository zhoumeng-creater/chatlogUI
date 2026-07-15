import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { SearchCapabilities } from "@/l2-coordinator/api-docs/search";
import { useSearchPreferenceStore } from "@/l2-coordinator/data-clerk/stores/useSearchPreferenceStore";
import { useSearchStore } from "@/l2-coordinator/data-clerk/stores/useSearchStore";
import { createDefaultSearchDraft, type SearchDraft } from "./searchDraftModel";
import { buildWorkspaceRouteScopeView } from "./workspaceRouteScope";
import * as searchWorkspaceModule from "./useSearchWorkspaceCommander";
import {
  applySearchConditionDraftIntent,
  buildSearchCommitView,
  buildSearchConditionCurrentConversation,
  buildSearchRequestRecoveryDisabledReason,
  buildSearchReadinessView,
  buildSearchServiceRecoveryPlan,
  buildSearchReturnRoute,
  cancelUnappliedSearchDraft,
  createSearchResultNavigationTarget,
  getSearchDraftErrorsForDisplay,
  isSearchSenderDirectoryAvailable,
  isPristineSearchIdle,
  isSearchNavigationAttemptCurrent,
  requestReachableSearchPage,
  resolveSearchRouteChatId,
  searchConditionPanelForErrorField,
  shouldApplyExplicitSearchRouteScope,
  shouldRefreshSearchDirectoryOnOpen,
  toCanonicalPresentationSortMode,
  toSearchSenderDirectoryContext,
} from "./useSearchWorkspaceCommander";

const fullSearchCapabilities: SearchCapabilities = {
  mode: "v2",
  contractVersion: "search.v2",
  exactTotal: true,
  completeScope: true,
  senderFilter: true,
  taxonomy: [
    "text",
    "image_emoji",
    "video",
    "voice",
    "file",
    "link_card",
    "quote_forward",
    "location",
    "system_other",
  ],
  snapshotCursor: true,
  inclusiveTimeBoundaries: true,
  defaultPageSize: 50,
  maxPageSize: 50,
  maxKeywordGraphemes: 200,
  maxKeywordTerms: 20,
  directoryVersion: "search.directory.v1",
  conversationDirectory: true,
  senderDirectory: true,
  directorySelfSenderId: "chatlog:sender:self:v1",
  directoryDefaultPageSize: 50,
  directoryMaxPageSize: 100,
  directoryMaxQueryGraphemes: 200,
  historyContextVersion: "history.context.v1",
  historyContextQuery: true,
  historyContextRevisionBinding: true,
  historyContextDefaultLimit: 51,
  historyContextMaxLimit: 101,
  historyContextMaxExactCandidates: 4096,
  historyContextMaxExactBatches: 32,
  historyContextMaxShards: 256,
};

beforeEach(() => {
  useSearchStore.getState().reset();
  useSearchPreferenceStore.getState().reset();
});

describe("search condition integration", () => {
  it("applies scope-selection intents in L2 without letting the component build drafts", () => {
    const selectedDraft: SearchDraft = {
      ...createDefaultSearchDraft(),
      keyword: "needle",
      scope: { kind: "selected", chatIds: ["chat-a", "chat-b"] },
      categories: ["file"],
      senderIds: ["sender-a"],
    };

    expect(
      applySearchConditionDraftIntent(selectedDraft, {
        type: "choose-all-conversations",
      }),
    ).toEqual({
      ...selectedDraft,
      scope: { kind: "all" },
      senderIds: [],
    });
    expect(
      applySearchConditionDraftIntent(selectedDraft, {
        type: "choose-current-conversation",
        conversationId: " chat-current ",
      }),
    ).toEqual({
      ...selectedDraft,
      scope: { kind: "current", chatId: "chat-current" },
      senderIds: [],
    });
    expect(
      applySearchConditionDraftIntent(selectedDraft, {
        type: "choose-current-conversation",
        conversationId: "   ",
      }),
    ).toBe(selectedDraft);

    const currentDraft: SearchDraft = {
      ...selectedDraft,
      scope: { kind: "current", chatId: "chat-current" },
    };
    expect(
      applySearchConditionDraftIntent(currentDraft, {
        type: "choose-current-conversation",
        conversationId: " chat-current ",
      }).senderIds,
    ).toEqual(["sender-a"]);
    expect(
      applySearchConditionDraftIntent(currentDraft, {
        type: "choose-current-conversation",
        conversationId: "chat-other",
      }).senderIds,
    ).toEqual([]);
  });

  it("applies category-selection intents in L2 with canonical display ordering", () => {
    const draft: SearchDraft = {
      ...createDefaultSearchDraft(),
      categories: ["voice", "text"],
    };

    expect(
      applySearchConditionDraftIntent(draft, {
        type: "toggle-message-category",
        category: "file",
      }).categories,
    ).toEqual(["text", "voice", "file"]);
    expect(
      applySearchConditionDraftIntent(draft, {
        type: "toggle-message-category",
        category: "voice",
      }).categories,
    ).toEqual(["text"]);
    expect(
      applySearchConditionDraftIntent(draft, {
        type: "clear-message-categories",
      }).categories,
    ).toEqual([]);
  });

  it("applies date-range input intents in L2 and does not retain the mutable payload", () => {
    const draft = { ...createDefaultSearchDraft(), keyword: "needle" };
    const value = { start: "2026-07-01", end: "2026-07-15" };
    const next = applySearchConditionDraftIntent(draft, {
      type: "change-date-range",
      value,
    });

    expect(next).toEqual({ ...draft, dateRange: value });
    expect(next.dateRange).not.toBe(value);
  });

  it("applies an explicit all route over an existing selected-conversation draft", () => {
    expect(
      shouldApplyExplicitSearchRouteScope(
        { kind: "selected", chatIds: ["chat-a", "chat-b"] },
        "all",
      ),
    ).toBe(true);
    expect(shouldApplyExplicitSearchRouteScope({ kind: "all" }, "all")).toBe(false);
    expect(
      shouldApplyExplicitSearchRouteScope(
        { kind: "current", chatId: "chat-current" },
        "current",
      ),
    ).toBe(false);
  });

  it("hides sender selection unless both directory and filter capabilities are ready", () => {
    expect(isSearchSenderDirectoryAvailable({
      status: "ready",
      value: fullSearchCapabilities,
    })).toBe(true);
    expect(isSearchSenderDirectoryAvailable({
      status: "ready",
      value: { ...fullSearchCapabilities, senderFilter: false },
    })).toBe(false);
    expect(isSearchSenderDirectoryAvailable({
      status: "ready",
      value: { ...fullSearchCapabilities, senderDirectory: false },
    })).toBe(false);
    expect(isSearchSenderDirectoryAvailable({ status: "loading", value: null })).toBe(false);
  });

  it("distinguishes search readiness phases without copying setup state", () => {
    expect(buildSearchReadinessView({
      profileConfigured: false,
      mode: "managed",
      portState: "unknown",
      loading: false,
      hasSetupError: false,
      httpReady: false,
      dbReady: false,
    })).toMatchObject({ phase: "not-configured", disabledReason: "请先配置本机聊天数据" });
    expect(buildSearchReadinessView({
      profileConfigured: true,
      mode: "managed",
      portState: "free",
      loading: true,
      hasSetupError: false,
      httpReady: false,
      dbReady: false,
    })).toMatchObject({ phase: "service-starting", disabledReason: "正在启动本机搜索服务" });
    expect(buildSearchReadinessView({
      profileConfigured: true,
      mode: "managed",
      portState: "owned",
      loading: false,
      hasSetupError: true,
      httpReady: false,
      dbReady: false,
    })).toMatchObject({ phase: "service-failed", disabledReason: "本机搜索服务启动失败" });
    expect(buildSearchReadinessView({
      profileConfigured: true,
      mode: "external",
      portState: "external-chatlog",
      loading: false,
      hasSetupError: true,
      httpReady: false,
      dbReady: false,
    })).toMatchObject({ phase: "external-unreachable", disabledReason: "无法连接外部本机服务" });
    expect(buildSearchReadinessView({
      profileConfigured: true,
      mode: "managed",
      portState: "owned",
      loading: true,
      hasSetupError: false,
      httpReady: true,
      dbReady: false,
    })).toMatchObject({ phase: "database-loading", disabledReason: "正在加载聊天数据库" });
    expect(buildSearchReadinessView({
      profileConfigured: false,
      mode: "managed",
      portState: "unknown",
      loading: false,
      hasSetupError: false,
      httpReady: false,
      dbReady: false,
      devSmokeReady: true,
    })).toMatchObject({ phase: "ready", disabledReason: null });
    expect(buildSearchReadinessView({
      profileConfigured: false,
      mode: "managed",
      portState: "unknown",
      loading: false,
      hasSetupError: false,
      httpReady: true,
      dbReady: true,
    })).toMatchObject({ phase: "ready", disabledReason: null });
  });

  it("maps safe backend fields and service ownership to explicit recovery intents", () => {
    expect(searchConditionPanelForErrorField("keyword")).toBeNull();
    expect(searchConditionPanelForErrorField("scope")).toBe("scope");
    expect(searchConditionPanelForErrorField("categories")).toBe("categories");
    expect(searchConditionPanelForErrorField("senders")).toBe("senders");
    expect(searchConditionPanelForErrorField("dateRange")).toBe("date");

    expect(buildSearchServiceRecoveryPlan("external", "external-chatlog")).toBe(
      "check-external",
    );
    expect(buildSearchServiceRecoveryPlan("managed", "owned")).toBe("restart-managed");
    expect(buildSearchServiceRecoveryPlan("managed", "free")).toBe("start-managed");
  });

  it("uses one commit slot whose label follows the unified draft", () => {
    const initial = { ...createDefaultSearchDraft(), keyword: "needle" };
    expect(
      buildSearchCommitView(initial, null, false, { httpReady: true, dbReady: true }),
    ).toEqual({ label: "搜索", disabled: false, disabledReason: null });

    const filterDraft = { ...initial, categories: ["text" as const] };
    expect(
      buildSearchCommitView(filterDraft, initial, false, {
        httpReady: true,
        dbReady: true,
      }),
    ).toEqual({ label: "应用筛选", disabled: false, disabledReason: null });

    expect(
      buildSearchCommitView(
        { ...filterDraft, keyword: "another" },
        initial,
        false,
        { httpReady: true, dbReady: true },
      ),
    ).toEqual({ label: "搜索", disabled: false, disabledReason: null });
  });

  it("keeps the untouched idle task quiet while validating real blank interactions", () => {
    const initial = createDefaultSearchDraft();
    const idle = { status: "idle" as const };
    expect(isPristineSearchIdle(initial, null, idle)).toBe(true);
    expect(getSearchDraftErrorsForDisplay(initial, null, idle).keyword).toBeUndefined();
    expect(
      buildSearchCommitView(
        initial,
        null,
        false,
        { httpReady: true, dbReady: true },
        undefined,
        undefined,
        idle,
      ),
    ).toEqual({ label: "搜索", disabled: true, disabledReason: null });

    const whitespace = { ...initial, keyword: "   " };
    expect(isPristineSearchIdle(whitespace, null, idle)).toBe(false);
    expect(getSearchDraftErrorsForDisplay(whitespace, null, idle).keyword).toBe(
      "请输入搜索关键词",
    );
    expect(
      buildSearchCommitView(
        whitespace,
        null,
        false,
        { httpReady: true, dbReady: true },
        undefined,
        undefined,
        idle,
      ).disabledReason,
    ).toBe("请输入搜索关键词");

    const applied = { ...initial, keyword: "stable" };
    expect(getSearchDraftErrorsForDisplay(initial, applied, idle).keyword).toBe(
      "请输入搜索关键词",
    );
    expect(getSearchDraftErrorsForDisplay(initial, null, {
      status: "error",
      errorCode: "invalid_request",
    }).keyword).toBe("请输入搜索关键词");
  });

  it("fails the commit slot closed for readiness and invalid current scope", () => {
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "needle",
      scope: { kind: "current" as const, chatId: null },
    };
    expect(
      buildSearchCommitView(draft, null, false, { httpReady: true, dbReady: true }),
    ).toMatchObject({
      disabled: true,
      disabledReason: "无法确定当前会话，请选择会话或切换到全部会话",
    });
    expect(
      buildSearchCommitView(
        { ...draft, scope: { kind: "all" } },
        null,
        false,
        { httpReady: false, dbReady: false },
      ),
    ).toMatchObject({ disabled: true, disabledReason: "正在启动本机搜索服务" });
    expect(
      buildSearchCommitView(
        { ...draft, scope: { kind: "all" } },
        null,
        false,
        { httpReady: true, dbReady: false },
      ),
    ).toMatchObject({ disabled: true, disabledReason: "正在加载聊天数据库" });
    expect(
      buildSearchCommitView(
        { ...draft, scope: { kind: "all" } },
        null,
        false,
        { httpReady: true, dbReady: true },
      ),
    ).toMatchObject({ disabled: false, disabledReason: null });
    expect(
      buildSearchCommitView(
        { ...draft, scope: { kind: "all" } },
        null,
        false,
        { httpReady: true, dbReady: true },
        { status: "loading", value: null },
      ),
    ).toMatchObject({ disabled: true, disabledReason: "正在确认完整搜索能力" });
    expect(
      buildSearchCommitView(
        { ...draft, scope: { kind: "all" } },
        null,
        false,
        { httpReady: true, dbReady: true },
        { status: "error", value: null, errorCode: "request_failed" },
      ),
    ).toMatchObject({ disabled: true, disabledReason: "完整搜索能力暂不可用" });
    expect(
      buildSearchCommitView(
        { ...draft, scope: { kind: "all" } },
        null,
        false,
        { httpReady: false, dbReady: false },
        { status: "idle", value: null },
        { phase: "external-unreachable", disabledReason: "无法连接外部本机服务" },
      ),
    ).toMatchObject({ disabled: true, disabledReason: "无法连接外部本机服务" });
  });

  it("keeps a provisional route constraint while loading but rejects a confirmed missing chat", () => {
    const missingRoute = buildWorkspaceRouteScopeView({
      scope: "currentChat",
      scopedChat: "unknown-private-chat",
      conversations: [],
      selectedConversation: null,
      privacyOn: false,
    });
    const resolvedRoute = buildWorkspaceRouteScopeView({
      scope: "currentChat",
      scopedChat: "known-chat",
      conversations: [{
        id: "stable-known-chat-id",
        username: "known-chat",
        displayName: "Known chat",
        chatType: "private",
        isGroup: false,
        summary: "",
        timestamp: 0,
        timeLabel: "",
        unread: 0,
        lastSender: "",
        source: "known-chat",
      }],
      selectedConversation: null,
      privacyOn: false,
    });

    expect(resolveSearchRouteChatId(missingRoute, "unknown-private-chat", "loading"))
      .toBe("unknown-private-chat");
    expect(resolveSearchRouteChatId(missingRoute, "unknown-private-chat", "ready")).toBeNull();
    expect(resolveSearchRouteChatId(resolvedRoute, "known-chat", "ready"))
      .toBe("stable-known-chat-id");
  });

  it("derives recovery availability from service, database, and capability readiness", () => {
    expect(
      buildSearchRequestRecoveryDisabledReason(
        { httpReady: false, dbReady: false },
        { status: "idle", value: null },
      ),
    ).toBe("等待本机搜索服务就绪。");
    expect(
      buildSearchRequestRecoveryDisabledReason(
        { httpReady: true, dbReady: true },
        { status: "ready", value: {} as never },
      ),
    ).toBeNull();
    expect(
      buildSearchRequestRecoveryDisabledReason(
        { httpReady: false, dbReady: false },
        { status: "idle", value: null },
        { phase: "service-failed", disabledReason: "本机搜索服务启动失败" },
      ),
    ).toBe("本机搜索服务启动失败。");
  });

  it("binds sender lookup to the exact mutually-exclusive draft scope", () => {
    expect(toSearchSenderDirectoryContext({ kind: "all" })).toEqual({
      scope: "all",
      chats: [],
    });
    expect(toSearchSenderDirectoryContext({ kind: "current", chatId: "chat-1" })).toEqual({
      scope: "current",
      chats: ["chat-1"],
    });
    expect(toSearchSenderDirectoryContext({ kind: "current", chatId: null })).toBeNull();
    expect(
      toSearchSenderDirectoryContext({ kind: "selected", chatIds: ["chat-1", "chat-2"] }),
    ).toEqual({ scope: "selected", chats: ["chat-1", "chat-2"] });
  });

  it("keeps a valid current-scope id usable while conversation metadata is loading", () => {
    expect(buildSearchConditionCurrentConversation(null, "chat-loading")).toEqual({
      id: "chat-loading",
      label: "会话名称加载中",
    });
    expect(
      buildSearchConditionCurrentConversation(
        {
          id: "chat-ready",
          username: "ready-user",
          displayName: "Ready Conversation",
        } as Conversation,
        "chat-ready",
      ),
    ).toEqual({ id: "chat-ready", label: "Ready Conversation" });
    expect(buildSearchConditionCurrentConversation(null, null)).toBeNull();
  });

  it("refreshes sender results whenever the panel reopens under a possibly changed scope", () => {
    expect(shouldRefreshSearchDirectoryOnOpen("sender", "ready")).toBe(true);
    expect(shouldRefreshSearchDirectoryOnOpen("sender", "error")).toBe(true);
    expect(shouldRefreshSearchDirectoryOnOpen("conversation", "idle")).toBe(true);
    expect(shouldRefreshSearchDirectoryOnOpen("conversation", "ready")).toBe(false);
  });

  it("treats the strict newest-first baseline as positional and only reorders oldest-first", () => {
    expect(toCanonicalPresentationSortMode("newest")).toBe("baseline");
    expect(toCanonicalPresentationSortMode("oldest")).toBe("oldest");
  });

  it("requests pages only with an opaque cursor already known by the result window", () => {
    const loadPageResults = vi.fn(() => Promise.resolve(true));
    const rememberCurrentPage = vi.fn();
    const resultWindow = {
      totalCount: 250,
      currentPageStart: 50,
      pageCursors: {
        0: "cursor-page-1",
        50: "cursor-current-page",
        100: "cursor-page-3",
        75: "cursor-not-a-page",
      },
    };

    expect(requestReachableSearchPage(
      resultWindow,
      "cursor-page-1",
      0,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(true);
    expect(requestReachableSearchPage(
      resultWindow,
      "cursor-page-3",
      100,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(true);
    expect(requestReachableSearchPage(
      resultWindow,
      "cursor-page-4",
      150,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(false);
    expect(requestReachableSearchPage(
      resultWindow,
      "cursor-current-page",
      50,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(false);
    expect(requestReachableSearchPage(
      resultWindow,
      "cursor-not-a-page",
      75,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(false);
    expect(requestReachableSearchPage(
      resultWindow,
      "cursor-page-3",
      0,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(false);
    expect(requestReachableSearchPage(
      resultWindow,
      "",
      0,
      loadPageResults,
      rememberCurrentPage,
    )).toBe(false);
    expect(loadPageResults).toHaveBeenNthCalledWith(1, "cursor-page-1", 0);
    expect(loadPageResults).toHaveBeenNthCalledWith(2, "cursor-page-3", 100);
    expect(loadPageResults).toHaveBeenCalledTimes(2);
    expect(rememberCurrentPage).toHaveBeenCalledTimes(2);
  });

  it("freezes export with the same canonical presentation used by the visible result view", () => {
    const freezePresentation = (
      searchWorkspaceModule as unknown as {
        freezeSearchExportPresentation?: (input: {
          sortMode: "newest" | "oldest";
          groupingMode: "none" | "conversation" | "date";
        }) => { sortMode: "baseline" | "oldest"; groupingMode: string };
      }
    ).freezeSearchExportPresentation;

    expect(freezePresentation).toBeTypeOf("function");
    expect(freezePresentation?.({ sortMode: "newest", groupingMode: "conversation" })).toEqual({
      sortMode: "baseline",
      groupingMode: "conversation",
    });
    expect(freezePresentation?.({ sortMode: "oldest", groupingMode: "date" })).toEqual({
      sortMode: "oldest",
      groupingMode: "date",
    });
  });

  it("cancels unapplied edits without ending or mutating the stable result snapshot", () => {
    const draft = { ...createDefaultSearchDraft(), keyword: "stable" };
    const state = useSearchStore.getState();
    state.setDraft(draft);
    state.beginPending({
      requestId: "stable-request",
      kind: "initial",
      draft,
      request: { keyword: "stable", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 1,
    });
    state.commitPending("stable-request", page(), 2, "manual");
    const stableWindow = useSearchStore.getState().resultWindow;
    state.setDraft({ ...draft, keyword: "unapplied", categories: ["file"] });

    expect(cancelUnappliedSearchDraft()).toBe(true);
    expect(useSearchStore.getState().draft).toEqual(draft);
    expect(useSearchStore.getState().resultWindow).toBe(stableWindow);
    expect(cancelUnappliedSearchDraft()).toBe(false);
  });

  it.each([
    {
      name: "keyword-only",
      change: (stable: SearchDraft) => ({ ...stable, keyword: "changed keyword" }),
    },
    {
      name: "filter-only",
      change: (stable: SearchDraft) => ({ ...stable, categories: ["file" as const] }),
    },
    {
      name: "keyword-and-filter",
      change: (stable: SearchDraft) => ({
        ...stable,
        keyword: "changed keyword",
        categories: ["file" as const],
      }),
    },
  ])("cancels $name edits through the shared draft rollback", ({ change }) => {
    const stable = { ...createDefaultSearchDraft(), keyword: "stable" };
    useSearchStore.setState({
      applied: {
        draft: stable,
        request: { keyword: "stable", limit: 50 },
        dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
        succeededAt: 1,
      },
      draft: change(stable),
    });

    expect(cancelUnappliedSearchDraft()).toBe(true);
    expect(useSearchStore.getState().draft).toEqual(stable);
  });

  it("cancels a dirty first-search draft back to the safe default", () => {
    useSearchStore.getState().setDraft({
      ...createDefaultSearchDraft(),
      keyword: "unapplied first query",
      categories: ["file"],
      dateRange: { start: "2026-07-01" },
    });

    expect(cancelUnappliedSearchDraft()).toBe(true);
    expect(useSearchStore.getState().draft).toEqual(createDefaultSearchDraft());
    expect(useSearchStore.getState().applied).toBeNull();
    expect(cancelUnappliedSearchDraft()).toBe(false);
  });

  it("preserves a scoped entry baseline when cancelling the first draft", () => {
    const entryBaseline = {
      ...createDefaultSearchDraft(),
      scope: { kind: "current" as const, chatId: "scoped-entry-chat" },
    };
    useSearchStore.getState().setDraft({
      ...entryBaseline,
      keyword: "unapplied scoped query",
      categories: ["file"],
    });

    expect(cancelUnappliedSearchDraft(entryBaseline)).toBe(true);
    expect(useSearchStore.getState().draft).toEqual(entryBaseline);
  });
});

describe("search result navigation integration", () => {
  it("keeps only the synthetic smoke marker and never serializes private route or snapshot data", () => {
    expect(
      buildSearchReturnRoute(
        new URLSearchParams(
          "scope=currentChat&chat=private-chat&source=workbench&query=PRIVATE&snapshot_id=secret&codex-smoke=workbench-ready",
        ),
      ),
    ).toBe("/search?codex-smoke=workbench-ready");

    expect(
      buildSearchReturnRoute(
        new URLSearchParams(
          "scope=currentChat&chat=private-chat&focus=private-message&source=workbench&query=PRIVATE&snapshot_id=secret",
        ),
      ),
    ).toBe("/search");
  });

  it("accepts a late navigation result only for the same mounted workspace intent", () => {
    const state = useSearchStore.getState();
    const draft = { ...createDefaultSearchDraft(), keyword: "needle" };
    state.setDraft(draft);
    state.beginPending({
      requestId: "request-a",
      kind: "initial",
      draft,
      request: { keyword: "needle", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 1,
    });
    state.commitPending("request-a", page(), 2, "manual");
    const attempt = {
      attemptId: 7,
      resultId: "search-hit-attempt",
      sourceIndex: 0,
      searchIntentGeneration: useSearchStore.getState().searchIntentGeneration,
    };
    useSearchStore.getState().beginResultNavigation("search-hit-attempt", 0);

    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: 7,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(true);
    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: 8,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(false);
    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: 7,
        mounted: false,
        state: useSearchStore.getState(),
      }),
    ).toBe(false);

    useSearchStore.getState().beginPending({
      requestId: "request-b",
      kind: "replacement",
      draft: { ...draft, keyword: "replacement" },
      request: { keyword: "replacement", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 3,
    });
    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: 7,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(false);

    useSearchStore.getState().endSearch();
    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: 7,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(false);
  });

  it("keeps a frozen old-result navigation current when its existing replacement settles", () => {
    const state = useSearchStore.getState();
    const appliedDraft = { ...createDefaultSearchDraft(), keyword: "old result" };
    state.setDraft(appliedDraft);
    state.beginPending({
      requestId: "request-old",
      kind: "initial",
      draft: appliedDraft,
      request: { keyword: "old result", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 1,
    });
    state.commitPending("request-old", page(), 2, "manual");
    state.beginPending({
      requestId: "request-replacement",
      kind: "replacement",
      draft: { ...appliedDraft, keyword: "replacement" },
      request: { keyword: "replacement", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 3,
    });
    const attempt = {
      attemptId: 9,
      resultId: "search-hit-frozen-old-result",
      sourceIndex: 0,
      searchIntentGeneration: useSearchStore.getState().searchIntentGeneration,
    };
    useSearchStore.getState().beginResultNavigation(attempt.resultId, attempt.sourceIndex);

    useSearchStore.getState().commitPending("request-replacement", {
      ...page(),
      snapshotId: "snapshot-replacement",
      dataRevision: "revision-replacement",
    }, 4, "manual");
    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: attempt.attemptId,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(true);

    useSearchStore.getState().beginPending({
      requestId: "request-newer",
      kind: "replacement",
      draft: { ...appliedDraft, keyword: "newer" },
      request: { keyword: "newer", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 5,
    });
    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: attempt.attemptId,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(false);
  });

  it("keeps a frozen old-result navigation current when its existing replacement is cancelled", () => {
    const state = useSearchStore.getState();
    const appliedDraft = { ...createDefaultSearchDraft(), keyword: "old result" };
    state.setDraft(appliedDraft);
    state.beginPending({
      requestId: "request-old",
      kind: "initial",
      draft: appliedDraft,
      request: { keyword: "old result", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 1,
    });
    state.commitPending("request-old", page(), 2, "manual");
    state.beginPending({
      requestId: "request-cancelled",
      kind: "replacement",
      draft: { ...appliedDraft, keyword: "cancelled" },
      request: { keyword: "cancelled", limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 3,
    });
    const attempt = {
      attemptId: 11,
      resultId: "search-hit-frozen-cancelled",
      sourceIndex: 0,
      searchIntentGeneration: useSearchStore.getState().searchIntentGeneration,
    };
    useSearchStore.getState().beginResultNavigation(attempt.resultId, attempt.sourceIndex);
    useSearchStore.getState().cancelPending("request-cancelled");

    expect(
      isSearchNavigationAttemptCurrent({
        attempt,
        activeAttemptId: attempt.attemptId,
        mounted: true,
        state: useSearchStore.getState(),
      }),
    ).toBe(true);
  });

  it("captures the complete current-scope workspace before navigating by stable ids", () => {
    useSearchStore.getState().setCapabilitiesState({
      status: "ready",
      value: fullSearchCapabilities,
    });
    const draft = {
      ...createDefaultSearchDraft(),
      keyword: "PRIVATE needle",
      scope: { kind: "current" as const, chatId: "private-chat" },
    };
    useSearchStore.getState().setDraft(draft);
    useSearchStore.getState().beginPending({
      requestId: "request",
      kind: "initial",
      draft,
      request: { keyword: draft.keyword, chats: ["private-chat"], limit: 50 },
      dateContext: { timeZone: "Asia/Shanghai", utcOffsetMinutes: 480 },
      startedAt: 1,
    });
    useSearchStore.getState().commitPending("request", page(), 2, "manual");
    useSearchPreferenceStore.getState().setSortMode("oldest");
    useSearchPreferenceStore.getState().setGroupingMode("conversation");

    const target = createSearchResultNavigationTarget({
      message: page().messages[0],
      conversations: [] as Conversation[],
      returnRoute: "/search",
      scrollAnchor: {
        resultId: "search-hit-safe-scroll-anchor",
        offsetFromViewportTop: -27.5,
      },
    });

    expect(target).toMatchObject({
      ok: true,
      conversationId: "private-chat",
      requiresConversationLoad: true,
      dataRevision: "revision-1",
      historyContextAvailable: true,
      anchor: { messageId: "message-1", seq: 42 },
      returnToSearch: {
        returnRoute: "/search",
        searchSnapshot: {
          draft: { keyword: "PRIVATE needle", scope: { kind: "current", chatId: "private-chat" } },
          pending: null,
          applied: { request: { chats: ["private-chat"] } },
          resultWindow: { snapshotId: "snapshot-1", browseMode: "manual" },
          activeSourceIndex: 0,
          scrollAnchor: {
            resultId: "search-hit-safe-scroll-anchor",
            offsetFromViewportTop: -27.5,
          },
          sortMode: "oldest",
          groupingMode: "conversation",
        },
      },
    });

    const secondConversationTarget = createSearchResultNavigationTarget({
      message: {
        ...page().messages[0],
        conversationId: "another-private-chat",
        conversationName: "Another Private Chat",
      },
      conversations: [] as Conversation[],
      returnRoute: "/search",
      scrollAnchor: {
        resultId: "search-hit-other-scroll-anchor",
        offsetFromViewportTop: 14,
      },
    });
    expect(target.ok && target.returnToSearch.activeResultId).toMatch(
      /^search-hit-[a-f0-9]{32}$/,
    );
    expect(target.ok && target.returnToSearch.activeResultId).not.toContain("message-1");
    expect(secondConversationTarget.ok && secondConversationTarget.returnToSearch.activeResultId)
      .not.toBe(target.ok && target.returnToSearch.activeResultId);
  });
});

function page() {
  return {
    snapshotId: "snapshot-1",
    dataRevision: "revision-1",
    exactTotal: true,
    completeScope: true,
    totalCount: 1,
    count: 1,
    windowStart: 0,
    previousCursor: "",
    nextCursor: "",
    hasPrevious: false,
    hasNext: false,
    messages: [
      {
        messageId: "message-1",
        seq: 42,
        sourceIndex: 0,
        conversationId: "private-chat",
        conversationName: "Private Chat",
        senderId: "private-sender",
        senderName: "Private Sender",
        timestamp: 1_700_000_000,
        type: 1,
        subType: 0,
        category: "text" as const,
        matchField: "content" as const,
        snippet: "needle",
        matchSegments: [{ text: "needle", matched: true }],
      },
    ],
  };
}
