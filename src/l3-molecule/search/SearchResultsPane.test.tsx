import type { ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { SearchHit, SearchSnapshotPage } from "@l2/api-docs/search";
import type { SearchResultPresentation } from "@l2/commander/searchResultPresentation";
import type { SearchResultWindow } from "@l2/commander/searchResultWindowModel";
import {
  SearchResultsPane,
  buildSearchResultListEntries,
  canRestoreSearchScrollAnchor,
  includeSearchAnchorIndex,
  initialSearchRenderIndexes,
  isSearchResultWithinViewport,
  resolveSearchResultTabStopId,
  selectFirstVisibleSearchScrollAnchor,
  selectSearchAutoLoadTarget,
  shouldActivateSearchResultRow,
  shouldAutoLoadSearchBoundary,
  shouldAutoLoadSearchGap,
  shouldRequestActiveResultFocusForBrowseMode,
} from "./SearchResultsPane";

type PaneProps = ComponentProps<typeof SearchResultsPane> & { onEndSearch: () => void };

const baseProps: PaneProps = {
  window: null,
  presentation: null,
  appliedQuery: "",
  appliedScopeLabel: "全部会话",
  firstRequest: { status: "idle" },
  replacementRequest: { status: "idle" },
  pending: false,
  stale: false,
  refreshActiveNotice: null,
  navigationByResultId: {},
  privacyOn: false,
  sortMode: "baseline",
  groupingMode: "none",
  exportDisabledReason: null,
  zeroResultSuggestions: [],
  onApplyZeroResultSuggestion: vi.fn(() => false),
  onRequestKeywordFocus: vi.fn(),
  onOpenResult: vi.fn(),
  onRetryResult: vi.fn(),
  onOpenNearbyResult: vi.fn(),
  onActivateResult: vi.fn(),
  onBrowseModeChange: vi.fn(),
  onSortModeChange: vi.fn(),
  onGroupingModeChange: vi.fn(),
  onOpenExport: vi.fn(),
  onLoadBoundary: vi.fn(),
  onLoadPage: vi.fn(),
  onLoadGap: vi.fn(),
  onCancelWindowOperation: vi.fn(),
  retryAvailable: false,
  requestRecoveryDisabledReason: null,
  resubmitDisabled: false,
  resubmitDisabledReason: null,
  onRetrySearch: vi.fn(),
  onRefreshSearch: vi.fn(),
  onResubmitSearch: vi.fn(),
  onRecoverService: vi.fn(),
  onRecheckDatabase: vi.fn(),
  onReprobeCapabilities: vi.fn(),
  onReviewInvalidField: vi.fn(),
  onOpenRecoverySettings: vi.fn(),
  onEndSearch: vi.fn(),
  onCancelPending: vi.fn(),
  onConsumeRestoreScrollAnchor: vi.fn(() => null),
};

describe("SearchResultsPane", () => {
  it("keeps loaded-result announcements available to assistive tech without duplicating visible copy", () => {
    const resultWindow = windowFromPage(page([hit(0)], 1), "manual");
    const html = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
    });

    expect(html).toContain('class="sr-only"');
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('class="visually-hidden"');
  });

  it("requests minimal active-row scrolling only when the result is outside the viewport", () => {
    expect(isSearchResultWithinViewport(
      { top: 102, bottom: 198 },
      { top: 100, bottom: 200 },
    )).toBe(true);
    expect(isSearchResultWithinViewport(
      { top: 99, bottom: 198 },
      { top: 100, bottom: 200 },
    )).toBe(false);
    expect(isSearchResultWithinViewport(
      { top: 102, bottom: 201 },
      { top: 100, bottom: 200 },
    )).toBe(false);
  });

  it("moves focus to the active result only for a keyboard browse-mode choice", () => {
    expect(shouldRequestActiveResultFocusForBrowseMode("keyboard")).toBe(true);
    expect(shouldRequestActiveResultFocusForBrowseMode("pointer")).toBe(false);
  });

  it("renders an explicit not-started state without implying an automatic request", () => {
    const html = renderPane();

    expect(html).toContain('aria-label="搜索尚未开始"');
    expect(html).toContain("输入关键词并检查搜索条件");
    expect(html).toContain("搜索只会在你明确提交后执行");
    expect(html).not.toContain("正在搜索");
  });

  it("renders a cancellable first-request loading state and stable skeleton structure", () => {
    const html = renderPane({
      firstRequest: { status: "loading", requestId: "request-private" },
    });

    expect(html).toContain('aria-label="正在搜索"');
    expect(html).toContain("正在创建首个搜索快照");
    expect(html).toContain("取消搜索");
    expect(html.match(/search-result-skeleton/g)).toHaveLength(5);
    expect(html).not.toContain("request-private");
  });

  it("distinguishes a cancelled first request from a search that never started", () => {
    const html = renderPane({ firstRequest: { status: "cancelled" } });

    expect(html).toContain('aria-label="搜索已取消"');
    expect(html).toContain("输入和筛选草稿仍然保留");
    expect(html).not.toContain('aria-label="搜索尚未开始"');
  });

  it.each([
    ["service_unavailable", "本机搜索服务暂不可用，请检查服务状态后重试。"],
    ["database_unavailable", "聊天数据库尚未就绪，请完成数据库加载后重试。"],
    ["timeout", "搜索超时；不会自动重试，请按需重新提交。"],
    ["request_failed", "搜索请求失败，请重试或查看脱敏诊断。"],
  ] as const)("translates the first-request %s error into safe recovery copy", (errorCode, copy) => {
    const html = renderPane({
      firstRequest: { status: "error", errorCode },
      retryAvailable: errorCode === "timeout" || errorCode === "request_failed",
      requestRecoveryDisabledReason:
        errorCode === "service_unavailable" || errorCode === "database_unavailable"
          ? "等待本机服务和聊天数据库就绪。"
          : null,
    });

    expect(html).toContain("搜索未完成");
    expect(html).toContain(copy);
    if (errorCode === "timeout" || errorCode === "request_failed") {
      expect(html).toContain("重试上次请求");
      if (errorCode === "request_failed") expect(html).toContain("查看脱敏诊断");
    } else if (errorCode === "service_unavailable") {
      expect(html).toContain("重新检查并启动本机服务");
      expect(html).toContain("前往服务设置");
    } else {
      expect(html).toContain("重新检查数据库");
      expect(html).toContain("前往数据设置");
    }
    expect(html).not.toContain(errorCode);
  });

  it("renders field, capability, permission, and identity-specific recovery actions", () => {
    const fieldHtml = renderPane({
      firstRequest: { status: "error", errorCode: "invalid_request", errorField: "senders" },
    });
    const capabilityHtml = renderPane({
      firstRequest: { status: "error", errorCode: "capability_unavailable" },
    });
    const permissionHtml = renderPane({
      firstRequest: { status: "error", errorCode: "permission_denied" },
    });
    const identityWindow = manualWindow();
    const identityHtml = renderPane({
      window: identityWindow,
      presentation: presentationFor(identityWindow),
      replacementRequest: { status: "error", errorCode: "identity_conflict" },
    });

    expect(fieldHtml).toContain("检查发送者筛选");
    expect(capabilityHtml).toContain("重新检测搜索能力");
    expect(capabilityHtml).toContain("前往服务设置");
    expect(permissionHtml).toContain("检查数据与文件权限");
    expect(permissionHtml).toContain("查看脱敏诊断");
    expect(identityHtml).toContain("刷新搜索快照");
    expect(identityHtml).toContain("查看脱敏诊断");
  });

  it("renders continuous result rows with one roving keyboard activation semantic per hit", () => {
    const resultWindow = manualWindow();
    const presentation = presentationFor(resultWindow);
    const html = renderPane({
      window: resultWindow,
      presentation,
      appliedQuery: "Synthetic",
    });

    expect(html).toContain('role="list"');
    expect(html.match(/role="listitem"/g)).toHaveLength(2);
    expect(html.match(/role="button"/g)).toHaveLength(2);
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html.match(/tabindex="0"/g)).toHaveLength(1);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(1);
    expect(html).toContain("Synthetic Conversation");
    expect(html).toContain("Synthetic Sender");
    expect(html).toContain("文字");
    expect(html).toContain("命中来源：正文");
    expect(html).toContain("<mark>Synthetic</mark>");
    expect(html).not.toContain('aria-label="Synthetic Conversation，Synthetic Sender');
  });

  it("keeps mixed coverage and result entries as valid direct list items", () => {
    const resultWindow = sparseWindow();
    const presentation = presentationFor(resultWindow, { sortMode: "newest" });
    const entries = buildSearchResultListEntries(presentation, resultWindow);
    const html = renderPane({
      window: resultWindow,
      presentation,
      sortMode: "newest",
    });

    expect(entries[0]?.kind).toBe("coverage");
    expect(html.match(/role="listitem"/g)).toHaveLength(entries.length);
    expect(html).not.toContain('role="presentation"');
    expect(html).toMatch(
      /role="listitem"[^>]*><div class="search-coverage-summary"/,
    );
  });

  it("preserves result structure and counts while removing private query and row facts", () => {
    const privateWindow = manualWindow({
      conversationName: "PRIVATE conversation canary",
      senderName: "PRIVATE sender canary",
      snippet: "PRIVATE content canary",
      matchSegments: [{ text: "PRIVATE content canary", matched: true }],
    });
    const html = renderPane({
      window: privateWindow,
      presentation: presentationFor(privateWindow, { privacyOn: true }),
      appliedQuery: "PRIVATE query canary",
      appliedScopeLabel: "PRIVATE scope canary",
      privacyOn: true,
    });

    expect(html).toContain("已加载 2 / 共 2");
    expect(html.match(/role="listitem"/g)).toHaveLength(2);
    expect(html.match(/role="button"/g)).toHaveLength(2);
    expect(html).toContain("已隐藏会话");
    expect(html).toContain("已隐藏发送者");
    expect(html).toContain("••••");
    expect(html).not.toContain("PRIVATE query canary");
    expect(html).not.toContain("PRIVATE scope canary");
    expect(html).not.toContain("PRIVATE conversation canary");
    expect(html).not.toContain("PRIVATE sender canary");
    expect(html).not.toContain("PRIVATE content canary");
  });

  it("keeps stable results visible during replacement progress and replacement failure", () => {
    const resultWindow = manualWindow();
    const presentation = presentationFor(resultWindow);
    const pendingHtml = renderPane({
      window: resultWindow,
      presentation,
      appliedQuery: "Synthetic",
      pending: true,
      replacementRequest: { status: "loading", requestId: "replacement-private" },
    });
    const errorHtml = renderPane({
      window: resultWindow,
      presentation,
      appliedQuery: "Synthetic",
      replacementRequest: { status: "error", errorCode: "timeout" },
      retryAvailable: true,
    });

    expect(pendingHtml).toContain("正在准备新结果，当前仍显示上次结果");
    expect(pendingHtml).toContain("取消新搜索");
    expect(pendingHtml).toContain("<mark>Synthetic</mark>");
    expect(pendingHtml).not.toContain("replacement-private");
    expect(errorHtml).toContain("搜索超时；不会自动重试，请按需重新提交。");
    expect(errorHtml).toContain("重试上次请求");
    expect(errorHtml).toContain("<mark>Synthetic</mark>");
  });

  it("inserts positional gaps only in baseline order and uses coverage after local sorting", () => {
    const resultWindow = sparseWindow();
    const baseline = presentationFor(resultWindow);
    const locallySorted = presentationFor(resultWindow, { sortMode: "newest" });

    expect(buildSearchResultListEntries(baseline, resultWindow).map((entry) => entry.kind)).toEqual([
      "row",
      "gap",
      "row",
    ]);
    expect(
      buildSearchResultListEntries(locallySorted, resultWindow).map((entry) => entry.kind),
    ).toEqual(["coverage", "row", "row"]);

    const positionalHtml = renderPane({
      window: resultWindow,
      presentation: baseline,
      appliedQuery: "Synthetic",
    });
    const coverageHtml = renderPane({
      window: resultWindow,
      presentation: locallySorted,
      appliedQuery: "Synthetic",
      sortMode: "newest",
    });

    expect(positionalHtml).toContain("第 2–2 条尚未加载");
    expect(positionalHtml).toContain("重试加载剩余 1 条");
    expect(positionalHtml).toContain("搜索请求失败，请重试或查看脱敏诊断。");
    expect(coverageHtml).toContain("已加载第 1–1、3–3 条");
    expect(coverageHtml).toContain("1 个缺口，共 1 条未加载");
    expect(coverageHtml).toContain("加载剩余 1 条");
  });

  it("renders boundary commands with the real final remainder", () => {
    const resultWindow = windowFromPage(
      page(Array.from({ length: 50 }, (_, index) => hit(index)), 82),
      "manual",
    );
    const html = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
    });

    expect(html).toContain("加载剩余 32 条");
    expect(html).not.toContain("加载后 50 条");
  });

  it("renders uniquely named top/bottom pagination with only known reachable pages", () => {
    const resultWindow = windowFromPage(
      page([hit(50), hit(51)], 250),
      "paged",
    );
    resultWindow.pageCursors = {
      0: "cursor-page-1",
      50: "cursor-current-page",
      100: "cursor-page-3",
      200: "cursor-page-5",
    };
    resultWindow.previousCursor = "cursor-page-1";
    resultWindow.nextCursor = "cursor-page-3";
    resultWindow.hasPrevious = true;
    resultWindow.hasNext = true;
    const html = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
    });

    expect(html).toContain("已加载 2 / 共 250");
    expect(html).toContain("第 51–52 条");
    expect(html.match(/aria-label="顶部搜索结果分页"/g)).toHaveLength(1);
    expect(html.match(/aria-label="底部搜索结果分页"/g)).toHaveLength(1);
    expect(html).not.toContain('aria-label="搜索结果分页"');
    expect(html.match(/第 2 \/ 5 页/g)).toHaveLength(2);
    expect(html.match(/>上一页<\/button>/g)).toHaveLength(2);
    expect(html.match(/>下一页<\/button>/g)).toHaveLength(2);
    expect(html.match(/aria-label="跳到第 1 页"/g)).toHaveLength(2);
    expect(html.match(/aria-label="跳到第 3 页"/g)).toHaveLength(2);
    expect(html.match(/aria-label="跳到第 5 页"/g)).toHaveLength(2);
    expect(html).not.toContain('aria-label="跳到第 4 页"');
    expect(html.match(/aria-current="page"/g)).toHaveLength(2);
  });

  it("disables every page transition while paging or stale", () => {
    const resultWindow = windowFromPage(page([hit(50), hit(51)], 250), "paged");
    resultWindow.pageCursors = {
      0: "cursor-page-1",
      50: "cursor-current-page",
      100: "cursor-page-3",
    };
    resultWindow.previousCursor = "cursor-page-1";
    resultWindow.nextCursor = "cursor-page-3";
    resultWindow.hasPrevious = true;
    resultWindow.hasNext = true;
    resultWindow.operations.page = { status: "loading" };

    const loadingHtml = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
    });
    const staleHtml = renderPane({
      window: { ...resultWindow, operations: { ...resultWindow.operations, page: { status: "idle" } } },
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
      stale: true,
    });

    expect(loadingHtml.match(/disabled=""/g)).toHaveLength(10);
    expect(loadingHtml.match(/>取消翻页<\/button>/g)).toHaveLength(2);
    expect(staleHtml.match(/disabled=""/g)).toHaveLength(10);
    expect(staleHtml).not.toContain("取消翻页");
  });

  it("renders an exact page retry only while its cursor and target remain reachable", () => {
    const resultWindow = windowFromPage(page([hit(50), hit(51)], 250), "paged");
    resultWindow.pageCursors = {
      0: "cursor-page-1",
      50: "cursor-current-page",
      100: "cursor-page-3",
    };
    resultWindow.operations.page = {
      status: "error",
      errorCode: "request_failed",
      attemptedCursor: "cursor-page-3",
      targetPageStart: 100,
    };

    const exactHtml = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
    });
    const tamperedHtml = renderPane({
      window: {
        ...resultWindow,
        operations: {
          ...resultWindow.operations,
          page: {
            status: "error",
            errorCode: "request_failed",
            attemptedCursor: "malicious-cursor",
            targetPageStart: 100,
          },
        },
      },
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
    });

    expect(exactHtml.match(/重试第 3 页/g)).toHaveLength(2);
    expect(tamperedHtml).not.toContain("重试第 3 页");
    expect(tamperedHtml).toContain("搜索请求失败");
  });

  it("exposes cancellation for active boundary and page requests", () => {
    const manual = manualWindow();
    manual.totalCount = 52;
    manual.gaps = [{ start: 2, end: 52 }];
    manual.hasNext = true;
    manual.nextCursor = "next-2";
    manual.operations.forward = { status: "loading" };
    const manualHtml = renderPane({
      window: manual,
      presentation: presentationFor(manual),
      appliedQuery: "Synthetic",
    });
    expect(manualHtml).toContain("取消加载后 50 条");

    const paged = windowFromPage(page([hit(50), hit(51)], 132), "paged");
    paged.operations.page = { status: "loading" };
    const pagedHtml = renderPane({
      window: paged,
      presentation: presentationFor(paged),
      appliedQuery: "Synthetic",
    });
    expect(pagedHtml.match(/取消翻页/g)).toHaveLength(2);
  });

  it("caps the pre-virtualizer first frame instead of materializing every retained entry", () => {
    expect(initialSearchRenderIndexes(100)).toHaveLength(24);
    expect(initialSearchRenderIndexes(3)).toEqual([0, 1, 2]);
  });

  it("waits for a real scroll element before consuming a return anchor", () => {
    const anchor = { resultId: "search-hit-anchor", offsetFromViewportTop: -12.5 };
    expect(canRestoreSearchScrollAnchor(anchor, false)).toBe(false);
    expect(canRestoreSearchScrollAnchor(anchor, true)).toBe(true);
    expect(canRestoreSearchScrollAnchor(null, true)).toBe(false);
  });

  it("captures the visually first intersecting row with its exact viewport-top offset", () => {
    expect(selectFirstVisibleSearchScrollAnchor(
      [
        { resultId: "lower-row", top: 164, bottom: 220 },
        { resultId: "partially-clipped-row", top: 82, bottom: 118 },
        { resultId: "outside-row", top: 25, bottom: 80 },
      ],
      { top: 100, bottom: 200 },
    )).toEqual({
      resultId: "partially-clipped-row",
      offsetFromViewportTop: -18,
    });
  });

  it("pins an offscreen anchor index once without disturbing virtual range order", () => {
    expect(includeSearchAnchorIndex([7, 8, 9], 2)).toEqual([2, 7, 8, 9]);
    expect(includeSearchAnchorIndex([7, 8, 9], 8)).toEqual([7, 8, 9]);
    expect(includeSearchAnchorIndex([7, 8, 9], null)).toEqual([7, 8, 9]);
  });

  it("keeps a visible roving tab stop when the active row is outside the virtual window", () => {
    expect(resolveSearchResultTabStopId("active-offscreen", ["visible-1", "visible-2"])).toBe(
      "visible-1",
    );
    expect(resolveSearchResultTabStopId("visible-2", ["visible-1", "visible-2"])).toBe(
      "visible-2",
    );
    expect(resolveSearchResultTabStopId(null, [])).toBeNull();
  });

  it("keeps navigation failure and recovery actions local to one result row", () => {
    const resultWindow = manualWindow();
    const html = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
      appliedQuery: "Synthetic",
      navigationByResultId: {
        "search-hit-test-result-0": {
          status: "error",
          sourceIndex: 0,
          message: "无法精确定位这条消息。",
          nearbyFallbackAvailable: true,
        },
      },
    });

    expect(html.match(/role="button"/g)).toHaveLength(2);
    expect(html.match(/无法精确定位这条消息。/g)).toHaveLength(1);
    expect(html.match(/重试精确定位/g)).toHaveLength(1);
    expect(html.match(/按附近时间打开/g)).toHaveLength(1);
    expect(html).toContain("<span>Another </span><mark>Synthetic</mark><span> result</span>");
  });

  it("keeps repeated raw message ids in different conversations as independent rows", () => {
    const resultWindow = windowFromPage(
      page(
        [
          hit(0, { messageId: "shared-message", conversationId: "conversation-a" }),
          hit(1, { messageId: "shared-message", conversationId: "conversation-b" }),
        ],
        2,
      ),
      "manual",
    );
    const html = renderPane({
      window: resultWindow,
      presentation: presentationFor(resultWindow),
      navigationByResultId: {
        "search-hit-test-result-1": {
          status: "error",
          sourceIndex: 1,
          message: "仅第二条定位失败。",
          nearbyFallbackAvailable: false,
        },
      },
    });

    expect(html.match(/role="button"/g)).toHaveLength(2);
    expect(html.match(/仅第二条定位失败。/g)).toHaveLength(1);
  });

  it.each([
    [false, false, true, true],
    [true, false, true, false],
    [false, true, true, false],
    [false, false, false, false],
  ])(
    "guards row activation for loading=%s moved=%s collapsed=%s",
    (loading, pointerMoved, selectionCollapsed, expected) => {
      expect(
        shouldActivateSearchResultRow({ loading, pointerMoved, selectionCollapsed }),
      ).toBe(expected);
    },
  );

  it("schedules one already-intersecting gap only after user scroll intent", () => {
    const candidates = [
      {
        kind: "boundary" as const,
        direction: "backward" as const,
        available: true,
        status: "idle" as const,
      },
      {
        kind: "gap" as const,
        range: { start: 50, end: 180 },
        loadAvailable: true,
        status: "idle" as const,
      },
      {
        kind: "gap" as const,
        range: { start: 250, end: 300 },
        loadAvailable: true,
        status: "idle" as const,
      },
    ];

    expect(
      selectSearchAutoLoadTarget({
        mode: "infinite",
        stale: false,
        userInitiated: false,
        candidates,
      }),
    ).toBeNull();
    expect(
      selectSearchAutoLoadTarget({
        mode: "infinite",
        stale: false,
        userInitiated: true,
        visibilityState: "visible",
        candidates,
      }),
    ).toEqual({ kind: "gap", range: { start: 50, end: 180 } });
    expect(
      selectSearchAutoLoadTarget({
        mode: "infinite",
        stale: false,
        userInitiated: true,
        visibilityState: "hidden",
        candidates,
      }),
    ).toBeNull();
  });

  it.each([
    ["infinite", false, true, "idle", true, true],
    ["infinite", false, true, "idle", false, false],
    ["manual", false, true, "idle", true, false],
    ["paged", false, true, "idle", true, false],
    ["infinite", true, true, "idle", true, false],
    ["infinite", false, false, "idle", true, false],
    ["infinite", false, true, "loading", true, false],
    ["infinite", false, true, "error", true, false],
  ] as const)(
    "auto-load decision for mode=%s stale=%s available=%s status=%s userInitiated=%s",
    (mode, stale, available, status, userInitiated, expected) => {
      expect(shouldAutoLoadSearchBoundary({ mode, stale, available, status, userInitiated })).toBe(
        expected,
      );
    },
  );

  it.each([
    ["infinite", false, true, "idle", true, true],
    ["infinite", false, true, "idle", false, false],
    ["manual", false, true, "idle", true, false],
    ["infinite", true, true, "idle", true, false],
    ["infinite", false, false, "idle", true, false],
    ["infinite", false, true, "loading", true, false],
  ] as const)(
    "auto-loads one adjacent gap batch only after a user scroll",
    (mode, stale, loadAvailable, status, userInitiated, expected) => {
      expect(
        shouldAutoLoadSearchGap({ mode, stale, loadAvailable, status, userInitiated }),
      ).toBe(expected);
    },
  );

  it("offers draft-only zero-result suggestions and hides applied facts in privacy mode", () => {
    const resultWindow = windowFromPage(page([], 0), "manual");
    const presentation = presentationFor(resultWindow);
    const suggestions: PaneProps["zeroResultSuggestions"] = [
      { id: "clear-dates", label: "移除日期限制" },
      { id: "all-categories", label: "改为全部消息类型" },
      { id: "all-conversations", label: "改为全部会话" },
    ];
    const visibleHtml = renderPane({
      window: resultWindow,
      presentation,
      appliedQuery: "Synthetic",
      appliedScopeLabel: "当前会话",
      zeroResultSuggestions: suggestions,
    });
    const privateHtml = renderPane({
      window: resultWindow,
      presentation,
      appliedQuery: "PRIVATE zero query",
      appliedScopeLabel: "PRIVATE zero scope",
      privacyOn: true,
      zeroResultSuggestions: suggestions,
    });

    expect(visibleHtml).toContain("没有找到匹配记录");
    expect(visibleHtml).toContain("“Synthetic”在当前会话中没有命中");
    expect(visibleHtml).toContain("移除日期限制");
    expect(visibleHtml).toContain("改为全部消息类型");
    expect(visibleHtml).toContain("改为全部会话");
    expect(visibleHtml).toContain("建议只修改草稿；请检查后再显式应用");
    expect(privateHtml).toContain("当前已应用条件没有命中");
    expect(privateHtml).not.toContain("PRIVATE zero query");
    expect(privateHtml).not.toContain("PRIVATE zero scope");
  });

  it("keeps the full result lifecycle and disables conflicting suggestions for a zero snapshot", () => {
    const resultWindow = windowFromPage(page([], 0), "manual");
    const presentation = presentationFor(resultWindow);
    const suggestions: PaneProps["zeroResultSuggestions"] = [
      { id: "edit-keyword", label: "修改关键词" },
    ];
    const pendingHtml = renderPane({
      window: resultWindow,
      presentation,
      pending: true,
      replacementRequest: { status: "loading", requestId: "private-request" },
      zeroResultSuggestions: suggestions,
    });
    const cancelledHtml = renderPane({
      window: resultWindow,
      presentation,
      replacementRequest: { status: "cancelled" },
      zeroResultSuggestions: suggestions,
    });
    const staleHtml = renderPane({
      window: resultWindow,
      presentation,
      stale: true,
      zeroResultSuggestions: suggestions,
      refreshActiveNotice: "原先定位的结果已不存在，已选择刷新结果中的第一条。",
    });

    expect(pendingHtml).toContain('aria-label="搜索结果工具栏"');
    expect(pendingHtml).toContain("正在准备新结果，当前仍显示上次结果");
    expect(pendingHtml).toContain("取消新搜索");
    expect(pendingHtml).toContain('disabled=""');
    expect(pendingHtml).not.toContain("private-request");
    expect(cancelledHtml).toContain("新搜索已取消，仍显示上次结果");
    expect(staleHtml).toContain("数据已变化，当前结果已冻结");
    expect(staleHtml).toContain("刷新搜索");
    expect(staleHtml).toContain("原先定位的结果已不存在");
    expect(staleHtml).toContain('aria-label="更多结果操作"');
  });

  it("derives replacement recovery from an executable intent instead of rendering dead retry", () => {
    const resultWindow = manualWindow();
    const presentation = presentationFor(resultWindow);
    const revisionHtml = renderPane({
      window: resultWindow,
      presentation,
      replacementRequest: { status: "error", errorCode: "stale_revision" },
      retryAvailable: false,
    });
    const invalidHtml = renderPane({
      window: resultWindow,
      presentation,
      replacementRequest: { status: "error", errorCode: "invalid_request" },
      retryAvailable: false,
      resubmitDisabled: true,
      resubmitDisabledReason: "请检查搜索条件。",
    });

    expect(revisionHtml).toContain("刷新上次结果");
    expect(revisionHtml).not.toContain("重试上次请求");
    expect(invalidHtml).toContain("请检查搜索条件");
    expect(invalidHtml).not.toContain("重试上次请求");
    expect(invalidHtml).not.toContain("重新提交当前草稿</button>");
  });
});

