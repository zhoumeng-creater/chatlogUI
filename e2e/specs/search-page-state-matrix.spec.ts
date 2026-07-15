import {
  expect,
  test,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";
import { setDesktop } from "../utils/viewport";

const SEARCH_PATH = "/search?codex-smoke=workbench-ready";

type JsonRecord = Record<string, unknown>;

test.describe("search page state matrix", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "chatlog_alpha_workspace_preferences",
        JSON.stringify({ coachMarksPausedUntil: 4_102_444_800_000 }),
      );
    });
    await setDesktop(page);
  });

  test("keeps the last-known-good snapshot across replacement error, cancel, and a late response", async ({
    page,
  }) => {
    const requests: JsonRecord[] = [];
    const late = deferred<void>();
    let lateResponseSettled = false;
    await installSearchRoute(page, async (route, body) => {
      requests.push(body);
      if (body.keyword === "replacement error") {
        await fulfillError(route, 500, "synthetic_failure");
        return;
      }
      if (body.keyword === "replacement cancel") {
        await late.promise;
        try {
          await fulfillSearchPage(route, searchPage({
            label: "Late replacement",
            snapshotId: "snapshot-late-replacement",
            revision: "revision-late-replacement",
            total: 1,
            start: 0,
            count: 1,
          }));
        } catch {
          // The request is expected to have been aborted by the explicit cancel action.
        } finally {
          lateResponseSettled = true;
        }
        return;
      }
      await fulfillSearchPage(route, searchPage({
        label: "Last known good",
        snapshotId: "snapshot-last-known-good",
        revision: "revision-last-known-good",
        total: 2,
        start: 0,
        count: 2,
      }));
    });

    await openReadySearch(page);
    await submitKeyword(page, "baseline query");
    await expect(page.getByText("Last known good result 0", { exact: true })).toBeVisible();

    await page.getByLabel("搜索聊天记录", { exact: true }).fill("replacement error");
    await searchSubmit(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "搜索请求失败" })).toBeVisible();
    await expect(page.getByText("Last known good result 0", { exact: true })).toBeVisible();
    await expect(page.getByText("Late replacement result 0", { exact: true })).toHaveCount(0);

    await page.getByLabel("搜索聊天记录", { exact: true }).fill("replacement cancel");
    await searchSubmit(page).click();
    await expect(page.getByText("正在准备新结果，当前仍显示上次结果", { exact: true }))
      .toBeVisible();
    await page.getByRole("button", { name: "取消新搜索" }).click();
    await expect(page.getByText("新搜索已取消，仍显示上次结果。", { exact: true }))
      .toBeVisible();
    await expect(page.getByText("Last known good result 0", { exact: true })).toBeVisible();

    late.resolve();
    await expect.poll(() => lateResponseSettled).toBe(true);
    await expect(page.getByText("Late replacement result 0", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Last known good result 0", { exact: true })).toBeVisible();
    expect(requests.map((request) => request.keyword)).toEqual([
      "baseline query",
      "replacement error",
      "replacement cancel",
    ]);
  });

  test("preserves the current page on failure, retries the exact attempt, and lets a new query cancel a late page", async ({
    page,
  }) => {
    const pageAttempts: JsonRecord[] = [];
    const latePrevious = deferred<void>();
    let nextAttempts = 0;
    let latePreviousSettled = false;
    await installSearchRoute(page, async (route, body) => {
      if (body.keyword === "fresh replacement") {
        await fulfillSearchPage(route, searchPage({
          label: "Fresh replacement",
          snapshotId: "snapshot-fresh-replacement",
          revision: "revision-fresh-replacement",
          total: 1,
          start: 0,
          count: 1,
        }));
        return;
      }
      if (body.cursor === "cursor-page-50") {
        pageAttempts.push(body);
        nextAttempts += 1;
        if (nextAttempts === 1) {
          await fulfillError(route, 500, "synthetic_page_failure");
          return;
        }
        await fulfillSearchPage(route, searchPage({
          label: "Paged matrix",
          snapshotId: "snapshot-paged-matrix",
          revision: "revision-paged-matrix",
          total: 100,
          start: 50,
          count: 50,
          previousCursor: "cursor-page-0",
        }));
        return;
      }
      if (body.cursor === "cursor-page-0") {
        await latePrevious.promise;
        try {
          await fulfillSearchPage(route, searchPage({
            label: "Late previous page",
            snapshotId: "snapshot-paged-matrix",
            revision: "revision-paged-matrix",
            total: 100,
            start: 0,
            count: 50,
            nextCursor: "cursor-page-50",
          }));
        } catch {
          // A new root search must abort this page request.
        } finally {
          latePreviousSettled = true;
        }
        return;
      }
      await fulfillSearchPage(route, searchPage({
        label: "Paged matrix",
        snapshotId: "snapshot-paged-matrix",
        revision: "revision-paged-matrix",
        total: 100,
        start: 0,
        count: 50,
        nextCursor: "cursor-page-50",
      }));
    });

    await openReadySearch(page);
    await submitKeyword(page, "paged failure");
    await page.getByRole("button", { name: "浏览方式：手动加载" }).click();
    await page.getByRole("menuitemradio", { name: /分页浏览/ }).click();
    const topPagination = page.getByRole("navigation", { name: "顶部搜索结果分页" });
    await topPagination.getByRole("button", { name: "下一页" }).click();

    await expect(topPagination.getByRole("alert")).toContainText("搜索请求失败");
    await expect(page.getByText("Paged matrix result 0", { exact: true })).toBeVisible();
    await topPagination.getByRole("button", { name: "重试第 2 页" }).click();
    await expect(page.getByText("Paged matrix result 50", { exact: true })).toBeVisible();
    expect(pageAttempts).toHaveLength(2);
    expect(continuationIdentity(pageAttempts[1])).toEqual(continuationIdentity(pageAttempts[0]));

    await topPagination.getByRole("button", { name: "上一页" }).click();
    await expect(topPagination.getByRole("button", { name: "取消翻页" })).toBeVisible();
    await page.getByLabel("搜索聊天记录", { exact: true }).fill("fresh replacement");
    await searchSubmit(page).click();
    await expect(page.getByText("Fresh replacement result 0", { exact: true })).toBeVisible();
    latePrevious.resolve();
    await expect.poll(() => latePreviousSettled).toBe(true);
    await expect(page.getByText("Late previous page result 0", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Fresh replacement result 0", { exact: true })).toBeVisible();
  });

  test("keeps retained results on backward failure and retries the identical cursor", async ({ page }) => {
    const backwardAttempts: JsonRecord[] = [];
    await installSearchRoute(page, async (route, body) => {
      if (body.cursor === "cursor-backward-0") {
        backwardAttempts.push(body);
        if (backwardAttempts.length === 1) {
          await fulfillError(route, 500, "synthetic_backward_failure");
          return;
        }
        await fulfillSearchPage(route, searchPage({
          label: "Backward loaded",
          snapshotId: "snapshot-backward-matrix",
          revision: "revision-backward-matrix",
          total: 100,
          start: 0,
          count: 50,
          nextCursor: "cursor-forward-50",
        }));
        return;
      }
      await fulfillSearchPage(route, searchPage({
        label: "Backward retained",
        snapshotId: "snapshot-backward-matrix",
        revision: "revision-backward-matrix",
        total: 100,
        start: 50,
        count: 50,
        previousCursor: "cursor-backward-0",
      }));
    });

    await openReadySearch(page);
    await submitKeyword(page, "backward failure");
    await page.getByRole("button", { name: "加载前 50 条" }).click();
    await expect(page.getByRole("button", { name: "重试加载前 50 条" })).toBeVisible();
    await expect(page.getByText("Backward retained result 50", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "重试加载前 50 条" }).click();
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 100 / 共 100",
    );
    const retainedAnchor = page.locator(".search-result-row").filter({
      hasText: "Backward retained result 50",
    });
    await retainedAnchor.focus();
    await retainedAnchor.press("Home");
    const firstLoadedRow = page.locator(".search-result-row").filter({
      hasText: "Backward loaded result 0",
    });
    await expect(firstLoadedRow).toBeFocused();
    expect(backwardAttempts).toHaveLength(2);
    expect(continuationIdentity(backwardAttempts[1]))
      .toEqual(continuationIdentity(backwardAttempts[0]));
  });

  test("keeps both loaded ranges on a gap failure and retries the exact gap attempt", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const gapAttempts: JsonRecord[] = [];
    let gapCursorCalls = 0;
    await installSearchRoute(page, async (route, body) => {
      const cursor = typeof body.cursor === "string" ? body.cursor : "";
      const cursorMatch = cursor.match(/^cursor-gap-(\d+)$/u);
      const start = cursorMatch ? Number(cursorMatch[1]) : 0;
      if (start === 450) {
        gapCursorCalls += 1;
        if (gapCursorCalls > 1) {
          gapAttempts.push(body);
          if (gapCursorCalls === 2) {
            await fulfillError(route, 500, "synthetic_gap_failure");
            return;
          }
          await fulfillSearchPage(route, searchPage({
            label: "Gap fill",
            snapshotId: "snapshot-gap-matrix",
            revision: "revision-gap-matrix",
            total: 1_050,
            start: 450,
            count: 50,
            previousCursor: "cursor-gap-400",
            nextCursor: "cursor-gap-500",
          }));
          return;
        }
      }

      const count = Math.min(50, 1_050 - start);
      await fulfillSearchPage(route, searchPage({
        label: start === 0
          ? "Gap near range"
          : start === 1_000
            ? "Gap far range"
            : "Gap retained range",
        snapshotId: "snapshot-gap-matrix",
        revision: "revision-gap-matrix",
        total: 1_050,
        start,
        count,
        previousCursor: start > 0 ? `cursor-gap-${start - 50}` : undefined,
        nextCursor: start + count < 1_050 ? `cursor-gap-${start + count}` : undefined,
      }));
    });

    await openReadySearch(page);
    await submitKeyword(page, "gap failure");
    for (let pageStart = 50; pageStart <= 1_000; pageStart += 50) {
      const response = page.waitForResponse((candidate) => {
        const request = candidate.request();
        const url = new URL(request.url());
        if (request.method() !== "POST" || url.pathname !== "/api/v1/search") return false;
        const requestBody = request.postDataJSON() as JsonRecord;
        return requestBody.cursor === `cursor-gap-${pageStart}`;
      });
      const loadNext = page.getByRole("button", { name: "加载后 50 条" });
      await loadNext.focus();
      await loadNext.press("Enter");
      await response;
    }
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 500 / 共 1,050",
    );
    const gap = page.locator(".search-coverage-gap");
    await scrollSearchResultIndexIntoView(page, 450);
    await expect(gap).toContainText("第 451–1,000 条尚未加载");
    await gap.getByRole("button", { name: "加载相邻 50 条" }).click();
    await expect(gap.getByRole("button", { name: "重试加载相邻 50 条" })).toBeVisible();
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 500 / 共 1,050",
    );
    await expect(page.getByText("Gap far range result 1000", { exact: true })).toBeVisible();
    await scrollSearchSurface(page, "top");
    await expect(page.getByText("Gap near range result 0", { exact: true })).toBeVisible();
    await scrollSearchResultIndexIntoView(page, 450);
    await gap.getByRole("button", { name: "重试加载相邻 50 条" }).click();
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 500 / 共 1,050",
    );
    await expect(gap).toHaveCount(0);
    await scrollSearchResultIndexIntoView(page, 450);
    await expect(page.getByText("Gap fill result 450", { exact: true })).toBeVisible();
    expect(gapAttempts).toHaveLength(2);
    expect(continuationIdentity(gapAttempts[1])).toEqual(continuationIdentity(gapAttempts[0]));
  });

  test("freezes continuation and all-export on stale revision until explicit Refresh", async ({ page }) => {
    const requests: JsonRecord[] = [];
    let rootSearches = 0;
    await installSearchRoute(page, async (route, body) => {
      requests.push(body);
      if (body.cursor === "cursor-stale-next") {
        await fulfillError(route, 409, "search_revision_changed");
        return;
      }
      rootSearches += 1;
      const refreshed = rootSearches > 1;
      await fulfillSearchPage(route, searchPage({
        label: refreshed ? "Refreshed snapshot" : "Stale candidate",
        snapshotId: refreshed ? "snapshot-refreshed" : "snapshot-stale-candidate",
        revision: refreshed ? "revision-refreshed" : "revision-stale-candidate",
        total: refreshed ? 3 : 4,
        start: 0,
        count: 2,
        nextCursor: refreshed ? "cursor-refreshed-next" : "cursor-stale-next",
      }));
    });

    await openReadySearch(page);
    await submitKeyword(page, "stale matrix");
    await page.getByRole("button", { name: "加载剩余 2 条" }).click();
    const toolbar = page.getByRole("region", { name: "搜索结果工具栏" });
    await expect(toolbar).toContainText("数据已变化，当前结果已冻结。");
    await expect(page.getByText("数据已更新，请先刷新后继续加载。", { exact: true }))
      .toBeVisible();
    await expect(page.getByText("Stale candidate result 0", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "导出搜索结果" }).click();
    const exportDialog = page.getByRole("dialog", { name: "导出搜索结果" });
    const allScope = exportDialog.getByRole("radio", { name: /全部命中/ });
    const partialScope = exportDialog.getByRole("radio", { name: /当前已加载/ });
    await expect(allScope).toBeDisabled();
    await expect(partialScope).toBeChecked();
    await expect(exportDialog).toContainText("搜索快照已过期，请先刷新搜索。");
    await exportDialog.getByRole("button", { name: "关闭", exact: true }).click();

    await page.getByRole("button", { name: "刷新搜索" }).click();
    await expect(page.getByText("Refreshed snapshot result 0", { exact: true })).toBeVisible();
    await expect(toolbar).not.toContainText("数据已变化，当前结果已冻结。");
    const refreshRequest = requests.at(-1)!;
    expect(refreshRequest).not.toHaveProperty("snapshot_id");
    expect(refreshRequest).not.toHaveProperty("data_revision");
    expect(refreshRequest).not.toHaveProperty("cursor");
    expect(refreshRequest.keyword).toBe("stale matrix");
  });

  test("hides sender filtering when the capability probe downgrades", async ({ page }) => {
    let capabilityResponses = 0;
    const senderRequests: Request[] = [];
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/v1/search/senders/query") {
        senderRequests.push(request);
      }
    });
    await page.route("**/api/v1/search/capabilities**", async (route) => {
      const upstream = await route.fetch();
      const body = await upstream.json() as JsonRecord;
      capabilityResponses += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...body, sender_directory: false }),
      });
    });

    await openReadySearch(page);
    await expect.poll(() => capabilityResponses).toBeGreaterThan(0);
    await expect(page.getByRole("button", { name: "更多筛选", exact: true })).toHaveCount(0);
    await expect(page.getByRole("dialog", { name: "按发送者筛选" })).toHaveCount(0);
    expect(senderRequests).toHaveLength(0);
  });

  test("suppresses composing Enter and validates paste, shortcuts, reverse calendar selection, and invalid dates", async ({
    page,
  }) => {
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    const keyword = page.getByLabel("搜索聊天记录", { exact: true });
    await keyword.fill("Synthetic IME");
    await keyword.evaluate((input) => {
      input.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Enter",
        keyCode: 13,
        bubbles: true,
        cancelable: true,
        isComposing: true,
      }));
    });
    await page.waitForTimeout(150);
    expect(requests).toHaveLength(0);
    await keyword.evaluate((input) => {
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "IME" }));
    });
    await keyword.press("Enter");
    await expect.poll(() => requests.length).toBe(1);
    await expect(page.getByRole("region", { name: "搜索结果", exact: true })).toBeVisible();

    const start = page.getByLabel("开始日期", { exact: true });
    const end = page.getByLabel("结束日期", { exact: true });
    await start.evaluate((input, text) => {
      const transfer = new DataTransfer();
      transfer.setData("text", text);
      input.dispatchEvent(new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
      }));
    }, "2026010220260131");
    await expect(start).toHaveValue("2026-01-02");
    await expect(end).toHaveValue("2026-01-31");
    expect(requests).toHaveLength(1);

    await page.getByRole("button", { name: "打开日期范围选择器" }).click();
    await page.getByRole("dialog", { name: "选择日期范围" })
      .getByRole("button", { name: "近 7 天" }).click();
    const shortcutStart = await start.inputValue();
    const shortcutEnd = await end.inputValue();
    expect(dayDistance(shortcutStart, shortcutEnd)).toBe(6);
    expect(requests).toHaveLength(1);

    await start.fill("");
    await end.fill("");
    await page.getByRole("button", { name: "打开日期范围选择器" }).click();
    const calendar = page.getByRole("dialog", { name: "选择日期范围" });
    const gridLabel = await calendar.getByRole("grid").getAttribute("aria-label");
    const month = /^(\d{4})年(\d{1,2})月$/u.exec(gridLabel ?? "");
    expect(month).not.toBeNull();
    const year = Number(month![1]);
    const monthNumber = Number(month![2]);
    await calendar.getByRole("button", {
      name: `${year}年${monthNumber}月20日`,
      exact: true,
    }).click();
    await calendar.getByRole("button", {
      name: `${year}年${monthNumber}月10日`,
      exact: true,
    }).click();
    await expect(start).toHaveValue(canonicalDay(year, monthNumber, 10));
    await expect(end).toHaveValue(canonicalDay(year, monthNumber, 20));

    await start.fill("20260231");
    await end.fill("");
    await start.press("Tab");
    await expect(page.getByText("开始日期：请输入有效日期", { exact: true })).toBeVisible();
    await expect(searchSubmit(page)).toBeDisabled();
    await keyword.press("Enter");
    await page.waitForTimeout(150);
    expect(requests).toHaveLength(1);
  });

  test("runs export as an independent progress task with cancel, retry, completion, and revision-conflict states", async ({
    page,
  }) => {
    await installTauriExportMock(page);
    const delayedContinuation = deferred<void>();
    let delayedContinuationSettled = false;
    let exportMode: "normal" | "delay" | "conflict" = "delay";
    await installSearchRoute(page, async (route, body) => {
      if (!body.snapshot_id) {
        await fulfillSearchPage(route, searchPage({
          label: "Export source",
          snapshotId: "snapshot-export-matrix",
          revision: "revision-export-matrix",
          total: 3,
          start: 0,
          count: 1,
          nextCursor: "cursor-export-1",
        }));
        return;
      }
      if (exportMode === "conflict") {
        await fulfillSearchPage(route, searchPage({
          label: "Conflicting export",
          snapshotId: "snapshot-export-matrix",
          revision: "revision-export-conflict",
          total: 3,
          start: 0,
          count: 1,
          nextCursor: "cursor-export-1",
        }));
        return;
      }
      if (!body.cursor) {
        await fulfillSearchPage(route, searchPage({
          label: "Export source",
          snapshotId: "snapshot-export-matrix",
          revision: "revision-export-matrix",
          total: 3,
          start: 0,
          count: 1,
          nextCursor: "cursor-export-1",
        }));
        return;
      }
      const modeForRequest = exportMode;
      if (modeForRequest === "delay") {
        await delayedContinuation.promise;
      }
      try {
        await fulfillSearchPage(route, searchPage({
          label: "Export source",
          snapshotId: "snapshot-export-matrix",
          revision: "revision-export-matrix",
          total: 3,
          start: 1,
          count: 2,
          previousCursor: "cursor-export-0",
        }));
      } catch {
        // The delayed page is expected to be aborted by cancelling the export task.
      } finally {
        if (modeForRequest === "delay") delayedContinuationSettled = true;
      }
    });

    await openReadySearch(page);
    await submitKeyword(page, "export matrix");
    await page.getByRole("button", { name: "导出搜索结果" }).click();
    let dialog = page.getByRole("dialog", { name: "导出搜索结果" });
    await dialog.getByRole("button", { name: "开始导出" }).click();
    await expect(dialog.getByText("已处理 1 / 3 条", { exact: true })).toBeVisible();
    await expect(page.getByText("Export source result 0", { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "取消导出" }).click();
    await expect(dialog).toHaveCount(0);
    delayedContinuation.resolve();
    await expect.poll(() => delayedContinuationSettled).toBe(true);
    await expect(page.getByText("Export source result 0", { exact: true })).toBeVisible();

    exportMode = "normal";
    await setNextNativeAppendFailure(page);
    await page.getByRole("button", { name: "导出搜索结果" }).click();
    dialog = page.getByRole("dialog", { name: "导出搜索结果" });
    await dialog.getByRole("button", { name: "开始导出" }).click();
    await expect(dialog.getByRole("alert")).toContainText("导出文件写入失败，请重试。");
    await dialog.getByRole("button", { name: "重试" }).click();
    await expect(page.getByRole("status").filter({ hasText: "导出完成" })).toBeVisible();
    await expect(page.getByText("Export source result 0", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "关闭导出完成提示" }).click();

    exportMode = "conflict";
    await page.getByRole("button", { name: "导出搜索结果" }).click();
    dialog = page.getByRole("dialog", { name: "导出搜索结果" });
    await dialog.getByRole("button", { name: "开始导出" }).click();
    await expect(dialog.getByRole("alert")).toContainText("数据已更新，请刷新搜索后重试。");
    await expect(dialog.getByRole("button", { name: "重试" })).toHaveCount(0);
    await expect(page.getByText("Export source result 0", { exact: true })).toBeVisible();

    const commands = await nativeExportCommands(page);
    expect(commands.filter((command) => command === "begin_business_export_stream").length)
      .toBeGreaterThanOrEqual(4);
    expect(commands).toContain("append_business_export_stream");
    expect(commands).toContain("complete_business_export_stream");
    expect(commands.filter((command) => command === "cancel_business_export_stream").length)
      .toBeGreaterThanOrEqual(3);
  });
});

