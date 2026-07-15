import { expect, test, type Locator, type Page, type Request } from "@playwright/test";
import { startMockChatlogServer } from "../mock-chatlog-server/server.mjs";
import { expectNoA11yViolations } from "../utils/a11y";
import { assertNoForbiddenVisibleText } from "../utils/privacy-scan";
import {
  hasPageHorizontalOverflow,
  setCompact,
  setDesktop,
  setNarrow,
  setRootTextScale,
} from "../utils/viewport";
import { enablePrivacyMode } from "../utils/workbench";

const SEARCH_APP_URL = process.env.SEARCH_PAGE_E2E_BASE_URL ?? "";
const SEARCH_PATH = `${SEARCH_APP_URL}/search?codex-smoke=workbench-ready`;
const SEARCH_PRIVACY_CANARIES = {
  keyword: "SEARCH_C17_KEYWORD_CANARY_7D4C",
  conversation: "SEARCH_C17_CONVERSATION_CANARY_7D4C",
  sender: "SEARCH_C17_SENDER_CANARY_7D4C",
  content: "SEARCH_C17_CONTENT_CANARY_7D4C",
  path: String.raw`C:\SEARCH_C17_PATH_CANARY_7D4C\private-chat.db`,
} as const;

test.describe("search page synthetic acceptance", () => {
  let isolatedMock: Awaited<ReturnType<typeof startMockChatlogServer>>;

  test.beforeAll(async () => {
    isolatedMock = await startMockChatlogServer({ port: 0 });
  });

  test.afterAll(async () => {
    await isolatedMock.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.route("http://127.0.0.1:5030/**", async (route) => {
      const original = new URL(route.request().url());
      const target = new URL(`${original.pathname}${original.search}`, isolatedMock.baseUrl);
      const response = await route.fetch({ url: target.toString() });
      await route.fulfill({ response });
    });
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "chatlog_alpha_workspace_preferences",
        JSON.stringify({ coachMarksPausedUntil: 4_102_444_800_000 }),
      );
    });
  });

  test("submits only explicitly, renders semantic hits, and separates draft filters from applied results", async ({
    page,
  }) => {
    const runtimeProblems: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        runtimeProblems.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => runtimeProblems.push(`pageerror: ${error.message}`));
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);

    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("Synthetic");
    await page.waitForTimeout(350);
    expect(requests).toHaveLength(0);

    await searchSubmit(page).click();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toMatchObject({ keyword: "Synthetic", limit: 50 });

    const toolbar = page.getByRole("region", { name: "搜索结果工具栏" });
    await expect(toolbar).toContainText("“Synthetic”的搜索结果");
    await expect(toolbar).toContainText("已加载 4 / 共 6");
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
    await expect(page.getByText("Synthetic design image preview", { exact: true })).toBeVisible();
    await expect(page.getByText("Synthetic planning brief.pdf", { exact: true })).toBeVisible();
    await expect(page.getByText("文字", { exact: true })).toBeVisible();
    await expect(page.getByText("图片与表情", { exact: true })).toBeVisible();
    await expect(page.getByText("命中来源：正文", { exact: true })).toBeVisible();
    await expect(page.locator(".search-result-row mark")).toHaveCount(4);

    const categoryTrigger = page.getByRole("button", { name: "全部消息类型" });
    await categoryTrigger.click();
    const categoryList = page.getByRole("menu", { name: "消息类型" });
    await expect(categoryList).toBeVisible();
    await categoryList.getByRole("menuitemcheckbox", { name: "文字" }).click();

    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toBeVisible();
    await expect(page.getByText("Synthetic design image preview", { exact: true })).toBeVisible();
    expect(requests).toHaveLength(1);

    await page.keyboard.press("Escape");
    await expect(categoryList).toHaveCount(0);
    await expect(page.getByRole("button", { name: "文字", exact: true })).toBeFocused();
    await expect(searchSubmit(page)).toContainText("应用筛选");

    await searchSubmit(page).click();
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toMatchObject({ keyword: "Synthetic", categories: ["text"] });
    await expect(toolbar).toContainText("已加载 1 / 共 1");
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
    await expect(page.getByText("Synthetic design image preview", { exact: true })).toHaveCount(0);
    expect(runtimeProblems).toEqual([]);
  });

  test("fails a confirmed missing current-chat route closed until the user recovers the scope", async ({
    page,
  }) => {
    await setCompact(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await page.goto(
      `${SEARCH_APP_URL}/search?scope=currentChat&chat=unknown-private-chat&codex-smoke=workbench-ready`,
    );

    const resolutionError = page.getByRole("alert").filter({
      hasText: "无法确定当前会话，请选择会话或切换到全部会话",
    });
    await expect(resolutionError).toBeVisible();
    await expectMinimumControlHeight([
      resolutionError.getByRole("button", { name: "选择会话" }),
      resolutionError.getByRole("button", { name: "改为全部会话" }),
    ]);
    expect(await hasPageHorizontalOverflow(page)).toBe(false);
    await page.getByLabel("搜索聊天记录", { exact: true }).fill("Synthetic");
    await expect(searchSubmit(page)).toBeDisabled();
    await page.getByLabel("搜索聊天记录", { exact: true }).press("Enter");
    await page.waitForTimeout(150);
    expect(requests).toHaveLength(0);

    await resolutionError.getByRole("button", { name: "选择会话" }).click();
    const conversationDialog = page.getByRole("dialog", { name: "选择会话范围" });
    await expect(conversationDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(conversationDialog).toHaveCount(0);

    await resolutionError.getByRole("button", { name: "改为全部会话" }).click();
    await expect(resolutionError).toHaveCount(0);
    await expect(searchSubmit(page)).toBeEnabled();
    await searchSubmit(page).click();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toMatchObject({ keyword: "Synthetic" });
    expect(requests[0]).not.toHaveProperty("chats");
  });

  test("restores hidden history after privacy mode and submits a suggestion only on the second Enter", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const seededKey = "chatlogui.e2e.recentSearchMemorySeeded";
      if (window.sessionStorage.getItem(seededKey) === "1") return;
      window.sessionStorage.setItem(seededKey, "1");
      const succeededAt = Date.now() - 1_000;
      window.localStorage.setItem(
        "chatlogui.search.recentQueries",
        JSON.stringify({
          version: 1,
          rememberRecentSearches: true,
          entries: [
            {
              normalizedQuery: "synthetic recent query",
              displayQuery: "Synthetic recent query",
              succeededAt,
              expiresAt: succeededAt + 30 * 24 * 60 * 60 * 1_000,
            },
            {
              normalizedQuery: "synthetic meeting",
              displayQuery: "Synthetic meeting",
              succeededAt: succeededAt - 1,
              expiresAt: succeededAt - 1 + 30 * 24 * 60 * 60 * 1_000,
            },
          ],
        }),
      );
    });
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);

    const input = page.getByRole("combobox", { name: "搜索聊天记录" });
    await input.focus();
    const history = page.getByRole("menu", { name: "最近搜索" });
    await expect(history).toBeVisible();

    await enablePrivacyMode(page);
    await expect(history).toHaveCount(0);
    await expect(page.getByText("Synthetic recent query", { exact: true })).toHaveCount(0);
    await page.getByRole("button", { name: "关闭隐私模式" }).click();
    await input.focus();
    await expect(history).toBeVisible();
    await expectNoA11yViolations(page);

    await page.keyboard.press("ArrowDown");
    await expect(history.getByRole("menuitem", { name: "Synthetic recent query" })).toHaveAttribute(
      "data-active",
      "true",
    );
    await page.keyboard.press("Enter");

    await expect(input).toHaveValue("Synthetic recent query");
    await expect(input).toBeFocused();
    await expect(history).toHaveCount(0);
    expect(requests).toHaveLength(0);

    await expect(searchSubmit(page)).toBeEnabled();
    await page.keyboard.press("Enter");
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toMatchObject({ keyword: "Synthetic recent query" });
  });

  test("turning off recent-search memory deletes history immediately and stops new recording", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const seededKey = "chatlogui.e2e.recentSearchToggleSeeded";
      if (window.sessionStorage.getItem(seededKey) === "1") return;
      window.sessionStorage.setItem(seededKey, "1");
      const succeededAt = Date.now() - 1_000;
      window.localStorage.setItem(
        "chatlogui.search.recentQueries",
        JSON.stringify({
          version: 1,
          rememberRecentSearches: true,
          entries: [
            {
              normalizedQuery: "synthetic\u0000saved",
              displayQuery: "Synthetic saved",
              succeededAt,
              expiresAt: succeededAt + 30 * 24 * 60 * 60 * 1_000,
            },
          ],
        }),
      );
    });
    await setDesktop(page);
    await openReadySearch(page);
    const input = page.getByRole("combobox", { name: "搜索聊天记录" });
    await input.focus();
    await expect(page.getByRole("menuitem", { name: "Synthetic saved" })).toBeVisible();

    await page.goto(`${SEARCH_APP_URL}/settings?section=advanced&codex-smoke=workbench-ready`);
    await expect(page.getByRole("heading", { name: "隐私与诊断" })).toBeVisible();
    const memorySetting = page.getByRole("group", { name: "记住最近搜索" });
    await expect(
      page.getByText("关闭后会立即删除现有最近搜索，并停止保存新的搜索记录。"),
    ).toBeVisible();
    await memorySetting.getByRole("button", { name: "关闭并删除" }).click();

    await expect
      .poll(() =>
        page.evaluate(() => {
          const raw = window.localStorage.getItem("chatlogui.search.recentQueries");
          return raw ? JSON.parse(raw) : null;
        }),
      )
      .toEqual({
        version: 1,
        rememberRecentSearches: false,
        entries: [],
      });

    await openReadySearch(page);
    await input.focus();
    await expect(page.getByRole("menu", { name: "最近搜索" })).toHaveCount(0);
    await input.fill("Synthetic");
    await searchSubmit(page).click();
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
    expect(
      await page.evaluate(() => {
        const raw = window.localStorage.getItem("chatlogui.search.recentQueries");
        return raw ? JSON.parse(raw) : null;
      }),
    ).toEqual({
      version: 1,
      rememberRecentSearches: false,
      entries: [],
    });
  });

  test("loads conversation and sender directories before applying the scoped draft", async ({
    page,
  }) => {
    await setDesktop(page);
    const conversationRequests = captureJsonRequests(
      page,
      "POST",
      "/api/v1/search/conversations/query",
    );
    const senderRequests = captureJsonRequests(page, "POST", "/api/v1/search/senders/query");
    const searchRequests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");
    await expect.poll(() => searchRequests.length).toBe(1);
    await expect(page.getByRole("button", { name: "更多筛选", exact: true })).toBeVisible();

    await page.getByRole("button", { name: "全部会话", exact: true }).click();
    await page.getByRole("menuitem", { name: "指定会话" }).click();
    const conversationDialog = page.getByRole("dialog", { name: "选择会话范围" });
    await expect(conversationDialog).toBeVisible();
    await expect.poll(() => conversationRequests.length).toBe(1);
    const directConversation = conversationDialog.getByRole("button", {
      name: /Synthetic Session Alpha/,
    });
    await expect(directConversation).toBeVisible();
    await directConversation.click();
    await expect(conversationDialog.getByText("已选 1 个", { exact: true })).toBeVisible();
    await conversationDialog
      .getByRole("searchbox", { name: "搜索会话目录" })
      .fill("Synthetic Chatroom");
    await conversationDialog.getByRole("button", { name: "查询目录" }).click();
    await expect.poll(() => conversationRequests.length).toBe(2);
    const selectedConversation = conversationDialog.getByRole("button", {
      name: "取消选择：Synthetic Session Alpha",
    });
    await expect(selectedConversation).toHaveCount(1);
    await expect(
      conversationDialog.getByRole("button", {
        name: "选择：Synthetic Chatroom",
      }),
    ).toBeVisible();
    await selectedConversation.click();
    await expect(conversationDialog.getByText("已选 1 个", { exact: true })).toHaveCount(0);
    await conversationDialog
      .getByRole("button", {
        name: "选择：Synthetic Session Alpha",
      })
      .click();
    await conversationDialog.getByRole("button", { name: "完成" }).click();
    await expect(conversationDialog).toHaveCount(0);

    await page.getByRole("heading", { name: "搜索" }).click();
    await page.getByRole("button", { name: "更多筛选", exact: true }).click();
    const senderDialog = page.getByRole("dialog", { name: "按发送者筛选" });
    await expect(senderDialog).toBeVisible();
    await expect.poll(() => senderRequests.length).toBe(1);
    const sender = senderDialog.getByRole("button", { name: /Synthetic Contact Alpha/ });
    await expect(sender).toBeVisible();
    await sender.click();
    await senderDialog
      .getByRole("searchbox", { name: "搜索发送者目录" })
      .fill("Synthetic Contact Beta");
    await senderDialog.getByRole("button", { name: "查询目录" }).click();
    await expect.poll(() => senderRequests.length).toBe(2);
    const selectedSender = senderDialog.getByRole("button", {
      name: "取消选择：Synthetic Contact Alpha",
    });
    await expect(selectedSender).toHaveCount(1);
    await expect(
      senderDialog.getByRole("button", {
        name: "选择：Synthetic Contact Beta",
      }),
    ).toBeVisible();
    await selectedSender.click();
    await senderDialog
      .getByRole("button", {
        name: "选择：Synthetic Contact Alpha",
      })
      .click();
    await senderDialog.getByRole("button", { name: "完成" }).click();

    expect(searchRequests).toHaveLength(1);
    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toBeVisible();
    await searchSubmit(page).click();
    await expect.poll(() => searchRequests.length).toBe(2);
    expect(searchRequests[1]).toMatchObject({
      keyword: "Synthetic",
      chats: ["session_synthetic_001"],
      sender_ids: ["contact_synthetic_001"],
    });
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
  });

  test("cancels keyword and filter drafts consistently from the button and both Escape paths", async ({
    page,
  }) => {
    await setDesktop(page);
    await openReadySearch(page);
    const input = page.getByLabel("搜索聊天记录", { exact: true });
    const cancel = page.getByRole("button", { name: "取消修改" });

    await input.fill("Unapplied first query");
    await expect(page.getByRole("status").filter({ hasText: "修改尚未应用" })).toBeVisible();
    await cancel.click();
    await expect(input).toHaveValue("");
    await expect(cancel).toHaveCount(0);

    await submitKeyword(page, "Synthetic");
    await input.fill("Changed keyword");
    await expect(page.getByRole("status").filter({ hasText: "修改尚未应用" })).toBeVisible();
    await cancel.click();
    await expect(input).toHaveValue("Synthetic");

    await page.getByRole("button", { name: "全部消息类型" }).click();
    await page.getByRole("menuitemcheckbox", { name: "文字" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();

    await input.fill("Changed keyword and filter");
    await page.getByRole("button", { name: "全部消息类型" }).click();
    await page.getByRole("menuitemcheckbox", { name: "文字" }).click();
    await page.keyboard.press("Escape");
    await input.focus();
    await page.keyboard.press("Escape");
    await expect(input).toHaveValue("Synthetic");
    await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();
    await expect(cancel).toHaveCount(0);

    await input.fill("IME composition draft");
    const composingEscapePrevented = await input.evaluate((element) => {
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        bubbles: true,
        cancelable: true,
        isComposing: true,
      });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    });
    expect(composingEscapePrevented).toBe(false);
    await expect(input).toHaveValue("IME composition draft");
    await expect(cancel).toBeVisible();
    await input.press("Escape");
    await expect(input).toHaveValue("Synthetic");
  });

  test("appends the next cursor window in manual-load mode without replacing earlier hits", async ({
    page,
  }) => {
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const results = page.getByRole("region", { name: "搜索结果", exact: true });
    await expect(results.locator(".search-result-row")).toHaveCount(4);
    await page.getByRole("button", { name: "加载剩余 2 条" }).click();

    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toMatchObject({
      snapshot_id: "snapshot-search-synthetic-v2",
      data_revision: "revision-search-synthetic-v2",
      cursor: "cursor-search-synthetic-forward-4",
    });
    await expect(results.locator(".search-result-row")).toHaveCount(6);
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
    await expect(page.getByText("Synthetic system notice", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 6 / 共 6",
    );
  });

  test("loads exactly one infinite-mode batch after a user scroll", async ({
    page,
  }) => {
    await installInfiniteSearchFixture(page);
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic infinite");
    await switchToInfiniteBrowseMode(page);

    await userScrollSearchResultsToBottom(page);
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toMatchObject({
      snapshot_id: "snapshot-search-infinite-v1",
      data_revision: "revision-search-infinite-v1",
      cursor: "cursor-search-infinite-50",
    });
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 100 / 共 150",
    );

    await page.waitForTimeout(300);
    expect(requests).toHaveLength(2);
  });

  test("does not auto-load an infinite-mode batch while the document is hidden", async ({
    page,
  }) => {
    await installInfiniteSearchFixture(page);
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic infinite hidden");
    await switchToInfiniteBrowseMode(page);

    await setDocumentVisibility(page, "hidden");
    expect(await page.evaluate(() => document.visibilityState)).toBe("hidden");
    await userScrollSearchResultsToBottom(page);
    await page.waitForTimeout(300);

    expect(requests).toHaveLength(1);
  });

  test("stops infinite loading after an error and supports one manual retry", async ({ page }) => {
    const fixture = await installInfiniteSearchFixture(page, { failFirstContinuation: true });
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic infinite recovery");
    await switchToInfiniteBrowseMode(page);

    await userScrollSearchResultsToBottom(page);
    await expect.poll(() => fixture.forwardAttempts).toBe(1);
    const retry = page.getByRole("button", { name: "重试加载后 50 条" });
    await expect(retry).toBeVisible();
    await page.waitForTimeout(300);
    expect(fixture.forwardAttempts).toBe(1);
    expect(requests).toHaveLength(2);

    await retry.focus();
    await retry.press("Enter");
    await expect.poll(() => fixture.forwardAttempts).toBe(2);
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 100 / 共 150",
    );
    expect(requests[2]).toMatchObject({ cursor: "cursor-search-infinite-50" });
    await page.waitForTimeout(300);
    expect(requests).toHaveLength(3);
  });

  test("exposes pagination, sorting, and grouping controls", async ({ page }) => {
    await installPagedAnchorSearchFixture(page);
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic page anchor");

    await expect(page.getByRole("button", { name: "加载后 50 条" })).toBeVisible();
    await page.getByRole("button", { name: "浏览方式：手动加载" }).click();
    await page.getByRole("menuitemradio", { name: /分页浏览/ }).click();
    const pagination = page.getByRole("navigation", { name: "搜索结果分页" }).first();
    await expect(pagination).toBeVisible();
    await expect(pagination.getByRole("button", { name: "下一页" })).toBeEnabled();
    await pagination.getByRole("button", { name: "下一页" }).click();

    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1]).toMatchObject({
      snapshot_id: "snapshot-page-anchor-v1",
      data_revision: "revision-page-anchor-v1",
      cursor: "cursor-page-anchor-50",
    });
    await expect(page.getByText("Synthetic page anchor result 50", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 50 / 共 100",
    );

    await page.getByRole("button", { name: "排序：时间从新到旧" }).click();
    await page.getByRole("menuitemradio", { name: "时间从早到晚" }).click();
    await page.getByRole("button", { name: "分组：不分组" }).click();
    await page.getByRole("menuitemradio", { name: "按会话分组" }).click();
    await expect(page.getByText("仅整理已加载结果", { exact: true })).toBeVisible();
    const firstVisibleGroup = page.locator(".search-result-group__label").first();
    await expect(firstVisibleGroup).toContainText("Synthetic Page Anchor Conversation alpha");
    await expect(firstVisibleGroup).toContainText("已加载 25 条");

    const bottomPagination = page.getByRole("navigation", { name: "搜索结果分页" }).last();
    await bottomPagination.getByRole("button", { name: "上一页" }).click();
    await expect.poll(() => requests.length).toBe(3);
    expect(requests[2]).toMatchObject({ cursor: "cursor-page-anchor-0" });
    await expect(page.getByText("Synthetic page anchor result 0", { exact: true })).toBeVisible();
  });

  test("keeps the active result focused across keyboard browse-mode changes", async ({ page }) => {
    await setDesktop(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const activeRow = page
      .locator(".search-result-row")
      .filter({ hasText: "Synthetic project kickoff notes" });
    const scrollSurface = page.locator(".workspace-page__surface");
    await activeRow.focus();
    await expect(activeRow).toBeFocused();
    await expect(activeRow).toHaveAttribute("aria-current", "true");
    const initialScrollTop = await scrollSurface.evaluate((surface) => surface.scrollTop);

    const manualTrigger = page.getByRole("button", { name: "浏览方式：手动加载" });
    await manualTrigger.focus();
    await manualTrigger.press("Enter");
    const pagedChoice = page.getByRole("menuitemradio", { name: /分页浏览/ });
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowDown");
    await expect(pagedChoice).toBeFocused();
    await pagedChoice.press("Enter");

    await expect(page.getByRole("button", { name: "浏览方式：分页浏览" })).toBeVisible();
    await expect(activeRow).toBeFocused();
    await expect(activeRow).toHaveAttribute("aria-current", "true");
    const pagedScrollTop = await scrollSurface.evaluate((surface) => surface.scrollTop);
    expect(Math.abs(pagedScrollTop - initialScrollTop)).toBeLessThanOrEqual(48);

    const pagedTrigger = page.getByRole("button", { name: "浏览方式：分页浏览" });
    await pagedTrigger.focus();
    await pagedTrigger.press("Enter");
    const manualChoice = page.getByRole("menuitemradio", { name: /手动加载/ });
    await expect(manualChoice).toBeFocused();
    await manualChoice.press("Enter");

    await expect(page.getByRole("button", { name: "浏览方式：手动加载" })).toBeVisible();
    await expect(activeRow).toBeFocused();
    await expect(activeRow).toHaveAttribute("aria-current", "true");
    const restoredScrollTop = await scrollSurface.evaluate((surface) => surface.scrollTop);
    expect(Math.abs(restoredScrollTop - initialScrollTop)).toBeLessThanOrEqual(48);
  });

  test("uses one roving Tab stop and closes condition menus on Tab", async ({ page }) => {
    await setDesktop(page);
    await openReadySearch(page);

    const scopeTrigger = page.getByRole("button", { name: "全部会话", exact: true });
    await scopeTrigger.focus();
    await scopeTrigger.press("Enter");
    const scopeMenu = page.getByRole("menu", { name: "搜索范围" });
    await expect(scopeMenu).toBeVisible();
    await expect
      .poll(() =>
        scopeMenu
          .locator("button:not(:disabled)")
          .evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length),
      )
      .toBe(1);
    await page.keyboard.press("Tab");
    await expect(scopeMenu).toHaveCount(0);
    const categoryTrigger = page.getByRole("button", { name: "全部消息类型" });
    await expect(categoryTrigger).toBeFocused();

    await categoryTrigger.press("Enter");
    const categoryMenu = page.getByRole("menu", { name: "消息类型" });
    await expect(categoryMenu).toBeVisible();
    await page.keyboard.press("ArrowDown");
    await expect(categoryMenu.getByRole("menuitemcheckbox", { name: "文字" })).toBeFocused();
    await expect
      .poll(() =>
        categoryMenu
          .locator("button:not(:disabled)")
          .evaluateAll((buttons) => buttons.filter((button) => button.tabIndex === 0).length),
      )
      .toBe(1);
    await page.keyboard.press("Tab");
    await expect(categoryMenu).toHaveCount(0);
    await expect(page.getByRole("button", { name: "更多筛选", exact: true })).toBeFocused();
  });

  test("restores each paged result row identity and viewport offset when revisiting the page", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await installPagedAnchorSearchFixture(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic page anchor");
    await page.getByRole("button", { name: "浏览方式：手动加载" }).click();
    await page.getByRole("menuitemradio", { name: /分页浏览/ }).click();

    const anchoredRow = page
      .locator(".search-result-row")
      .filter({ hasText: "Synthetic page anchor result 2" });
    await anchoredRow.evaluate((row) => {
      const surface = row.closest<HTMLElement>(".workspace-page__surface");
      if (!surface) throw new Error("search scroll surface missing");
      const offset = row.getBoundingClientRect().top - surface.getBoundingClientRect().top;
      surface.scrollTop += offset - 72;
      row.focus({ preventScroll: true });
    });
    const beforeOffset = await anchoredRow.evaluate((row) => {
      const surface = row.closest<HTMLElement>(".workspace-page__surface");
      if (!surface) throw new Error("search scroll surface missing");
      return row.getBoundingClientRect().top - surface.getBoundingClientRect().top;
    });
    await expect(anchoredRow).toHaveAttribute("aria-current", "true");

    const nextPage = page
      .getByRole("navigation", { name: "顶部搜索结果分页" })
      .getByRole("button", { name: "下一页" });
    await expect(nextPage).toBeEnabled();
    await nextPage.evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByText("Synthetic page anchor result 50", { exact: true })).toBeVisible();

    const previousPage = page
      .getByRole("navigation", { name: "顶部搜索结果分页" })
      .getByRole("button", { name: "上一页" });
    await expect(previousPage).toBeEnabled();
    await previousPage.evaluate((button: HTMLButtonElement) => button.click());

    await expect(anchoredRow).toHaveAttribute("aria-current", "true");
    await expect(anchoredRow).toBeFocused();
    await expect
      .poll(async () => {
        const afterOffset = await anchoredRow.evaluate((row) => {
          const surface = row.closest<HTMLElement>(".workspace-page__surface");
          if (!surface) throw new Error("search scroll surface missing");
          return row.getBoundingClientRect().top - surface.getBoundingClientRect().top;
        });
        return Math.abs(afterOffset - beforeOffset);
      })
      .toBeLessThanOrEqual(2);
  });

  test("keeps zero-result suggestions draft-only until the user explicitly submits again", async ({
    page,
  }) => {
    await setDesktop(page);
    const requests = captureJsonRequests(page, "POST", "/api/v1/search");
    await openReadySearch(page);
    await submitKeyword(page, "synthetic empty result");

    const zeroState = page.getByRole("region", { name: "搜索结果", exact: true });
    await expect(zeroState).toContainText("没有找到匹配记录");
    const editKeyword = page.getByRole("button", { name: "修改关键词" });
    await expect(editKeyword).toBeVisible();
    await editKeyword.click();

    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await expect(input).toBeFocused();
    expect(requests).toHaveLength(1);
    await input.fill("Synthetic");
    await page.waitForTimeout(350);
    expect(requests).toHaveLength(1);
    await searchSubmit(page).click();
    await expect.poll(() => requests.length).toBe(2);
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
  });

  test("opens one exact context and loads the real latest page before claiming latest", async ({
    page,
  }) => {
    await setDesktop(page);
    const contextRequests = captureJsonRequests(page, "POST", "/api/v1/history/context/query");
    const latestHistoryRequests: URL[] = [];
    page.on("request", (request) => {
      if (matchesRequest(request, "GET", "/api/v1/history")) {
        latestHistoryRequests.push(new URL(request.url()));
      }
    });
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const firstResult = page
      .locator(".search-result-row")
      .filter({ hasText: "Synthetic project kickoff notes" });
    await expect(firstResult).toBeVisible();
    await firstResult.focus();
    await page.keyboard.press("Enter");

    await expect.poll(() => contextRequests.length).toBe(1);
    expect(contextRequests[0]).toMatchObject({
      conversation_id: "session_synthetic_001",
      seq: 1101,
      limit: 51,
      data_revision: "revision-search-synthetic-v2",
    });
    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("已定位搜索命中")).toBeVisible();
    await expect(
      page.locator("[data-message-id='history-context:1101'] .message-row--search-hit"),
    ).toBeVisible();
    await page.waitForTimeout(250);
    expect(contextRequests).toHaveLength(1);

    const latestButton = page.getByRole("button", { name: "回到最新" });
    await expect(latestButton).toBeEnabled();
    await expect(page.getByText("已到最新消息", { exact: true })).toHaveCount(0);
    await latestButton.click();

    await expect
      .poll(
        () =>
          latestHistoryRequests.filter((requestUrl) => !requestUrl.searchParams.has("until"))
            .length,
      )
      .toBe(1);
    const latestHistoryRequest = latestHistoryRequests.find(
      (requestUrl) => !requestUrl.searchParams.has("until"),
    );
    expect(latestHistoryRequest?.searchParams.get("chat")).toBe("session_synthetic_001");
    await expect(
      page.getByText("Synthetic long transcript row for stable browser checks"),
    ).toBeVisible();
    await expect(latestButton).toBeDisabled();
  });

  test("opens the first result with Space and requests its exact context once", async ({ page }) => {
    await setDesktop(page);
    const contextRequests = captureJsonRequests(page, "POST", "/api/v1/history/context/query");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const firstResult = page.locator(".search-result-row").first();
    await expect(firstResult).toContainText("Synthetic project kickoff notes");
    await firstResult.focus();
    await page.keyboard.press("Space");

    await expect.poll(() => contextRequests.length).toBe(1);
    expect(contextRequests[0]).toMatchObject({
      conversation_id: "session_synthetic_001",
      seq: 1101,
      limit: 51,
      data_revision: "revision-search-synthetic-v2",
    });
    await expect(page).toHaveURL(/\/workbench/);
    await expect(
      page.locator("[data-message-id='history-context:1101'] .message-row--search-hit"),
    ).toBeVisible();
    await page.waitForTimeout(250);
    expect(contextRequests).toHaveLength(1);
  });

  test("keeps mouse text selection and touch-like movement from opening a result", async ({
    page,
  }) => {
    await setDesktop(page);
    const contextRequests = captureJsonRequests(page, "POST", "/api/v1/history/context/query");
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const result = page
      .locator(".search-result-row")
      .filter({ hasText: "Synthetic project kickoff notes" });
    const snippet = result.locator(".search-result-row__content");
    await expect(snippet).toBeVisible();
    const snippetBox = await snippet.boundingBox();
    expect(snippetBox).not.toBeNull();
    await page.mouse.move(snippetBox!.x + 6, snippetBox!.y + snippetBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      Math.min(snippetBox!.x + snippetBox!.width - 6, snippetBox!.x + 180),
      snippetBox!.y + snippetBox!.height / 2,
      { steps: 8 },
    );
    await page.mouse.up();

    await expect.poll(() => page.evaluate(() => !window.getSelection()?.isCollapsed)).toBe(true);
    await expect(page).toHaveURL(/\/search/);
    expect(contextRequests).toHaveLength(0);

    await page.evaluate(() => window.getSelection()?.removeAllRanges());
    const resultBox = await result.boundingBox();
    expect(resultBox).not.toBeNull();
    const pointerBase = {
      pointerId: 17,
      pointerType: "touch",
      isPrimary: true,
      bubbles: true,
    };
    await result.dispatchEvent("pointerdown", {
      ...pointerBase,
      clientX: resultBox!.x + 24,
      clientY: resultBox!.y + 24,
    });
    await result.dispatchEvent("pointermove", {
      ...pointerBase,
      clientX: resultBox!.x + 32,
      clientY: resultBox!.y + 27,
    });
    await result.dispatchEvent("pointerup", {
      ...pointerBase,
      clientX: resultBox!.x + 32,
      clientY: resultBox!.y + 27,
    });
    await result.dispatchEvent("click", { detail: 1, bubbles: true });

    await page.waitForTimeout(100);
    await expect(page).toHaveURL(/\/search/);
    expect(contextRequests).toHaveLength(0);
  });

  test("restores the exact clicked-row viewport offset after returning from history context", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 520 });
    await installPagedAnchorSearchFixture(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic page anchor");
    await page.getByRole("button", { name: "浏览方式：手动加载" }).click();
    await page.getByRole("menuitemradio", { name: /分页浏览/ }).click();

    const result = page.locator(".search-result-row").filter({
      has: page.getByText("Synthetic page anchor result 2", { exact: true }),
    });
    await expect(result).toBeVisible();
    await result.focus();
    await expect(result).toHaveAttribute("aria-current", "true");
    const initialOffset = await result.evaluate((row) => {
      const surface = row.closest<HTMLElement>(".workspace-page__surface");
      if (!surface) throw new Error("search scroll surface missing");
      return row.getBoundingClientRect().top - surface.getBoundingClientRect().top;
    });
    const surfaceBox = await page.locator(".workspace-page__surface").boundingBox();
    expect(surfaceBox).not.toBeNull();
    await page.mouse.move(
      surfaceBox!.x + surfaceBox!.width / 2,
      surfaceBox!.y + surfaceBox!.height / 2,
    );
    await page.mouse.wheel(0, 240);
    await expect
      .poll(async () => {
        const offset = await result.evaluate((row) => {
          const surface = row.closest<HTMLElement>(".workspace-page__surface");
          if (!surface) throw new Error("search scroll surface missing");
          return row.getBoundingClientRect().top - surface.getBoundingClientRect().top;
        });
        return initialOffset - offset;
      })
      .toBeGreaterThanOrEqual(120);
    await result.scrollIntoViewIfNeeded();

    const clickedPosition = await result.evaluate((row) => {
      const surface = row.closest<HTMLElement>(".workspace-page__surface");
      if (!surface) throw new Error("search scroll surface missing");
      const rowRect = row.getBoundingClientRect();
      const surfaceRect = surface.getBoundingClientRect();
      return {
        offset: rowRect.top - surfaceRect.top,
        rowHeight: rowRect.height,
        surfaceHeight: surfaceRect.height,
      };
    });
    expect(clickedPosition.offset).toBeGreaterThanOrEqual(-1);
    expect(clickedPosition.offset + clickedPosition.rowHeight).toBeLessThanOrEqual(
      clickedPosition.surfaceHeight + 1,
    );
    const beforeOffset = clickedPosition.offset;

    await result.click();
    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("已定位搜索命中")).toBeVisible();
    await page.getByRole("button", { name: "返回搜索结果" }).click();
    await expect(page).toHaveURL(/\/search/);

    await expect(result).toHaveAttribute("aria-current", "true");
    await expect
      .poll(async () => {
        const afterOffset = await result.evaluate((row) => {
          const surface = row.closest<HTMLElement>(".workspace-page__surface");
          if (!surface) throw new Error("search scroll surface missing");
          return row.getBoundingClientRect().top - surface.getBoundingClientRect().top;
        });
        return Math.abs(afterOffset - beforeOffset);
      })
      .toBeLessThanOrEqual(2);
  });

  test("does not move Ctrl+F focus behind an open modal", async ({ page }) => {
    await setDesktop(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    await page.getByRole("button", { name: "导出搜索结果" }).click();
    const dialog = page.getByRole("dialog", { name: "导出搜索结果" });
    await expect(dialog).toBeVisible();
    const formatChoice = dialog.getByRole("radio", { name: "Markdown" });
    await formatChoice.focus();

    await page.keyboard.press("Control+f");

    await expect(page.getByLabel("搜索聊天记录", { exact: true })).not.toBeFocused();
    await expect(dialog).toBeVisible();
  });

  test("SEARCH-C17 keeps private search facts out of privacy DOM, browser output, copy actions, and selection", async ({
    page,
  }) => {
    const privateValues = Object.values(SEARCH_PRIVACY_CANARIES);
    const outputGuard = installSearchPrivacyOutputGuard(page, privateValues);
    const privacyFixture = await installSearchPrivacyCanaryFixture(page);
    await setDesktop(page);
    await openReadySearch(page);
    await page.evaluate((marker) => console.info(marker), "SEARCH_C17_PRIVACY_GUARD_ACTIVE");
    await expect.poll(() => outputGuard.snapshot()).toContain("SEARCH_C17_PRIVACY_GUARD_ACTIVE");
    await enablePrivacyMode(page);
    await submitKeyword(page, SEARCH_PRIVACY_CANARIES.keyword);
    await expect.poll(() => privacyFixture.keywords).toEqual([SEARCH_PRIVACY_CANARIES.keyword]);

    const searchInput = page.getByRole("combobox", { name: "搜索聊天记录" });
    await expect(searchInput).toHaveValue("••••••••");
    const results = page.getByRole("region", { name: "搜索结果", exact: true });
    const firstResult = results.locator(".search-result-row").first();
    await expect(firstResult).toContainText(/[•*]{3,}/);
    const snapshot = await results.evaluate((root) => {
      const attributes = Array.from(
        root.querySelectorAll<HTMLElement>("[aria-label],[title]"),
      ).flatMap((element) => [
        element.getAttribute("aria-label") ?? "",
        element.getAttribute("title") ?? "",
      ]);
      return [root.textContent ?? "", ...attributes].join("\n");
    });
    for (const privateValue of privateValues) {
      expect(snapshot).not.toContain(privateValue);
    }
    const documentSnapshot = await page.locator("body").evaluate((root) => {
      const values = Array.from(root.querySelectorAll<HTMLElement>("*")).flatMap((element) => {
        const attributes = Array.from(element.attributes, ({ value }) => value);
        const formValue =
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
            ? element.value
            : "";
        return [...attributes, formValue];
      });
      return [root.textContent ?? "", ...values].join("\n");
    });
    for (const privateValue of privateValues) {
      expect(documentSnapshot).not.toContain(privateValue);
    }

    await expect(page.getByRole("button", { name: /复制|copy/iu })).toHaveCount(0);
    await expect(page.getByRole("menuitem", { name: /复制|copy/iu })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /复制|copy/iu })).toHaveCount(0);

    expect(await firstResult.evaluate((row) => getComputedStyle(row).userSelect)).toBe("text");
    const selectedPresentation = await firstResult
      .locator(".search-result-row__body")
      .evaluate((body) => {
        const range = document.createRange();
        range.selectNodeContents(body);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        const selectedText = selection?.toString() ?? "";
        selection?.removeAllRanges();
        return selectedText;
      });
    expect(selectedPresentation).toMatch(/[•*]{3,}/);
    for (const privateValue of privateValues) {
      expect(selectedPresentation).not.toContain(privateValue);
    }

    outputGuard.assertNoLeaks();
    await assertNoForbiddenVisibleText(page);
  });

  test("keeps segmented date editing stable across consecutive Backspace keys", async ({
    page,
  }) => {
    await setDesktop(page);
    await openReadySearch(page);
    const dateRange = page.locator(".search-date-range");
    await expect(dateRange.locator("[data-date-segment]")).toHaveCount(6);
    const startDate = page.getByRole("textbox", { name: "开始日期" });
    await startDate.fill("20260711");
    await expect(startDate).toHaveValue("2026-07-11");
    await startDate.evaluate((input: HTMLInputElement) => input.setSelectionRange(6, 6));

    await startDate.press("Backspace");
    await expect(startDate).toHaveValue("2026-7-11");
    await expect
      .poll(() => startDate.evaluate((input: HTMLInputElement) => input.selectionStart))
      .toBe(5);
    await startDate.press("Backspace");
    await expect(startDate).toHaveValue("202-7-11");
    await expect(startDate).not.toHaveValue("2026-71-1");
  });

  test("layers Escape from the top condition overlay to dirty-draft cancellation", async ({
    page,
  }) => {
    await setNarrow(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const calendarTrigger = page.getByRole("button", { name: "打开日期范围选择器" });
    await calendarTrigger.focus();
    await page.keyboard.press("Enter");
    const dateDialog = page.getByRole("dialog", { name: "选择日期范围" });
    await expect(dateDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dateDialog).toHaveCount(0);
    await expect(calendarTrigger).toBeFocused();

    const categoryTrigger = page.getByRole("button", { name: "全部消息类型" });
    await categoryTrigger.focus();
    await page.keyboard.press("Enter");
    const categoryList = page.getByRole("menu", { name: "消息类型" });
    await categoryList.getByRole("menuitemcheckbox", { name: "文字" }).click();
    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(categoryList).toHaveCount(0);
    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toBeVisible();
    await expect(page.getByRole("button", { name: "文字", exact: true })).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
  });

  test("keeps search usable without horizontal overflow from 320 through 1440", async ({
    page,
  }) => {
    await setDesktop(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1280, height: 900 },
      { width: 980, height: 900 },
      { width: 720, height: 900 },
      { width: 390, height: 844 },
      { width: 320, height: 820 },
    ]) {
      await page.setViewportSize(viewport);
      await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
      await expectSearchSurfaceDoesNotOverflow(page);
      const conditionBar = page.getByRole("region", { name: "搜索条件" });
      const categoryTrigger = conditionBar.getByRole("button", { name: "全部消息类型" });
      await expect(conditionBar).toBeVisible();
      await expect(categoryTrigger).toBeEnabled();
      await expect(page.getByLabel("搜索聊天记录", { exact: true })).toBeEnabled();
      const firstResult = page.locator(".search-result-row").first();
      if (viewport.width === 390) {
        await page.locator(".workspace-page__surface").evaluate((surface) => {
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          surface.scrollTop = 0;
        });
        await expect
          .poll(() =>
            page.locator(".workspace-page__surface").evaluate((surface) => surface.scrollTop),
          )
          .toBe(0);
      }
      await expect(firstResult).toBeVisible();
      if (viewport.width === 390) {
        const firstResultBox = await firstResult.boundingBox();
        expect(firstResultBox).not.toBeNull();
        expect(firstResultBox!.y).toBeGreaterThanOrEqual(0);
        expect(firstResultBox!.y + firstResultBox!.height).toBeLessThanOrEqual(viewport.height);
      }
      await firstResult.focus();
      await expect(firstResult).toBeFocused();
      const toolbar = page.getByRole("region", { name: "搜索结果工具栏" });
      await expect(toolbar).toBeVisible();
      await expect(toolbar.getByRole("button", { name: /浏览方式/ })).toBeEnabled();
      if (viewport.width <= 390) {
        await expectMinimumControlHeight([
          searchSubmit(page),
          categoryTrigger,
          toolbar.getByRole("button", { name: /浏览方式/ }),
        ]);
      }
    }

    await setCompact(page);
    await setRootTextScale(page, 2);
    await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
    await expectSearchSurfaceDoesNotOverflow(page);
    await expect(page.getByLabel("搜索聊天记录", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: "搜索条件" })).toBeVisible();
    await expect(page.getByRole("region", { name: "搜索结果", exact: true })).toBeVisible();
  });

  test("keeps the 390px dirty condition bar to two fixed rows", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const conditionBar = page.getByRole("region", { name: "搜索条件" });
    const scopeTrigger = conditionBar.getByRole("button", { name: "全部会话", exact: true });
    const categoryTrigger = conditionBar.getByRole("button", { name: "全部消息类型" });
    const senderTrigger = conditionBar.getByRole("button", { name: "更多筛选" });
    await categoryTrigger.click();
    await conditionBar
      .getByRole("menu", { name: "消息类型" })
      .getByRole("menuitemcheckbox", { name: "文字" })
      .click();
    await page.keyboard.press("Escape");

    const dirtyCategoryTrigger = conditionBar.getByRole("button", {
      name: "文字",
      exact: true,
    });
    const cancelDraft = conditionBar.getByRole("button", { name: "取消修改" });
    const dateRange = conditionBar.locator(".search-date-range");
    await expect(cancelDraft).toBeVisible();
    await expect(dateRange).toBeVisible();

    const geometry = await readSearchConditionGeometry({
      conditionBar,
      firstRow: [scopeTrigger, dirtyCategoryTrigger, senderTrigger, cancelDraft],
      dateRange,
    });
    expect(geometry.conditionHeight).toBeGreaterThanOrEqual(132);
    expect(geometry.conditionHeight).toBeLessThanOrEqual(144);
    expect(
      Math.max(...geometry.firstRowTops) - Math.min(...geometry.firstRowTops),
    ).toBeLessThanOrEqual(2);
    expect(geometry.dateTop).toBeGreaterThanOrEqual(Math.max(...geometry.firstRowBottoms) + 2);
    expect(geometry.dateBottom).toBeLessThanOrEqual(geometry.conditionBottom + 1);
    await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
    await expectSearchSurfaceDoesNotOverflow(page);
  });

  test("scales search typography with the root font size without clipping or overflow", async ({
    page,
  }) => {
    await setCompact(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const targets = {
      input: page.getByLabel("搜索聊天记录", { exact: true }),
      trigger: page.getByRole("region", { name: "搜索条件" }).getByRole("button", {
        name: "全部会话",
        exact: true,
      }),
      date: page.locator(".search-date-range__field input").first(),
      result: page.locator(".search-result-row__content").first(),
    };
    const normalSizes = await readComputedFontSizes(targets);

    await setRootTextScale(page, 2);
    const scaledSizes = await readComputedFontSizes(targets);
    for (const name of Object.keys(targets) as Array<keyof typeof targets>) {
      expect(scaledSizes[name] / normalSizes[name]).toBeGreaterThanOrEqual(1.9);
      expect(scaledSizes[name] / normalSizes[name]).toBeLessThanOrEqual(2.1);
      await expect(targets[name]).toBeVisible();
      const verticalFit = await targets[name].evaluate((element) => {
        const style = getComputedStyle(element);
        const fontSize = Number.parseFloat(style.fontSize);
        return element.getBoundingClientRect().height >= fontSize * 1.25;
      });
      expect(verticalFit).toBe(true);
    }

    await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
    await expectSearchSurfaceDoesNotOverflow(page);
  });

  test("renders date inputs with three proportional focus and error underlines", async ({
    page,
  }) => {
    await setDesktop(page);
    await openReadySearch(page);

    const startInput = page.getByRole("textbox", { name: "开始日期" });
    const segments = startInput.locator("+ .search-date-range__segments > [data-date-segment]");
    await expect(segments).toHaveCount(3);
    const defaultMetrics = await readDateSegmentMetrics(segments);
    expect(defaultMetrics.every((metric) => metric.width > 0)).toBe(true);
    expect(defaultMetrics.every((metric) => metric.style === "solid")).toBe(true);
    expect(defaultMetrics[0].width / defaultMetrics[1].width).toBeGreaterThanOrEqual(1.9);
    expect(defaultMetrics[0].width / defaultMetrics[1].width).toBeLessThanOrEqual(2.1);
    expect(defaultMetrics[1].width).toBeCloseTo(defaultMetrics[2].width, 0);

    await startInput.focus();
    const focusedMetrics = await readDateSegmentMetrics(segments);
    const accent = await readResolvedCustomColor(page, "--accent");
    expect(focusedMetrics.every((metric) => metric.color === accent)).toBe(true);

    await startInput.fill("2026-02-31");
    await page.getByRole("button", { name: "全部会话", exact: true }).focus();
    await expect(startInput).toHaveAttribute("aria-invalid", "true");
    const invalidMetrics = await readDateSegmentMetrics(segments);
    const danger = await readResolvedCustomColor(page, "--danger");
    expect(invalidMetrics.every((metric) => metric.color === danger)).toBe(true);
  });

  test("has exactly zero axe violations in default and condition-overlay states", async ({
    page,
  }) => {
    await setDesktop(page);
    await openReadySearch(page);
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "全部会话", exact: true }).click();
    const scopeMenu = page.getByRole("menu", { name: "搜索范围" });
    await expect(scopeMenu).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");

    await page.getByRole("button", { name: "全部消息类型" }).click();
    const categoryMenu = page.getByRole("menu", { name: "消息类型" });
    await expect(categoryMenu).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");

    await submitKeyword(page, "Synthetic");
    await page.getByRole("button", { name: "更多筛选", exact: true }).click();
    const senderDialog = page.getByRole("dialog", { name: "按发送者筛选" });
    await expect(senderDialog).toBeVisible();
    await senderDialog.getByRole("searchbox", { name: "搜索发送者目录" }).fill("Synthetic");
    await senderDialog.getByRole("button", { name: "查询目录" }).click();
    const sender = senderDialog.getByRole("button", { name: /Synthetic Contact Alpha/ });
    await expect(sender).toBeVisible();
    await sender.click();
    await expectNoA11yViolations(page);
    await senderDialog.getByRole("button", { name: "完成" }).click();

    await page.getByRole("button", { name: "打开日期范围选择器" }).click();
    const dateDialog = page.getByRole("dialog", { name: "选择日期范围" });
    await expect(dateDialog).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("has exactly zero axe violations for recent history and 390px draft states", async ({
    page,
  }) => {
    await seedRecentSearchHistory(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await openReadySearch(page);
    await expectNoA11yViolations(page);

    const input = page.getByRole("combobox", { name: "搜索聊天记录" });
    await input.focus();
    const recentMenu = page.getByRole("menu", { name: "最近搜索" });
    await expect(recentMenu).toBeVisible();
    await expectNoA11yViolations(page);
    await page.keyboard.press("Escape");
    await expect(recentMenu).toHaveCount(0);

    const longChineseDraft = "超长中文搜索草稿用于验证条件栏与搜索输入在窄屏下保持完整可用".repeat(
      4,
    );
    await input.fill(longChineseDraft);
    await expect(input).toHaveValue(longChineseDraft);
    await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
    await expectSearchSurfaceDoesNotOverflow(page);
    await expectNoA11yViolations(page);
  });

  test("has exactly zero axe violations for applied coverage and export dialog states", async ({
    page,
  }) => {
    await setDesktop(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    await expect(page.getByRole("button", { name: "加载剩余 2 条" })).toBeVisible();
    await page.getByRole("button", { name: "分组：不分组" }).click();
    await page.getByRole("menuitemradio", { name: "按会话分组" }).click();
    await expect(page.locator(".search-coverage-summary")).toContainText("1 个缺口，共 2 条未加载");
    await expectNoA11yViolations(page);

    await page.getByRole("button", { name: "导出搜索结果" }).click();
    await expect(page.getByRole("dialog", { name: "导出搜索结果" })).toBeVisible();
    await expect(
      page.locator(".spring-modal__panel").filter({
        has: page.locator(".search-export-dialog"),
      }),
    ).toHaveCSS("opacity", "1");
    await expectNoA11yViolations(page);
  });

  test("has exactly zero axe violations after a real inline gap is rendered", async ({ page }) => {
    test.setTimeout(120_000);
    await installInlineGapSearchFixture(page);
    await setDesktop(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic inline gap");
    for (let pageStart = 50; pageStart <= 1_000; pageStart += 50) {
      const response = page.waitForResponse((candidate) => {
        if (!matchesRequest(candidate.request(), "POST", "/api/v1/search")) return false;
        const request = candidate.request().postDataJSON() as { cursor?: string };
        return request.cursor === `cursor-inline-gap-${pageStart}`;
      });
      const loadNext = page.getByRole("button", { name: "加载后 50 条" });
      await loadNext.focus();
      await loadNext.press("Enter");
      await response;
    }
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toContainText(
      "已加载 500 / 共 1,050",
    );
    await expect(page.getByRole("button", { name: "加载后 50 条" })).toHaveCount(0);

    const inlineGap = page.locator(".search-coverage-gap");
    await scrollSearchResultIndexIntoView(page, 450);
    await expect(inlineGap).toContainText("第 451–1,000 条尚未加载");
    await expect(inlineGap.getByRole("button", { name: "加载相邻 50 条" })).toBeVisible();
    await expectNoA11yViolations(page);
  });

  test("renders the applied result state in dark mode without serious axe violations", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    await setDesktop(page);
    await openReadySearch(page);
    await submitKeyword(page, "Synthetic");

    const darkSurface = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--surface-app")
        .trim()
        .toLowerCase(),
    );
    expect(darkSurface).toBe("#17191d");
    await expect(page.getByRole("region", { name: "搜索结果工具栏" })).toBeVisible();
    await expectNoA11yViolations(page);
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

async function seedRecentSearchHistory(page: Page) {
  await page.addInitScript(() => {
    const succeededAt = Date.now() - 1_000;
    window.localStorage.setItem(
      "chatlogui.search.recentQueries",
      JSON.stringify({
        version: 1,
        rememberRecentSearches: true,
        entries: [
          {
            normalizedQuery: "synthetic recent query",
            displayQuery: "Synthetic recent query",
            succeededAt,
            expiresAt: succeededAt + 30 * 24 * 60 * 60 * 1_000,
          },
        ],
      }),
    );
  });
}

function installSearchPrivacyOutputGuard(page: Page, privateValues: readonly string[]) {
  const browserOutput: string[] = [];
  page.on("console", (message) => {
    browserOutput.push(`[console:${message.type()}] ${message.text()}`);
  });
  page.on("pageerror", (error) => {
    browserOutput.push(`[pageerror] ${error.message}`);
  });
  page.on("requestfailed", (request) => {
    browserOutput.push(
      `[requestfailed] ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`,
    );
  });

  return {
    snapshot: () => browserOutput.join("\n"),
    assertNoLeaks: () => {
      const snapshot = browserOutput.join("\n");
      for (const privateValue of privateValues) {
        expect(snapshot).not.toContain(privateValue);
      }
    },
  };
}

async function installSearchPrivacyCanaryFixture(page: Page) {
  const fixture = { keywords: [] as string[] };
  await page.route("http://127.0.0.1:5030/api/v1/search**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/v1/search" || route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const request = route.request().postDataJSON() as { keyword?: unknown };
    if (typeof request.keyword === "string") fixture.keywords.push(request.keyword);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshot_id: "snapshot-search-c17-privacy-v1",
        data_revision: "revision-search-c17-privacy-v1",
        exact_total: true,
        complete_scope: true,
        total_count: 1,
        count: 1,
        window_start: 0,
        previous_cursor: "",
        next_cursor: "",
        has_previous: false,
        has_next: false,
        messages: [
          {
            message_id: "search-c17-private-message",
            seq: 17,
            source_index: 0,
            conversation_id: "search-c17-private-conversation",
            conversation_name: SEARCH_PRIVACY_CANARIES.conversation,
            sender_id: "search-c17-private-sender",
            sender_name: SEARCH_PRIVACY_CANARIES.sender,
            timestamp: 1_767_254_400,
            type: 1,
            sub_type: 0,
            category: "text",
            match_field: "content",
            snippet: `${SEARCH_PRIVACY_CANARIES.content} ${SEARCH_PRIVACY_CANARIES.path}`,
            match_segments: [
              { text: SEARCH_PRIVACY_CANARIES.content, matched: true },
              { text: ` ${SEARCH_PRIVACY_CANARIES.path}`, matched: false },
            ],
          },
        ],
      }),
    });
  });
  return fixture;
}

