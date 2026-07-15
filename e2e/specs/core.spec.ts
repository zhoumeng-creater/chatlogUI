import { expect, type Page, test } from "@playwright/test";
import { startMockChatlogServer } from "../mock-chatlog-server/server.mjs";
import { assertNoForbiddenVisibleText } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  expectWindowControlsDoNotOverlapMainContent,
  expectWindowControlsVisible,
  expectWindowControlTargets,
} from "../utils/window-controls";
import {
  enablePrivacyMode,
  expectDeveloperEntryHidden,
  expectStableSyntheticPage,
  openSyntheticWorkbench,
} from "../utils/workbench";

test.describe("core synthetic routes", () => {
  const setupPathButton = (page: Page, name: RegExp) =>
    page.locator(".setup-choice-card").filter({ hasText: name });

  test("renders setup center with collapsed local diagnostics", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "连接本地聊天数据服务" })).toBeVisible();
    await expect(page.getByText("选择由应用管理本机聊天服务，或连接已有")).toBeVisible();
    await expect(setupPathButton(page, /推荐自动导入/)).toBeVisible();
    await expect(setupPathButton(page, /连接已有服务/)).toBeVisible();
    await expect(setupPathButton(page, /高级手动配置/)).toBeVisible();
    await expect(page.getByText(/隐私保护(待验证|已应用)/)).toBeVisible();
    await expect(page.getByText("默认只显示状态摘要；需要排查时再展开脱敏诊断。")).toBeVisible();
    await expect(page.getByRole("button", { name: "查看脱敏诊断" })).toBeVisible();
    await expect(page.getByText("Export manifest version")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "打开工作台" })).toHaveCount(0);
    await expectStableSyntheticPage(page);
  });

  test("keeps setup first-run layout stable at narrow width", async ({ page }) => {
    await setNarrow(page);
    await page.goto("/");

    await expect(setupPathButton(page, /推荐自动导入/)).toBeVisible();
    await expect(setupPathButton(page, /连接已有服务/)).toBeVisible();
    await expect(setupPathButton(page, /高级手动配置/)).toBeVisible();
    await expect(page.getByText("状态摘要", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "查看脱敏诊断" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开工作台" })).toHaveCount(0);
    const narrowOrder = await page.evaluate(() => {
      const top = (selector: string) => {
        const element = document.querySelector(selector);
        if (!element) return Number.POSITIVE_INFINITY;
        return element.getBoundingClientRect().top;
      };

      return {
        status: top(".setup-status-summary"),
        progress: top(".setup-stepper"),
        actionBarBottom: document.querySelector(".setup-action-panel__actions")?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
        action: top(".setup-flow__panel"),
        diagnostics: top(".setup-diagnostics-disclosure"),
        viewportHeight: window.innerHeight,
      };
    });
    expect(narrowOrder.progress).toBeLessThan(narrowOrder.action);
    expect(narrowOrder.action).toBeLessThan(narrowOrder.status);
    expect(narrowOrder.status).toBeLessThan(narrowOrder.diagnostics);
    expect(narrowOrder.actionBarBottom).toBeLessThan(narrowOrder.viewportHeight);
    await expectStableSyntheticPage(page);
  });

  test("connects an external non-default loopback service and exposes a single ready CTA", async ({ page }) => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    await installTauriSetupConfigMock(page);

    try {
      await setDesktop(page);
      await page.goto("/");
      await setupPathButton(page, /连接已有服务/).click();
      await page.getByRole("textbox", { name: /外部服务地址/ }).fill(server.baseUrl);
      await page.getByRole("button", { name: "测试连接并保存" }).click();

      await expect(page.getByRole("heading", { name: "服务已就绪" })).toBeVisible();
      await expect(page.getByRole("button", { name: "打开工作台" })).toHaveCount(1);
      await expect(page.getByText(`Backend base URL: ${server.baseUrl}`)).toHaveCount(0);
      await expectStableSyntheticPage(page);
    } finally {
      await server.close();
    }
  });

  test("keeps invalid external service URL as a field error without retrying blindly", async ({ page }) => {
    await installTauriSetupConfigMock(page);
    await setDesktop(page);
    await page.goto("/");
    await setupPathButton(page, /连接已有服务/).click();
    await page.getByRole("textbox", { name: /外部服务地址/ }).fill("http://example.com:5030");
    await page.getByRole("button", { name: "测试连接并保存" }).click();

    await expect(page.locator("#external-chatlog-base-url-error")).toContainText("当前版本只支持本机 chatlog 服务地址");
    await expect(page.getByRole("button", { name: "测试连接并保存" })).toBeDisabled();
    const remoteRequests = await page.evaluate(() =>
      performance.getEntriesByType("resource")
        .filter((entry) => String(entry.name).includes("example.com")).length,
    );
    expect(remoteRequests).toBe(0);
  });

  test("renders workbench ready shell at desktop width", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    await expect(page.getByLabel("一级工作区导航")).toBeVisible();
    await expect(page.getByRole("button", { name: "收起导航栏" })).toHaveAttribute("aria-expanded", "true");
    for (const label of ["会话", "搜索", "媒体", "朋友圈", "统计", "AI", "图谱"]) {
      await expect(page.getByRole("button", { name: `打开${label}` })).toBeVisible();
    }
    await expectDeveloperEntryHidden(page);
    await expect(page.locator(".workbench-frame__module-tabs")).toHaveCount(0);
    await expectStableSyntheticPage(page);
  });

  test("opens contextual shortcut help by button and keyboard shortcuts", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    const helpButton = page.getByRole("button", { name: "页面帮助" });
    await helpButton.focus();
    await helpButton.click();

    const workbenchDialog = page.getByRole("dialog", { name: "会话阅读帮助" });
    await expect(workbenchDialog).toBeVisible();
    await expect(workbenchDialog).toContainText("关闭浮层");
    await expect(workbenchDialog).toContainText("回到最新消息");

    await page.keyboard.press("Escape");
    await expect(workbenchDialog).toHaveCount(0);
    await expect(helpButton).toBeFocused();

    await page.keyboard.press("Shift+/");
    await expect(workbenchDialog).toBeVisible();
    await workbenchDialog.getByRole("button", { name: "关闭帮助" }).click();
    await expect(workbenchDialog).toHaveCount(0);

    await page.goto("/ai?codex-smoke=workbench-ready");
    await page.keyboard.press("Control+/");
    const aiDialog = page.getByRole("dialog", { name: "AI帮助" });
    await expect(aiDialog).toBeVisible();
    await expect(aiDialog).toContainText("聚焦问题输入");
    await expect(aiDialog).not.toContainText("Synthetic Session Alpha");
  });

  test("persists coach mark dismissal and keeps empty state actions valid", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/");
    await page.evaluate(() => {
      window.localStorage.removeItem("chatlog_alpha_workspace_preferences");
    });
    await page.goto("/search?codex-smoke=workbench-ready");

    const emptyState = page.getByRole("region", { name: "搜索尚未开始" });
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText("输入关键词并检查搜索条件");
    await expect(emptyState).toContainText("搜索只会在你明确提交后执行。");
    await expect(
      page
        .getByRole("region", { name: "搜索工作区" })
        .getByRole("button", { name: "搜索", exact: true }),
    ).toBeDisabled();

    const coachMark = page.locator('[data-coach-mark="search-scope"]');
    await expect(coachMark).toBeVisible();
    await coachMark.getByRole("button", { name: "知道了" }).click();
    await expect(coachMark).toHaveCount(0);

    await page.reload();
    await expect(page.locator('[data-coach-mark="search-scope"]')).toHaveCount(0);
  });

  test("persists rail collapse and supports desktop panel splitters", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    const rail = page.getByLabel("一级工作区导航");
    const expandedBox = await rail.boundingBox();
    expect(expandedBox?.width ?? 0).toBeGreaterThan(150);

    await page.getByRole("button", { name: "收起导航栏" }).click();
    await expect(page.getByRole("button", { name: "展开导航栏" })).toHaveAttribute("aria-expanded", "false");
    const collapsedBox = await rail.boundingBox();
    expect(collapsedBox?.width ?? 0).toBeLessThan(96);

    await page.reload();
    await expect(page.getByRole("button", { name: "展开导航栏" })).toBeVisible();
    const restoredBox = await rail.boundingBox();
    expect(restoredBox?.width ?? 0).toBeLessThan(96);

    const list = page.getByLabel("会话列表").first();
    const listWidthBefore = (await list.boundingBox())?.width ?? 0;
    const listSplitter = page.getByRole("separator", { name: "调整会话列表宽度" });
    await expect(listSplitter).toBeVisible();
    await expect(listSplitter).toHaveAttribute("aria-orientation", "vertical");
    await listSplitter.focus();
    await page.keyboard.press("ArrowRight");
    const listWidthAfter = (await list.boundingBox())?.width ?? 0;
    expect(listWidthAfter).toBeGreaterThan(listWidthBefore);

    await listSplitter.dblclick();
    const resetWidth = (await list.boundingBox())?.width ?? 0;
    expect(Math.abs(resetWidth - 320)).toBeLessThanOrEqual(4);
  });

  test("renders workbench ready shell at narrow width", async ({ page }) => {
    await setNarrow(page);
    await openSyntheticWorkbench(page);

    await expect(page.getByLabel("一级工作区导航")).toBeVisible();
    await expect(page.getByLabel("会话列表")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("dashboard alias reaches the same synthetic workbench shell", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/dashboard?codex-smoke=workbench-ready");

    await expect(page.getByLabel("一级工作区导航")).toBeVisible();
    await expect(page.getByRole("button", { name: "打开会话" })).toBeVisible();
    await assertNoForbiddenVisibleText(page);
  });

  test("renders primary workspace routes as independent surfaces", async ({ page }) => {
    await setDesktop(page);

    const routes = [
      { path: "/search", nav: "搜索", label: "搜索工作区" },
      { path: "/media", nav: "媒体", text: "当前阶段聚焦当前会话媒体" },
      { path: "/sns", nav: "朋友圈", text: "外部文章会先确认域名" },
      { path: "/analytics", nav: "统计", text: "选择会话后查看统计" },
      { path: "/ai", nav: "AI", text: "语义索引、问答、语义搜索和证据" },
      { path: "/graph", nav: "图谱", text: "图谱画布、摘要、节点详情和问答" },
    ];

    for (const route of routes) {
      await page.goto(`${route.path}?codex-smoke=workbench-ready`);
      await expect(page.getByLabel("一级工作区导航")).toBeVisible();
      await expect(page.getByRole("button", { name: `打开${route.nav}` })).toHaveAttribute("aria-current", "page");
      if (route.label) {
        await expect(page.getByLabel(route.label)).toBeVisible();
      }
      if (route.text) {
        await expect(page.getByText(route.text)).toBeVisible();
      }
      await expectDeveloperEntryHidden(page);
      await expectStableSyntheticPage(page);
    }
  });

  test("media operation loop filters previews copies cancels open locates and exports manifest", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/media?scope=currentChat&chat=session_synthetic_001&codex-smoke=workbench-ready");

    const media = page.getByRole("complementary", { name: "媒体与扩展" });
    await expect(media).toBeVisible();
    await expect(page.getByRole("region", { name: "媒体筛选" })).toBeVisible();
    await expect(media.getByText("图片 4")).toBeVisible();
    await expect(media.getByText("视频 1")).toBeVisible();
    await expect(media.getByText("语音 1")).toBeVisible();
    await expect(media.getByText("文件 1")).toBeVisible();

    await page.getByRole("button", { name: "媒体状态", exact: true }).click();
    await page
      .getByRole("listbox", { name: "媒体状态" })
      .getByRole("option", { name: "资源缺失" })
      .click();
    await expect(media.locator(".media-library__row--attachment").filter({ hasText: "资源缺失" })).toBeVisible();
    await page.getByRole("button", { name: "媒体状态", exact: true }).click();
    await page
      .getByRole("listbox", { name: "媒体状态" })
      .getByRole("option", { name: "全部状态" })
      .click();

    await page.getByRole("button", { name: "媒体类型", exact: true }).click();
    await page
      .getByRole("listbox", { name: "媒体类型" })
      .getByRole("option", { name: "视频" })
      .click();
    const videoRow = media.locator(".media-library__row--attachment").filter({ hasText: "视频" });
    await expect(videoRow).toBeVisible();
    await videoRow.getByRole("button", { name: "预览媒体" }).click();
    await expect(page.getByRole("dialog", { name: /视频/ })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: /视频/ })).toHaveCount(0);

    await page.getByRole("button", { name: "媒体类型", exact: true }).click();
    await page
      .getByRole("listbox", { name: "媒体类型" })
      .getByRole("option", { name: "图片" })
      .click();
    const imageRow = media.locator(".media-library__row--attachment").filter({ hasText: "图片" }).first();
    await expect(imageRow).toBeVisible();
    const copySummaryButton = imageRow.getByRole("button", { name: "复制媒体摘要" });
    await copySummaryButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("已复制媒体摘要。")).toBeVisible();

    const openOriginalButton = imageRow.getByRole("button", { name: "打开原始资源" });
    await openOriginalButton.focus();
    await page.keyboard.press("Enter");
    const prompt = page.getByRole("dialog", { name: "打开原始资源" });
    await expect(prompt).toBeVisible();
    await expect(prompt).toContainText("本机媒体资源");
    await expect(prompt).not.toContainText("media_synthetic_image_key");
    await expect(prompt.getByRole("button", { name: "取消" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(prompt).toHaveCount(0);

    await page.getByRole("button", { name: "导出" }).click();
    const exportDialog = page.getByRole("dialog", { name: "导出媒体清单" });
    await expect(exportDialog).toBeVisible();
    await expect(exportDialog).toContainText("当前只导出已加载媒体记录");
    await expect(exportDialog).toContainText("当前导出筛选后可见媒体记录");
    await expect(exportDialog).toContainText("CSV");
    await expect(exportDialog).not.toContainText("media_synthetic_image_key");
    await exportDialog.getByRole("button", { name: "关闭" }).click();

    const locateSourceButton = imageRow.getByRole("button", { name: "定位来源消息" });
    await locateSourceButton.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("来自媒体库")).toBeVisible();
    await expect(page.getByRole("button", { name: "返回媒体库" })).toBeVisible();
  });

  test("keeps loaded media usable when an extension endpoint is partial", async ({ page }) => {
    await setDesktop(page);
    await page.route("**/api/v1/favorites**", async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "synthetic favorites unavailable",
        }),
      });
    });

    await page.goto("/media?scope=currentChat&chat=session_synthetic_001&codex-smoke=workbench-ready");

    const media = page.getByRole("complementary", { name: "媒体与扩展" });
    await expect(page.getByText("部分媒体扩展加载失败")).toBeVisible();
    await expect(page.getByText(/收藏加载失败/)).toBeVisible();
    await expect(media.getByText("图片 3")).toBeVisible();
    await expect(media.getByRole("button", { name: "预览媒体" }).first()).toBeEnabled();
  });

  test("loads analytics controls, comparison, explanations, and export metadata", async ({ page }) => {
    await setDesktop(page);
    const statsRequests: string[] = [];
    const trendRequests: string[] = [];

    await page.route("**/api/v1/stats**", async (route) => {
      statsRequests.push(route.request().url());
      await route.continue();
    });
    await page.route("**/api/v1/dashboard/trend**", async (route) => {
      trendRequests.push(route.request().url());
      await route.continue();
    });

    await page.goto("/analytics?scope=currentChat&chat=session_synthetic_001&source=search&focus=1001&codex-smoke=workbench-ready");

    const scopeController = page.getByRole("region", { name: "统计范围", exact: true });
    await expect(scopeController).toBeVisible();
    await expect(scopeController.locator('[data-scope-field="scopeKind"]')).toContainText("范围：当前会话：Synthetic Session Alpha");
    await expect(scopeController.locator('[data-scope-field="dateRange"]')).toContainText("时间：近 7 天");
    await expect(page.getByRole("region", { name: "统计控制" })).toBeVisible();
    await expect(page.getByText("当前导出范围：近 7 天 · 按日 · 全部成员")).toBeVisible();
    await expect(page.getByText("消息总数").first()).toBeVisible();
    await expect(page.getByText("指标说明")).toBeVisible();
    await expect(page.getByText("统计值来自当前范围")).toBeVisible();

    await page.getByRole("button", { name: "近 30 天" }).click();
    await expect(page.getByText("当前导出范围：近 30 天 · 按日 · 全部成员")).toBeVisible();
    await expect.poll(() => statsRequests.some((url) => new URL(url).searchParams.get("time") === "last-30d")).toBe(true);
    await expect.poll(() => trendRequests.some((url) => new URL(url).searchParams.get("window") === "30d")).toBe(true);

    await page.getByRole("button", { name: "与上一周期比较" }).click();
    await expect(page.locator(".metric-explanation__comparison").getByText("上一周期比较", { exact: true })).toBeVisible();
    await expect.poll(() => statsRequests.some((url) => {
      const params = new URL(url).searchParams;
      return params.has("since") && params.has("until");
    })).toBe(true);

    await page.getByRole("button", { name: "导出" }).click();
    await expect(page.getByRole("dialog", { name: "导出统计" })).toBeVisible();
    await expect(page.getByText("范围").first()).toBeVisible();
    await expect(page.getByText("CSV", { exact: true })).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("renders the search condition bar at desktop and narrow widths", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/search?codex-smoke=workbench-ready");

    const conditions = page.getByRole("region", { name: "搜索条件", exact: true });
    const scopeTrigger = conditions.getByRole("button", { name: "全部会话", exact: true });
    await expect(conditions).toBeVisible();
    await expect(scopeTrigger).toBeVisible();
    await expect(conditions.getByRole("button", { name: "全部消息类型" })).toBeVisible();
    await expect(conditions.getByRole("button", { name: "打开日期范围选择器" })).toBeVisible();

    await scopeTrigger.click();
    await expect(conditions.getByRole("menu", { name: "搜索范围" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(conditions.getByRole("menu", { name: "搜索范围" })).toHaveCount(0);
    await expect(scopeTrigger).toBeFocused();

    await setNarrow(page);
    await expect(conditions).toBeVisible();
    await expect(scopeTrigger).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("opens a search result at its chat hit and returns to the result list", async ({ page }) => {
    await setDesktop(page);
    await expectSearchClosedLoop(page);

    await setNarrow(page);
    await expectSearchClosedLoop(page);
  });

  test("promotes current conversation actions through CommandBar overflow and keeps inspector concise", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    await page.getByRole("button", { name: /Synthetic Session Alpha/ }).first().click();

    await expect(page.getByRole("button", { name: "搜索此会话" })).toBeVisible();
    await expect(page.getByRole("button", { name: "更多当前会话操作" })).toBeVisible();
    await page.getByRole("button", { name: "更多当前会话操作" }).click();
    await expect(page.getByRole("menuitem", { name: "导出当前会话" })).toBeEnabled();
    const jumpDate = page.getByRole("menuitem", { name: "跳转日期" });
    await expect(jumpDate).toBeEnabled();
    await jumpDate.click();
    const jumpDateDialog = page.getByRole("dialog", { name: "跳转到日期" });
    await expect(jumpDateDialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(jumpDateDialog).toHaveCount(0);

    const inspector = page.locator(".conversation-inspector");
    await expect(inspector).toContainText("建议下一步");
    await expect(inspector).toContainText("查看完整统计");
    await expect(inspector).not.toContainText("搜索此会话");
    await expect(inspector).not.toContainText("打开媒体库");
    await expect(inspector).not.toContainText("问这个会话");
    await expect(inspector).not.toContainText("在图谱中查看");
  });

  test("keeps scoped current-chat search constrained before conversations finish loading", async ({ page }) => {
    await setDesktop(page);
    const searchRequests: Array<Record<string, unknown>> = [];
    const sessionsResponse = page.waitForResponse("**/api/v1/sessions**");

    await page.route("**/api/v1/sessions**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await route.continue();
    });
    await page.route("**/api/v1/search**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() === "POST" && url.pathname === "/api/v1/search") {
        searchRequests.push(request.postDataJSON() as Record<string, unknown>);
      }
      await route.continue();
    });

    await page.goto("/search?scope=currentChat&chat=session_synthetic_001&codex-smoke=workbench-ready");
    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("Synthetic");
    await input.press("Enter");

    await expect.poll(() => searchRequests.length).toBe(1);
    expect(searchRequests[0]).toMatchObject({
      keyword: "Synthetic",
      chats: ["session_synthetic_001"],
    });
    await sessionsResponse;
  });

  test("opens a search result with keyboard activation", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/search?codex-smoke=workbench-ready");

    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("Synthetic");
    await input.press("Enter");

    const result = page
      .locator(".search-result-row")
      .filter({ hasText: "Synthetic project kickoff notes" });
    await expect(result).toBeVisible();
    await result.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("已定位搜索命中")).toBeVisible();
  });

  test("blocks duplicate pending submission and keeps a cancelled late response stale", async ({
    page,
  }) => {
    await setDesktop(page);
    const searchKeywords: string[] = [];
    await page.route("**/api/v1/search**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() !== "POST" || url.pathname !== "/api/v1/search") {
        await route.continue();
        return;
      }
      const body = request.postDataJSON() as Record<string, unknown>;
      const keyword = typeof body.keyword === "string" ? body.keyword : "";
      searchKeywords.push(keyword);
      if (keyword.includes("old")) {
        await page.waitForTimeout(900);
        await route.fulfill({
          json: strictSearchResponse([
            strictSearchMessage({ seq: 3001, snippet: "Synthetic old stale result" }),
          ]),
        }).catch(() => undefined);
        return;
      }
      await route.fulfill({
        json: strictSearchResponse([
          strictSearchMessage({ seq: 3002, snippet: "Synthetic latest result" }),
        ]),
      });
    });

    await page.goto("/search?codex-smoke=workbench-ready");
    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("old");
    await input.press("Enter");
    await expect.poll(() => searchKeywords).toEqual(["old"]);
    await expect(page.getByRole("region", { name: "正在搜索" })).toBeVisible();

    await input.fill("latest");
    await input.press("Enter");
    await page.waitForTimeout(250);
    expect(searchKeywords).toEqual(["old"]);

    await page.getByRole("button", { name: "取消搜索" }).click();
    await expect(page.getByRole("region", { name: "搜索已取消" })).toBeVisible();
    await input.press("Enter");
    await expect.poll(() => searchKeywords).toEqual(["old", "latest"]);

    await expect(page.getByText("Synthetic latest result")).toBeVisible();
    await page.waitForTimeout(1_000);
    await expect(page.getByText("Synthetic old stale result")).toHaveCount(0);
  });

  test("does not append a stale load-more page after changing filters", async ({ page }) => {
    await setDesktop(page);
    await page.route("**/api/v1/search**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.method() !== "POST" || url.pathname !== "/api/v1/search") {
        await route.continue();
        return;
      }
      const body = request.postDataJSON() as Record<string, unknown>;
      if (Array.isArray(body.categories) && body.categories.includes("image_emoji")) {
        await route.fulfill({
          json: strictSearchResponse([
            strictSearchMessage({
              seq: 4101,
              snippet: "Synthetic image filtered result",
              category: "image_emoji",
              type: 3,
            }),
          ]),
        });
        return;
      }
      if (body.cursor === "cursor-core-forward") {
        await page.waitForTimeout(900);
        await route.fulfill({
          json: strictSearchResponse(
            [strictSearchMessage({ seq: 4020, snippet: "Synthetic stale page result" })],
            {
              totalCount: 2,
              windowStart: 1,
              hasPrevious: true,
              previousCursor: "cursor-core-backward",
            },
          ),
        }).catch(() => undefined);
        return;
      }
      await route.fulfill({
        json: strictSearchResponse(
          [strictSearchMessage({ seq: 4000, snippet: "Synthetic first page result" })],
          {
            totalCount: 2,
            hasNext: true,
            nextCursor: "cursor-core-forward",
          },
        ),
      });
    });

    await page.goto("/search?codex-smoke=workbench-ready");
    const scopeCoach = page.locator('[data-coach-mark="search-scope"]');
    await expect(scopeCoach).toBeVisible();
    await scopeCoach.getByRole("button", { name: "知道了" }).click();
    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("Synthetic paged");
    await input.press("Enter");
    await expect(page.getByText("Synthetic first page result", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "加载剩余 1 条" }).click();
    await page.getByRole("button", { name: "全部消息类型" }).click();
    const categoryMenu = page.getByRole("menu", { name: "消息类型" });
    await categoryMenu.getByRole("menuitemcheckbox", { name: "图片与表情" }).click();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "应用筛选", exact: true }).click();

    await expect(page.getByText("Synthetic image filtered result", { exact: true })).toBeVisible();
    await page.waitForTimeout(1_000);
    await expect(page.getByText("Synthetic stale page result")).toHaveCount(0);
  });

  test("shows a recoverable message when the search anchor is missing from history", async ({ page }) => {
    await setDesktop(page);
    await page.route("**/api/v1/history/context/query", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ code: "history_context_message_not_found" }),
      });
    });

    await page.goto("/search?codex-smoke=workbench-ready");
    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("Synthetic");
    await input.press("Enter");
    const result = page
      .locator(".search-result-row")
      .filter({ hasText: "Synthetic project kickoff notes" });
    await result.click();

    await expect(page).toHaveURL(/\/search/);
    const navigationError = page.getByRole("alert").filter({
      hasText: "原消息已不存在；可选择打开其时间附近的记录。",
    });
    await expect(navigationError).toBeVisible();
    await expect(navigationError.getByRole("button", { name: "按附近时间打开" })).toBeVisible();
  });

  test("keeps privacy-on search snippets and hit context masked", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/search?codex-smoke=workbench-ready");
    await enablePrivacyMode(page);

    const input = page.getByLabel("搜索聊天记录", { exact: true });
    await input.fill("Synthetic");
    await input.press("Enter");

    await expect(page.getByText("Synthetic project kickoff notes")).toHaveCount(0);
    const result = page.locator(".search-result-row").first();
    await expect(result).toContainText(/[•*]{3,}/);
    await result.click();

    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("Synthetic project kickoff notes")).toHaveCount(0);
    await expect(page.locator(".message-row--search-hit")).toBeVisible();
    await assertNoForbiddenVisibleText(page);
  });

  test("settings route renders without synthetic privacy leakage", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/settings");

    await expect(page.getByText("设置", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "数据与服务" })).toBeVisible();
    await expect(page.getByText("127.0.0.1:5030")).toHaveCount(0);
    await page.getByRole("button", { name: "关于与更新" }).click();
    await expect(page.getByRole("heading", { name: "关于" })).toBeVisible();
    await expect(page.getByRole("button", { name: "检查更新" })).toBeVisible();
    await expect(page.getByText("脱敏诊断").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "查看脱敏诊断" })).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Export manifest version")).toHaveCount(0);
    await page.getByRole("button", { name: "检查更新" }).click();
    await expect(page.getByText("已是最新版本")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("settings semantic deep link opens the AI summary without endpoint forms", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/settings?source=ai&section=semantic");

    await expect(page.getByRole("heading", { name: "AI 与语义" })).toBeVisible();
    await expect(page.getByText("检查中")).toHaveCount(0, { timeout: 5_000 });
    await expect(page.getByRole("button", { name: "前往 AI 工作台配置" })).toBeVisible();
    await expect(page.locator("#settings-ai-endpoint")).toHaveCount(0);
    await expect(page.getByText("127.0.0.1:5030")).toHaveCount(0);
    await assertNoForbiddenVisibleText(page);
  });
});