function renderPane(overrides: Partial<PaneProps> = {}): string {
  return renderToStaticMarkup(<SearchResultsPane {...baseProps} {...overrides} />);
}

function manualWindow(hitOverrides: Partial<SearchHit> = {}): SearchResultWindow {
  return windowFromPage(
    page(
      [
        hit(0, hitOverrides),
        hit(1, {
          ...hitOverrides,
          snippet: hitOverrides.snippet ?? "Another Synthetic result",
          matchSegments: hitOverrides.matchSegments ?? [
            { text: "Another ", matched: false },
            { text: "Synthetic", matched: true },
            { text: " result", matched: false },
          ],
        }),
      ],
      2,
    ),
    "manual",
  );
}

function sparseWindow(): SearchResultWindow {
  const left = hit(0);
  const right = hit(2, {
    snippet: "Another Synthetic result",
    matchSegments: [
      { text: "Another ", matched: false },
      { text: "Synthetic", matched: true },
      { text: " result", matched: false },
    ],
  });
  const seed = windowFromPage(page([left], 3), "manual");
  return {
    ...seed,
    retainedHits: [left, right],
    loadedRanges: [
      { start: 0, end: 1 },
      { start: 2, end: 3 },
    ],
    gaps: [{ start: 1, end: 2 }],
    hasNext: false,
    nextCursor: "",
    operations: {
      ...seed.operations,
      gaps: { "1:2": { status: "error", errorCode: "request_failed" } },
    },
  };
}