async function installInlineGapSearchFixture(page: Page) {
  await page.route("http://127.0.0.1:5030/api/v1/search**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/v1/search" || route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const request = route.request().postDataJSON() as { cursor?: string };
    const totalCount = 1_050;
    const cursorMatch = request.cursor?.match(/^cursor-inline-gap-(\d+)$/u);
    const windowStart = cursorMatch ? Number(cursorMatch[1]) : 0;
    const count = Math.min(50, totalCount - windowStart);
    const messages = Array.from({ length: count }, (_, offset) => windowStart + offset).map((sourceIndex) => ({
      message_id: `inline-gap-message-${sourceIndex}`,
      seq: sourceIndex + 1,
      source_index: sourceIndex,
      conversation_id: "inline-gap-conversation",
      conversation_name: "Synthetic Inline Gap Conversation",
      sender_id: "inline-gap-sender",
      sender_name: "Synthetic Inline Gap Sender",
      timestamp: 1_767_254_400 + sourceIndex,
      type: 1,
      sub_type: 0,
      category: "text",
      match_field: "content",
      snippet: `Synthetic inline gap result ${sourceIndex}`,
      match_segments: [
        { text: "Synthetic inline gap", matched: true },
        { text: ` result ${sourceIndex}`, matched: false },
      ],
    }));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshot_id: "snapshot-inline-gap-v1",
        data_revision: "revision-inline-gap-v1",
        exact_total: true,
        complete_scope: true,
        total_count: totalCount,
        count,
        window_start: windowStart,
        previous_cursor: windowStart > 0 ? `cursor-inline-gap-${windowStart - 50}` : "",
        next_cursor: windowStart + count < totalCount
          ? `cursor-inline-gap-${windowStart + count}`
          : "",
        has_previous: windowStart > 0,
        has_next: windowStart + count < totalCount,
        messages,
      }),
    });
  });
}