async function expectSearchClosedLoop(page: import("@playwright/test").Page) {
  await page.goto("/search?codex-smoke=workbench-ready");

  const input = page.getByLabel("搜索聊天记录", { exact: true });
  await input.fill("Synthetic");
  await input.press("Enter");

  const result = page
    .locator(".search-result-row")
    .filter({ hasText: "Synthetic project kickoff notes" });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/workbench/);
  await expect(page.getByText("来自搜索结果")).toBeVisible();
  await expect(page.getByText("已定位搜索命中")).toBeVisible();
  await expect(
    page.locator("[data-message-id='history-context:1101'] .message-row--search-hit"),
  ).toBeVisible();

  await page.getByRole("button", { name: "返回搜索结果" }).click();
  await expect(page).toHaveURL(/\/search/);
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("aria-current", "true");
  await expectStableSyntheticPage(page);
}

function strictSearchResponse(
  messages: ReturnType<typeof strictSearchMessage>[],
  options: {
    totalCount?: number;
    windowStart?: number;
    hasPrevious?: boolean;
    previousCursor?: string;
    hasNext?: boolean;
    nextCursor?: string;
  } = {},
) {
  const windowStart = options.windowStart ?? 0;
  return {
    snapshot_id: "snapshot-core-search-v2",
    data_revision: "revision-core-search-v2",
    exact_total: true,
    complete_scope: true,
    total_count: options.totalCount ?? messages.length,
    count: messages.length,
    window_start: windowStart,
    previous_cursor: options.previousCursor ?? "",
    next_cursor: options.nextCursor ?? "",
    has_previous: options.hasPrevious ?? false,
    has_next: options.hasNext ?? false,
    messages: messages.map((message, index) => ({
      ...message,
      source_index: windowStart + index,
    })),
  };
}