function presentationFor(
  resultWindow: SearchResultWindow,
  options: {
    sortMode?: PaneProps["sortMode"];
    groupingMode?: PaneProps["groupingMode"];
    privacyOn?: boolean;
  } = {},
): SearchResultPresentation {
  const sortMode = options.sortMode ?? "baseline";
  const groupingMode = options.groupingMode ?? "none";
  const privacyOn = options.privacyOn ?? false;
  const hits = resultWindow.browseMode === "paged"
    ? resultWindow.currentPageHits
    : resultWindow.retainedHits;
  const ordered = hits.map((candidate) => ({
    ...candidate,
    matchSegments: candidate.matchSegments.map((segment) => ({ ...segment })),
  })).sort((left, right) => {
    if (sortMode === "baseline") return left.sourceIndex - right.sourceIndex;
    const timeDelta = left.timestamp - right.timestamp;
    return timeDelta === 0
      ? left.sourceIndex - right.sourceIndex
      : sortMode === "oldest" ? timeDelta : -timeDelta;
  });
  const rows = ordered.map((candidate) => ({
    id: `search-hit-test-result-${candidate.sourceIndex}` as const,
    hit: candidate,
    conversationLabel: privacyOn
      ? "已隐藏会话"
      : candidate.conversationName || candidate.conversationId,
    senderLabel: privacyOn
      ? "已隐藏发送者"
      : candidate.senderName || candidate.senderId || "未知发送者",
    categoryLabel: candidate.category === "text" ? "文字" : "其他",
    matchFieldLabel: candidate.matchField === "content" ? "正文" : "可见内容",
    timeLabel: "2023/11/15 06:13",
    snippetSegments: candidate.matchSegments.map((segment) => ({
      ...segment,
      text: privacyOn ? "••••" : segment.text,
    })),
  }));
  return {
    sortMode,
    groupingMode,
    groups: [{ key: "all", label: null, rows }],
  };
}