async function openReadySearch(page: Page) {
  await page.goto(SEARCH_PATH);
  await expect(page.getByRole("region", { name: "搜索工作区" })).toBeVisible();
  await expect(page.getByRole("region", { name: "搜索条件" })).toBeVisible();
  await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();
}

async function submitKeyword(page: Page, keyword: string) {
  await page.getByLabel("搜索聊天记录", { exact: true }).fill(keyword);
  await searchSubmit(page).click();
  await expect(page.getByRole("region", { name: "搜索结果", exact: true })).toBeVisible();
}

async function scrollSearchSurface(page: Page, edge: "top" | "bottom") {
  await page.locator(".workspace-page__surface").evaluate((element, targetEdge) => {
    element.scrollTop = targetEdge === "bottom" ? element.scrollHeight : 0;
  }, edge);
}

async function scrollSearchResultIndexIntoView(page: Page, index: number) {
  const list = page.locator(".search-result-list");
  const target = list.locator(`[data-index="${index}"]`);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await target.count() > 0) return;
    await list.evaluate(async (element, targetIndex) => {
      const surface = element.closest<HTMLElement>(".workspace-page__surface");
      if (!surface) throw new Error("search result scroll surface is unavailable");
      const renderedIndexes = [...element.querySelectorAll<HTMLElement>("[data-index]")]
        .flatMap((entry) => {
          const value = Number(entry.dataset.index);
          return Number.isSafeInteger(value) ? [value] : [];
        });
      const maximumRenderedIndex = Math.max(0, ...renderedIndexes);
      const targetRatio = maximumRenderedIndex > targetIndex
        ? targetIndex / maximumRenderedIndex
        : 1;
      surface.scrollTop = (surface.scrollHeight - surface.clientHeight) * targetRatio;
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }, index);
  }
  const metrics = await list.evaluate((element) => {
    const surface = element.closest<HTMLElement>(".workspace-page__surface");
    return {
      listHeight: element.getBoundingClientRect().height,
      scrollHeight: surface?.scrollHeight,
      clientHeight: surface?.clientHeight,
      renderedIndexes: [...element.querySelectorAll<HTMLElement>("[data-index]")]
        .map((entry) => entry.dataset.index),
    };
  });
  throw new Error(`search result index ${index} was not rendered: ${JSON.stringify(metrics)}`);
}