function strictSearchMessage(
  overrides: {
    seq?: number;
    snippet?: string;
    category?: "text" | "image_emoji";
    type?: number;
  } = {},
) {
  const seq = overrides.seq ?? 1001;
  const snippet = overrides.snippet ?? "Synthetic core search result";
  return {
    message_id: `core-search-message-${seq}`,
    seq,
    source_index: 0,
    conversation_id: "session_synthetic_001",
    conversation_name: "Synthetic Session Alpha",
    sender_id: "contact_synthetic_001",
    sender_name: "Synthetic Contact Alpha",
    timestamp: 1767254400 + seq,
    type: overrides.type ?? 1,
    sub_type: 0,
    category: overrides.category ?? "text",
    match_field: "content",
    snippet,
    match_segments: [
      { text: "Synthetic", matched: true },
      { text: snippet.slice("Synthetic".length), matched: false },
    ],
  };
}

async function installTauriSetupConfigMock(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const callbacks = new Map<number, (...args: unknown[]) => void>();
    let callbackId = 1;
    const saved = { current: null as Record<string, unknown> | null };

    window.__TAURI_INTERNALS__ = {
      transformCallback: (callback: (...args: unknown[]) => void) => {
        const id = callbackId;
        callbackId += 1;
        callbacks.set(id, callback);
        return id;
      },
      unregisterCallback: (id: number) => {
        callbacks.delete(id);
      },
      convertFileSrc: (filePath: string) => filePath,
      invoke: async (cmd: string, args?: Record<string, unknown>) => {
        if (cmd === "load_external_connection_config_summary") return saved.current;
        if (cmd === "load_managed_server_config_summary") return null;
        if (cmd === "save_external_connection_config") {
          const config = args?.config as { http_addr: string; port: number; last_validated_at?: string | null };
          saved.current = {
            mode: "external",
            source: "external-service",
            configDir: null,
            dataDir: null,
            workDir: null,
            httpAddr: config.http_addr,
            port: config.port,
            platform: null,
            version: null,
            fullVersion: null,
            hasDataKey: false,
            hasImgKey: false,
            lastValidatedAt: config.last_validated_at ?? null,
          };
          return saved.current;
        }
        if (cmd === "clear_external_connection_config") {
          saved.current = null;
          return null;
        }
        if (cmd === "inspect_port") {
          return { state: "external-chatlog", port: args?.port, pid: null, command: "synthetic chatlog" };
        }
        return null;
      },
    };
  });
}

test.describe("desktop shell controls", () => {
  test("setup route exposes visible window controls at desktop and narrow widths", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/");
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page);
    await expectWindowControlsDoNotOverlapMainContent(page);
    await expectStableSyntheticPage(page);

    await setNarrow(page);
    await page.goto("/");
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page, true);
    await expectStableSyntheticPage(page);
  });

  test("workbench shell exposes window controls without overlapping app content", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page);
    await expectWindowControlsDoNotOverlapMainContent(page);
    await expectStableSyntheticPage(page);

    await setNarrow(page);
    await openSyntheticWorkbench(page);
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page, true);
    await expectStableSyntheticPage(page);
  });

  test("dashboard alias and settings route use the same window-control shell", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/dashboard?codex-smoke=workbench-ready");
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page);
    await expectStableSyntheticPage(page);

    await page.goto("/settings");
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page);
    await expectWindowControlsDoNotOverlapMainContent(page);
    await expectStableSyntheticPage(page);

    await setNarrow(page);
    await page.goto("/settings");
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page, true);
    await expectStableSyntheticPage(page);
  });
});