async function installPagedAnchorSearchFixture(page: Page) {
  await page.route("http://127.0.0.1:5030/api/v1/search**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/v1/search" || route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const request = route.request().postDataJSON() as { cursor?: string };
    const windowStart = request.cursor === "cursor-page-anchor-50" ? 50 : 0;
    const messages = Array.from({ length: 50 }, (_, index) => {
      const sourceIndex = windowStart + index;
      const conversationVariant = sourceIndex % 2 === 0 ? "alpha" : "beta";
      return {
        message_id: `page-anchor-message-${sourceIndex}`,
        seq: 2_000 + sourceIndex,
        source_index: sourceIndex,
        conversation_id: `page-anchor-conversation-${conversationVariant}`,
        conversation_name: `Synthetic Page Anchor Conversation ${conversationVariant}`,
        sender_id: `page-anchor-sender-${conversationVariant}`,
        sender_name: `Synthetic Page Anchor Sender ${conversationVariant}`,
        timestamp: 1_767_254_400 + sourceIndex,
        type: 1,
        sub_type: 0,
        category: "text",
        match_field: "content",
        snippet: `Synthetic page anchor result ${sourceIndex}`,
        match_segments: [
          { text: "Synthetic page anchor", matched: true },
          { text: ` result ${sourceIndex}`, matched: false },
        ],
      };
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshot_id: "snapshot-page-anchor-v1",
        data_revision: "revision-page-anchor-v1",
        exact_total: true,
        complete_scope: true,
        total_count: 100,
        count: 50,
        window_start: windowStart,
        previous_cursor: windowStart === 50 ? "cursor-page-anchor-0" : "",
        next_cursor: windowStart === 0 ? "cursor-page-anchor-50" : "",
        has_previous: windowStart === 50,
        has_next: windowStart === 0,
        messages,
      }),
    });
  });
}

