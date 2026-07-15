import { expect, test, type Page, type Route } from "@playwright/test";
import {
  COMPACT_VIEWPORT,
  hasPageHorizontalOverflow,
  setDesktop,
  setNarrow,
  setRootTextScale,
  setZoomEquivalent400,
} from "../utils/viewport";
import { expectGraphCanvasReady } from "../utils/graph";
import {
  enablePrivacyMode,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";
import { assertNoForbiddenVisibleText } from "../utils/privacy-scan";
import {
  expectWindowControlTargets,
  expectWindowControlsVisible,
} from "../utils/window-controls";

const SEARCH_VISUAL_PATH = "/search?codex-smoke=workbench-ready";
const SEARCH_API_PATTERN = "http://127.0.0.1:5030/api/v1/search**";

async function installTask14VisualLongContentFixture(page: Page) {
  await page.locator("#app-main").evaluate((main) => {
    main.querySelector(".task14-long-content-fixture")?.remove();

    const section = document.createElement("section");
    section.className = "task14-long-content-fixture search-condition-bar";
    section.setAttribute("role", "region");
    section.setAttribute("aria-label", "Task 14 长内容响应式样例");
    section.setAttribute("data-text-scale-fixture", "true");
    section.innerHTML = `
      <div class="search-condition-bar__primary" aria-label="长内容搜索条件样例">
        <button type="button" class="search-condition-bar__trigger">
          群聊：超长中文群聊名称用于视觉验证紧凑响应式不会溢出
        </button>
        <button type="button" class="search-condition-bar__trigger">
          https://example.invalid/task-14/responsive/visual-long-url/emoji-😀/code-snippet-const-value-equals-chatlogUI
        </button>
      </div>
      <div class="search-condition-bar__status">
        <p class="search-result-row__content">
          emoji 😀 · code-snippet const visualValue = "超长中文消息与 URL 混排"; · https://example.invalid/task-14/responsive/visual-copy
        </p>
        <button type="button" class="ui-button ui-button--secondary ui-button--md">
          检查焦点
        </button>
      </div>
    `;

    main.prepend(section);
  });
}

async function suppressCoachMarksForVisuals(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("chatlog_alpha_workspace_preferences", JSON.stringify({
      coachMarksPausedUntil: 4_102_444_800_000,
    }));
  });
}

async function installSearchFirstErrorVisualFixture(page: Page) {
  await page.route(SEARCH_API_PATTERN, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== "/api/v1/search" || request.method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = request.postDataJSON() as { keyword?: string };
    if (body.keyword !== "Synthetic first failure") {
      await route.fallback();
      return;
    }
    await route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "synthetic_visual_service_unavailable" }),
    });
  });
}

async function installSearchLoadingVisualFixture(page: Page) {
  let captureRoute!: (route: Route) => void;
  const pendingRoute = new Promise<Route>((resolve) => {
    captureRoute = resolve;
  });
  const handler = async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== "/api/v1/search" || request.method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = request.postDataJSON() as { keyword?: string };
    if (body.keyword !== "Synthetic loading visual") {
      await route.fallback();
      return;
    }
    captureRoute(route);
  };
  await page.route(SEARCH_API_PATTERN, handler);
  return {
    pendingRoute,
    dispose: () => page.unroute(SEARCH_API_PATTERN, handler),
  };
}

async function installSearchLongContentVisualFixture(page: Page) {
  await page.route(SEARCH_API_PATTERN, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname !== "/api/v1/search" || request.method() !== "POST") {
      await route.fallback();
      return;
    }
    const body = request.postDataJSON() as { keyword?: string };
    if (body.keyword !== "Synthetic long visual") {
      await route.fallback();
      return;
    }
    const matched = "Synthetic long visual";
    const remainder =
      " · 超长中文会话中的中英文混排消息，用于验证真实搜索结果在连续长文本、emoji 😀、文件名 quarterly-plan-final-v27.pdf 与 https://example.invalid/search/long/content/path 下仍能自然换行且不产生横向溢出。";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        snapshot_id: "snapshot-search-long-visual-v1",
        data_revision: "revision-search-long-visual-v1",
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
            message_id: "search-long-visual-message-1",
            seq: 1,
            source_index: 0,
            conversation_id: "search-long-visual-conversation",
            conversation_name:
              "Synthetic 超长会话名称 · 产品设计与跨地区协作讨论组 · 2026 第三季度",
            sender_id: "search-long-visual-sender",
            sender_name: "Synthetic 超长发送者名称 · International Collaboration Owner",
            timestamp: 1_767_254_400,
            type: 1,
            sub_type: 0,
            category: "text",
            match_field: "content",
            snippet: `${matched}${remainder}`,
            match_segments: [
              { text: matched, matched: true },
              { text: remainder, matched: false },
            ],
          },
        ],
      }),
    });
  });
}