function windowFromPage(
  snapshotPage: SearchSnapshotPage,
  browseMode: SearchResultWindow["browseMode"],
): SearchResultWindow {
  const retainedHits = snapshotPage.messages.map((candidate) => ({
    ...candidate,
    matchSegments: candidate.matchSegments.map((segment) => ({ ...segment })),
  }));
  const loadedRanges = retainedHits.length === 0
    ? []
    : [{
        start: retainedHits[0].sourceIndex,
        end: retainedHits[retainedHits.length - 1].sourceIndex + 1,
      }];
  const gaps = [] as SearchResultWindow["gaps"];
  const loaded = loadedRanges[0];
  if (loaded?.start) gaps.push({ start: 0, end: loaded.start });
  if ((loaded?.end ?? 0) < snapshotPage.totalCount) {
    gaps.push({ start: loaded?.end ?? 0, end: snapshotPage.totalCount });
  }
  return {
    snapshotId: snapshotPage.snapshotId,
    dataRevision: snapshotPage.dataRevision,
    exactTotal: snapshotPage.exactTotal,
    completeScope: snapshotPage.completeScope,
    totalCount: snapshotPage.totalCount,
    browseMode,
    retainedHits,
    currentPageHits: retainedHits.map((candidate) => ({
      ...candidate,
      matchSegments: candidate.matchSegments.map((segment) => ({ ...segment })),
    })),
    currentPageStart: snapshotPage.windowStart,
    previousCursor: snapshotPage.previousCursor,
    nextCursor: snapshotPage.nextCursor,
    hasPrevious: snapshotPage.hasPrevious,
    hasNext: snapshotPage.hasNext,
    loadedRanges,
    gaps,
    pageCursors: {
      ...(snapshotPage.previousCursor
        ? { [String(Math.max(0, snapshotPage.windowStart - 50))]: snapshotPage.previousCursor }
        : {}),
      ...(snapshotPage.nextCursor
        ? { [String(snapshotPage.windowStart + snapshotPage.count)]: snapshotPage.nextCursor }
        : {}),
    },
    pageReadingPositions: {},
    activeSourceIndex: retainedHits[0]?.sourceIndex ?? null,
    scrollAnchors: { manual: null, infinite: null, paged: null },
    restoreScrollAnchor: null,
    operations: {
      initial: { status: "idle" },
      forward: { status: "idle" },
      backward: { status: "idle" },
      page: { status: "idle" },
      gaps: {},
    },
  };
}