async function installInfiniteSearchFixture(
  page: Page,
  { failFirstContinuation = false }: { failFirstContinuation?: boolean } = {},
) {
  const fixture = { forwardAttempts: 0 };
  await page.route("http://127.0.0.1:5030/api/v1/search**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/v1/search" || route.request().method() !== "POST") {
      await route.fallback();
      return;
    }
    const request = route.request().postDataJSON() as { cursor?: string };
    const windowStart = request.cursor === "cursor-search-infinite-50"
      ? 50
      : request.cursor === "cursor-search-infinite-100"
        ? 100
        : 0;
    if (windowStart === 50) {
      fixture.forwardAttempts += 1;
      if (failFirstContinuation && fixture.forwardAttempts === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "synthetic continuation failure" }),
        });
        return;
      }
    }
    const messages = Array.from({ length: 50 }, (_, index) => {
      const sourceIndex = windowStart + index;
      return {
        message_id: `infinite-message-${sourceIndex}`,
        seq: 3_000 + sourceIndex,
        source_index: sourceIndex,
        conversation_id: "infinite-conversation",
        conversation_name: "Synthetic Infinite Conversation",
        sender_id: "infinite-sender",
        sender_name: "Synthetic Infinite Sender",
        timestamp: 1_767_254_400 + sourceIndex,
        type: 1,
        sub_type: 0,
        category: "text",
        match_field: "content",
        snippet: `Synthetic infinite result ${sourceIndex}`,
        match_segments: [
          { text: "Synthetic infinite", matched: true },
          { text: ` result ${sourceIndex}`, matched: false },
        ],
      };
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshot_id: "snapshot-search-infinite-v1",
        data_revision: "revision-search-infinite-v1",
        exact_total: true,
        complete_scope: true,
        total_count: 150,
        count: 50,
        window_start: windowStart,
        previous_cursor: windowStart > 0 ? `cursor-search-infinite-${windowStart - 50}` : "",
        next_cursor: windowStart < 100 ? `cursor-search-infinite-${windowStart + 50}` : "",
        has_previous: windowStart > 0,
        has_next: windowStart < 100,
        messages,
      }),
    });
  });
  return fixture;
}