async function captureSearchVisual(
  page: Page,
  snapshotName: string,
  options: { fullPage?: boolean } = {},
) {
  await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
  await expect
    .poll(() =>
      page.locator(".search-workspace__surface").evaluate((surface) =>
        surface.scrollWidth <= surface.clientWidth + 1,
      ),
    )
    .toBe(true);
  const viewportHeight = page.viewportSize()?.height ?? 900;
  await page.mouse.move(24, Math.max(24, viewportHeight - 20));
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot(snapshotName, { fullPage: options.fullPage ?? true });
}

async function expectSearchTextScaleLayout(page: Page) {
  const primary = page.locator(".search-condition-bar__primary");
  const conditionBar = page.locator(".search-condition-bar");
  const browseToolbar = page.locator(".search-browse-toolbar");
  const items = page.locator(
    ".search-condition-bar__primary > .search-condition-bar__control, " +
      ".search-condition-bar__primary > .search-date-range",
  );
  await expect(items).toHaveCount(4);
  const boxes = await items.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        label: element.textContent?.trim().replace(/\s+/g, " ") ?? "",
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    }),
  );
  const primaryBox = await primary.boundingBox();
  const conditionBox = await conditionBar.boundingBox();
  const toolbarBox = await browseToolbar.boundingBox();
  expect(primaryBox).not.toBeNull();
  expect(conditionBox).not.toBeNull();
  expect(toolbarBox).not.toBeNull();
  expect(boxes.every((box) => box.width > 0 && box.height > 0)).toBe(true);
  const overlaps = boxes.flatMap((current, index) =>
    boxes.slice(index + 1).flatMap((candidate) => {
      const intersects =
        Math.min(current.right, candidate.right) - Math.max(current.left, candidate.left) > 1 &&
        Math.min(current.bottom, candidate.bottom) - Math.max(current.top, candidate.top) > 1;
      return intersects ? [`${current.label} <> ${candidate.label}`] : [];
    }),
  );
  expect(overlaps).toEqual([]);
  if (primaryBox && conditionBox && toolbarBox) {
    const escapedItems = boxes.filter(
      (box) =>
        box.left < primaryBox.x - 1 ||
        box.right > primaryBox.x + primaryBox.width + 1 ||
        box.top < primaryBox.y - 1 ||
        box.bottom > primaryBox.y + primaryBox.height + 1,
    );
    expect(escapedItems).toEqual([]);
    expect(conditionBox.y + conditionBox.height).toBeGreaterThanOrEqual(
      Math.max(...boxes.map((box) => box.bottom)) - 1,
    );
    expect(toolbarBox.y).toBeGreaterThanOrEqual(conditionBox.y + conditionBox.height - 1);
  }

  const dateFieldBoxes = await page.locator(".search-date-range__field").evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    }),
  );
  expect(dateFieldBoxes).toHaveLength(2);
  expect(
    Math.min(dateFieldBoxes[0].right, dateFieldBoxes[1].right) -
      Math.max(dateFieldBoxes[0].left, dateFieldBoxes[1].left) >
      1 &&
      Math.min(dateFieldBoxes[0].bottom, dateFieldBoxes[1].bottom) -
        Math.max(dateFieldBoxes[0].top, dateFieldBoxes[1].top) >
        1,
  ).toBe(false);

  await expect(page.getByRole("button", { name: "全部消息类型" })).toBeVisible();
  await expect(page.getByRole("button", { name: "更多筛选" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "开始日期" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "结束日期" })).toBeVisible();
}