function page(messages: SearchHit[], totalCount: number): SearchSnapshotPage {
  const windowStart = messages[0]?.sourceIndex ?? 0;
  const count = messages.length;
  return {
    snapshotId: "snapshot-synthetic",
    dataRevision: "revision-synthetic",
    exactTotal: true,
    completeScope: true,
    totalCount,
    count,
    windowStart,
    previousCursor: windowStart > 0 ? `previous-${windowStart}` : "",
    nextCursor: windowStart + count < totalCount ? `next-${windowStart + count}` : "",
    hasPrevious: windowStart > 0,
    hasNext: windowStart + count < totalCount,
    messages,
  };
}

function hit(sourceIndex: number, overrides: Partial<SearchHit> = {}): SearchHit {
  return {
    messageId: `message-${sourceIndex}`,
    seq: 1_000 + sourceIndex,
    sourceIndex,
    conversationId: "conversation-synthetic",
    conversationName: "Synthetic Conversation",
    senderId: "sender-synthetic",
    senderName: "Synthetic Sender",
    timestamp: 1_700_000_000 - sourceIndex,
    type: 1,
    subType: 0,
    category: "text",
    matchField: "content",
    snippet: "Synthetic result",
    matchSegments: [
      { text: "Synthetic", matched: true },
      { text: " result", matched: false },
    ],
    ...overrides,
  };
}