async function switchToInfiniteBrowseMode(page: Page) {
  await page.getByRole("button", { name: "浏览方式：手动加载" }).click();
  await page.getByRole("menuitemradio", { name: /连续浏览/ }).click();
  await expect(page.getByRole("button", { name: "浏览方式：连续浏览" })).toBeVisible();
}

async function setDocumentVisibility(page: Page, state: DocumentVisibilityState) {
  await page.evaluate((nextState) => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: nextState,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}

async function userScrollSearchResultsToBottom(page: Page) {
  const surface = page.locator(".workspace-page__surface");
  await surface.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  const box = await surface.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.wheel(0, 800);
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

async function expectMinimumControlHeight(locators: Locator[]) {
  for (const locator of locators) {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(40);
  }
}

function searchSubmit(page: Page) {
  return page
    .getByRole("region", { name: "搜索工作区" })
    .getByRole("button", { name: /^(搜索|应用筛选)$/ });
}

function captureJsonRequests(page: Page, method: string, pathname: string) {
  const values: Array<Record<string, unknown>> = [];
  page.on("request", (request) => {
    if (!matchesRequest(request, method, pathname)) return;
    try {
      values.push(request.postDataJSON() as Record<string, unknown>);
    } catch {
      values.push({});
    }
  });
  return values;
}

function matchesRequest(request: Request, method: string, pathname: string) {
  const url = new URL(request.url());
  return request.method() === method && url.pathname === pathname;
}

async function expectSearchSurfaceDoesNotOverflow(page: Page) {
  await expect
    .poll(() =>
      page
        .locator(".search-workspace__surface")
        .evaluate((surface) => surface.scrollWidth <= surface.clientWidth + 1),
    )
    .toBe(true);
}

async function readSearchConditionGeometry({
  conditionBar,
  firstRow,
  dateRange,
}: {
  conditionBar: Locator;
  firstRow: Locator[];
  dateRange: Locator;
}) {
  const conditionBox = await conditionBar.boundingBox();
  const firstRowBoxes = await Promise.all(firstRow.map((locator) => locator.boundingBox()));
  const dateBox = await dateRange.boundingBox();
  expect(conditionBox).not.toBeNull();
  expect(firstRowBoxes.every(Boolean)).toBe(true);
  expect(dateBox).not.toBeNull();
  return {
    conditionHeight: conditionBox!.height,
    conditionBottom: conditionBox!.y + conditionBox!.height,
    firstRowTops: firstRowBoxes.map((box) => box!.y),
    firstRowBottoms: firstRowBoxes.map((box) => box!.y + box!.height),
    dateTop: dateBox!.y,
    dateBottom: dateBox!.y + dateBox!.height,
  };
}

async function readComputedFontSizes<T extends Record<string, Locator>>(targets: T) {
  const entries = await Promise.all(
    Object.entries(targets).map(
      async ([name, locator]) =>
        [
          name,
          await locator.evaluate((element) =>
            Number.parseFloat(getComputedStyle(element).fontSize),
          ),
        ] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<keyof T, number>;
}

async function readDateSegmentMetrics(segments: Locator) {
  return segments.evaluateAll((elements) =>
    elements.map((element) => {
      const style = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        style: style.borderBottomStyle,
        color: style.borderBottomColor,
      };
    }),
  );
}

async function readResolvedCustomColor(page: Page, customProperty: string) {
  return page.locator(".search-workspace").evaluate((element, property) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${property})`;
    element.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, customProperty);
}