async function expectReactSearchWorkspaceReady(page: Page) {
  await expect(page.getByRole("region", { name: "搜索工作区" })).toBeVisible();
  const conditionBar = page.locator(".search-condition-bar");
  await expect(conditionBar).toBeVisible();
  await expect(page.getByRole("button", { name: "更多筛选" })).toBeVisible();
  await page.waitForTimeout(300);
  await expect(conditionBar).toBeVisible();
}

async function expectCompactTitlebarFits(page: Page) {
  const titlebarBox = await page.locator(".app-titlebar").boundingBox();
  const productBox = await page.getByRole("img", { name: "chatlogUI" }).boundingBox();
  const actionBox = await page.locator(".app-titlebar__actions").boundingBox();
  const controlsBox = await page.locator(".app-titlebar__window-controls").boundingBox();

  expect(titlebarBox).not.toBeNull();
  expect(productBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(controlsBox).not.toBeNull();
  if (!titlebarBox || !productBox || !actionBox || !controlsBox) return;

  expect(productBox.x).toBeGreaterThanOrEqual(titlebarBox.x - 1);
  expect(productBox.x + productBox.width).toBeLessThanOrEqual(actionBox.x + 1);
  expect(actionBox.x + actionBox.width).toBeLessThanOrEqual(controlsBox.x + 1);
  expect(controlsBox.x + controlsBox.width).toBeLessThanOrEqual(
    titlebarBox.x + titlebarBox.width + 1,
  );
}

test.describe("visual regression synthetic states", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await suppressCoachMarksForVisuals(page);
  });

  test("captures desktop workbench and advanced module states", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await expect(page).toHaveScreenshot("workbench-ready-desktop.png", {
      fullPage: true,
    });

    await openWorkbenchModule(page, "AI");
    await expect(page.getByRole("region", { name: "AI 主任务" })).toBeVisible();
    await expect(page).toHaveScreenshot("semantic-index-center-desktop.png", {
      fullPage: true,
    });
    await page.getByRole("button", { name: "AI 设置" }).click();
    await expect(page.getByText("语义设置")).toBeVisible();
    await expect(page).toHaveScreenshot("semantic-setup-desktop.png", {
      fullPage: true,
    });
    await page.getByRole("button", { name: "关闭", exact: true }).click();
    await page.locator(".qa-input__textarea").fill("synthetic completed qa visual");
    await page.getByRole("button", { name: /发送/ }).click();
    await expect(page.getByText("Synthetic answer with evidence")).toBeVisible();
    await page.getByRole("button", { name: "证据" }).click();
    await expect(page.getByRole("dialog", { name: "问答证据" })).toBeVisible();
    await expect(page).toHaveScreenshot("semantic-qa-evidence-desktop.png", {
      fullPage: true,
    });

    await openWorkbenchModule(page, "图谱");
    await expect(page.getByLabel("知识图谱模块")).toBeVisible();
    await expect(page).toHaveScreenshot("graph-workbench-desktop.png", {
      fullPage: true,
    });
    await page.getByRole("tab", { name: "可视化" }).click();
    await page.getByRole("button", { name: "打开可视化" }).click();
    await expectGraphCanvasReady(page);
    await expect(page).toHaveScreenshot("graph-visualization-desktop.png", {
      fullPage: true,
    });
  });

  test("captures React search acceptance states", async ({ page }) => {
    await setDesktop(page);
    await page.goto(SEARCH_VISUAL_PATH);
    await expectReactSearchWorkspaceReady(page);
    await captureSearchVisual(page, "search-workspace-desktop.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expectReactSearchWorkspaceReady(page);
    await captureSearchVisual(page, "search-default-390.png");

    await page.setViewportSize({ width: 320, height: 820 });
    await page.reload();
    await expectReactSearchWorkspaceReady(page);
    await expect(page.getByRole("img", { name: "chatlogUI" })).toBeVisible();
    await expect(page.locator(".app-titlebar__product-compact")).toHaveText("C");
    await expectWindowControlsVisible(page);
    await expectWindowControlTargets(page, true);
    await expectCompactTitlebarFits(page);
    await captureSearchVisual(page, "search-default-320.png");

    await setDesktop(page);
    await page.reload();
    await expectReactSearchWorkspaceReady(page);

    const input = page.getByRole("combobox", { name: "搜索聊天记录" });
    await input.fill("Synthetic");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
    await captureSearchVisual(page, "search-success-desktop.png");

    await page.getByRole("button", { name: "全部消息类型" }).click();
    await page.getByRole("menuitemcheckbox", { name: "文字" }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("status").filter({ hasText: "筛选尚未应用" })).toBeVisible();
    await captureSearchVisual(page, "search-dirty-draft-desktop.png");

    await page.reload();
    await expectReactSearchWorkspaceReady(page);
    await page.getByRole("combobox", { name: "搜索聊天记录" }).fill("synthetic empty result");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(page.getByText("没有找到匹配记录", { exact: true })).toBeVisible();
    await captureSearchVisual(page, "search-empty-desktop.png");

    await installSearchFirstErrorVisualFixture(page);
    await page.reload();
    await expectReactSearchWorkspaceReady(page);
    await page.getByRole("combobox", { name: "搜索聊天记录" }).fill("Synthetic first failure");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("搜索未完成");
    await captureSearchVisual(page, "search-first-error-desktop.png");

    await page.unroute(SEARCH_API_PATTERN);
    await page.reload();
    await expectReactSearchWorkspaceReady(page);
    const loadingFixture = await installSearchLoadingVisualFixture(page);
    await page.getByRole("combobox", { name: "搜索聊天记录" }).fill("Synthetic loading visual");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    const pendingRoute = await loadingFixture.pendingRoute;
    await expect(page.getByRole("region", { name: "正在搜索" })).toBeVisible();
    await captureSearchVisual(page, "search-loading-desktop.png");
    await pendingRoute.abort("aborted");
    await loadingFixture.dispose();

    await page.reload();
    await expectReactSearchWorkspaceReady(page);
    await page.getByRole("combobox", { name: "搜索聊天记录" }).fill("Synthetic");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toBeVisible();
    await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
    const darkFocusedResult = page.locator(".search-result-row").first();
    await darkFocusedResult.focus();
    await expect(darkFocusedResult).toBeFocused();
    await captureSearchVisual(page, "search-success-dark-desktop.png");

    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await enablePrivacyMode(page);
    await expect(page.getByText("Synthetic project kickoff notes", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Synthetic Session Alpha", { exact: true })).toHaveCount(0);
    await assertNoForbiddenVisibleText(page);
    await captureSearchVisual(page, "search-privacy-on-desktop.png");
  });

  test("captures real search long content at desktop and 200 percent text scale", async ({
    page,
  }) => {
    await installSearchLongContentVisualFixture(page);
    await setDesktop(page);
    await page.goto(SEARCH_VISUAL_PATH);
    await expectReactSearchWorkspaceReady(page);
    await page.getByRole("combobox", { name: "搜索聊天记录" }).fill("Synthetic long visual");
    await page.getByRole("button", { name: "搜索", exact: true }).click();
    await expect(page.getByText(/超长中文会话中的中英文混排消息/)).toBeVisible();
    await captureSearchVisual(page, "search-long-content-desktop.png");

    await setZoomEquivalent400(page);
    await setRootTextScale(page, 2);
    await expect(page.getByRole("region", { name: "搜索结果", exact: true })).toBeVisible();
    await expectSearchTextScaleLayout(page);
    await captureSearchVisual(page, "search-long-content-200-percent.png", { fullPage: false });

    const longResult = page.getByText(/超长中文会话中的中英文混排消息/);
    await longResult.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(longResult).toBeInViewport();
    await captureSearchVisual(page, "search-long-content-200-percent-result.png", {
      fullPage: false,
    });
  });

  test("captures global setup settings media and SNS acceptance states", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "连接本地聊天数据服务" })).toBeVisible();
    await expect(page).toHaveScreenshot("setup-center-desktop.png", {
      fullPage: true,
    });

    await page.goto("/settings?section=about&codex-smoke=workbench-ready");
    await expect(page.getByRole("heading", { name: "关于" })).toBeVisible();
    await page.getByRole("button", { name: "查看脱敏诊断" }).click();
    await expect(page.getByRole("button", { name: "复制诊断" })).toBeVisible();
    await expect(page).toHaveScreenshot("settings-about-diagnostics-desktop.png", {
      fullPage: true,
    });

    await page.goto("/media?codex-smoke=workbench-ready");
    await expect(page.getByText("当前阶段聚焦当前会话媒体")).toBeVisible();
    await expect(page).toHaveScreenshot("media-workspace-desktop.png", {
      fullPage: true,
    });

    await setNarrow(page);
    await page.goto("/media?scope=currentChat&chat=session_synthetic_001&codex-smoke=workbench-ready");
    await expect(page.getByRole("region", { name: "媒体筛选" })).toBeVisible();
    const imageRow = page.locator(".media-library__row--attachment").filter({ hasText: "图片" }).first();
    await expect(imageRow).toBeVisible();
    await imageRow.getByRole("button", { name: "打开原始资源" }).click();
    const openOriginalDialog = page.getByRole("dialog", { name: "打开原始资源" });
    await expect(openOriginalDialog).toBeVisible();
    await expect(openOriginalDialog).toBeInViewport();
    await expect(page).toHaveScreenshot("media-operation-narrow.png", {
      fullPage: true,
    });

    await page.goto("/sns?codex-smoke=workbench-ready");
    await expect(page.getByText("外部文章会先确认域名")).toBeVisible();
    await expect(page).toHaveScreenshot("sns-workspace-desktop.png", {
      fullPage: true,
    });
  });

  test("captures narrow privacy-on workbench state", async ({ page }) => {
    await setNarrow(page);
    await openSyntheticWorkbench(page);
    await enablePrivacyMode(page);
    await page.mouse.move(24, 780);
    await page.waitForTimeout(450);

    await expect(page).toHaveScreenshot("workbench-privacy-narrow.png", {
      fullPage: true,
    });

    await openWorkbenchModule(page, "AI");
    await page.getByRole("button", { name: "AI 设置" }).click();
    await expect(page.getByText("语义设置")).toBeVisible();
    await page.mouse.move(24, 780);
    await page.waitForTimeout(450);
    await expect(page).toHaveScreenshot("semantic-setup-privacy-narrow.png", {
      fullPage: true,
    });

    await page.getByRole("button", { name: "关闭", exact: true }).click();
    const closeSidebarButton = page.getByRole("button", { name: "关闭侧栏" });
    if (await closeSidebarButton.isVisible()) {
      await closeSidebarButton.click();
    }
    await openWorkbenchModule(page, "图谱");
    await expect(page.getByLabel("知识图谱模块")).toBeVisible();
    await expect(page).toHaveScreenshot("graph-workbench-privacy-narrow.png", {
      fullPage: true,
    });
  });

  test("captures compact text-scale long-content evidence", async ({ page }) => {
    await setZoomEquivalent400(page);
    expect(page.viewportSize()).toEqual(COMPACT_VIEWPORT);
    await openSyntheticWorkbench(page);
    await setRootTextScale(page, 2);
    await installTask14VisualLongContentFixture(page);
    await expect(page.getByRole("region", { name: "Task 14 长内容响应式样例" })).toBeVisible();
    await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
    await page.mouse.move(24, 780);
    await page.waitForTimeout(450);

    await expect(page).toHaveScreenshot("task14-long-content-compact.png", {
      fullPage: true,
    });
  });

  test("captures narrow privacy-on settings state", async ({ page }) => {
    await page.addInitScript(() => {
      const storageKey = "chatlog_alpha_settings";
      const raw = window.localStorage.getItem(storageKey);
      const settings = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      window.localStorage.setItem(storageKey, JSON.stringify({
        ...settings,
        privacyOn: true,
      }));
    });
    await setNarrow(page);
    await page.mouse.move(24, 780);
    await page.goto("/settings?section=advanced&codex-smoke=workbench-ready");
    await expect(page.getByRole("heading", { name: "隐私与诊断" })).toBeVisible();
    await page.mouse.move(24, 780);
    await page.waitForTimeout(450);
    await expect(page).toHaveScreenshot("settings-privacy-narrow.png", {
      fullPage: true,
    });
  });
});