function searchSubmit(page: Page) {
  return page
    .getByRole("region", { name: "搜索工作区" })
    .getByRole("button", { name: /^(搜索|应用筛选)$/ });
}

async function installSearchRoute(
  page: Page,
  handler: (route: Route, body: JsonRecord) => Promise<void>,
) {
  await page.route("http://127.0.0.1:5030/api/v1/search**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== "POST" || url.pathname !== "/api/v1/search") {
      await route.fallback();
      return;
    }
    await handler(route, request.postDataJSON() as JsonRecord);
  });
}

interface SearchPageFixture {
  label: string;
  snapshotId: string;
  revision: string;
  total: number;
  start: number;
  count: number;
  previousCursor?: string;
  nextCursor?: string;
}

function searchPage(fixture: SearchPageFixture) {
  const slug = fixture.label.toLocaleLowerCase().replace(/[^a-z0-9]+/gu, "-");
  const messages = Array.from({ length: fixture.count }, (_, offset) => {
    const sourceIndex = fixture.start + offset;
    const snippet = `${fixture.label} result ${sourceIndex}`;
    return {
      message_id: `${slug}-message-${sourceIndex}`,
      seq: 10_000 + sourceIndex,
      source_index: sourceIndex,
      conversation_id: `${slug}-conversation`,
      conversation_name: `${fixture.label} Conversation`,
      sender_id: `${slug}-sender`,
      sender_name: `${fixture.label} Sender`,
      timestamp: 1_767_254_400 + sourceIndex,
      type: 1,
      sub_type: 0,
      category: "text",
      match_field: "content",
      snippet,
      match_segments: [
        { text: fixture.label, matched: true },
        { text: ` result ${sourceIndex}`, matched: false },
      ],
    };
  });
  return {
    snapshot_id: fixture.snapshotId,
    data_revision: fixture.revision,
    exact_total: true,
    complete_scope: true,
    total_count: fixture.total,
    count: fixture.count,
    window_start: fixture.start,
    previous_cursor: fixture.previousCursor ?? "",
    next_cursor: fixture.nextCursor ?? "",
    has_previous: Boolean(fixture.previousCursor),
    has_next: Boolean(fixture.nextCursor),
    messages,
  };
}

async function fulfillSearchPage(route: Route, body: ReturnType<typeof searchPage>) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function fulfillError(route: Route, status: number, code: string) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify({ code }),
  });
}

function continuationIdentity(request: JsonRecord) {
  return {
    snapshot_id: request.snapshot_id,
    data_revision: request.data_revision,
    cursor: request.cursor,
    limit: request.limit,
    keyword: request.keyword,
  };
}

function captureJsonRequests(page: Page, method: string, pathname: string) {
  const values: JsonRecord[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (request.method() !== method || url.pathname !== pathname) return;
    try {
      values.push(request.postDataJSON() as JsonRecord);
    } catch {
      values.push({});
    }
  });
  return values;
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function canonicalDay(year: number, month: number, day: number) {
  return [year, month, day].map((part, index) =>
    index === 0 ? String(part).padStart(4, "0") : String(part).padStart(2, "0"))
    .join("-");
}

function dayDistance(start: string, end: string) {
  return Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000,
  );
}

interface NativeExportMockState {
  invocations: Array<{ command: string; args?: JsonRecord }>;
  failNextAppend: boolean;
  sessionSequence: number;
}

async function installTauriExportMock(page: Page) {
  await page.addInitScript(() => {
    const host = window as Window & {
      __SEARCH_EXPORT_MOCK__?: NativeExportMockState;
    };
    const state: NativeExportMockState = {
      invocations: [],
      failNextAppend: false,
      sessionSequence: 0,
    };
    host.__SEARCH_EXPORT_MOCK__ = state;
    window.__TAURI_INTERNALS__ = {
      invoke: async (command: string, args?: JsonRecord) => {
        state.invocations.push({ command, args });
        if (command === "plugin:dialog|save") {
          return "C:\\Synthetic\\chatlog-search.md";
        }
        if (command === "begin_business_export_stream") {
          state.sessionSequence += 1;
          const payload = args?.payload as { expectedExtension?: string } | undefined;
          return {
            sessionId: `synthetic-export-session-${state.sessionSequence}`,
            fileName: "chatlog-search.md",
            extension: payload?.expectedExtension ?? "md",
          };
        }
        if (command === "append_business_export_stream") {
          if (state.failNextAppend) {
            state.failNextAppend = false;
            throw new Error("synthetic write failure");
          }
          return { bytesWritten: String(args?.chunk ?? "").length };
        }
        if (command === "complete_business_export_stream") {
          return { fileName: "chatlog-search.md", extension: "md", bytesWritten: 321 };
        }
        if (command === "cancel_business_export_stream") return null;
        return null;
      },
    };
  });
}

async function setNextNativeAppendFailure(page: Page) {
  await page.evaluate(() => {
    const host = window as Window & { __SEARCH_EXPORT_MOCK__?: NativeExportMockState };
    if (!host.__SEARCH_EXPORT_MOCK__) throw new Error("native export mock is unavailable");
    host.__SEARCH_EXPORT_MOCK__.failNextAppend = true;
  });
}

async function nativeExportCommands(page: Page) {
  return page.evaluate(() => {
    const host = window as Window & { __SEARCH_EXPORT_MOCK__?: NativeExportMockState };
    return host.__SEARCH_EXPORT_MOCK__?.invocations.map((entry) => entry.command) ?? [];
  });
}
