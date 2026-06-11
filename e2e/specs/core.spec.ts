import { expect, test } from "@playwright/test";
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
  test("renders setup center with collapsed local diagnostics", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "连接本地聊天数据服务" })).toBeVisible();
    await expect(page.getByText("选择由应用管理本机服务，或连接已有")).toBeVisible();
    await expect(page.getByRole("button", { name: /推荐自动导入/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /连接已有服务/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /专家手动配置/ })).toBeVisible();
    await expect(page.getByText("隐私保护")).toBeVisible();
    await expect(page.getByText("诊断信息")).toBeVisible();
    await expect(page.getByRole("button", { name: "查看脱敏诊断" })).toBeVisible();
    await expect(page.getByText("Export manifest version")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "打开工作台" })).toHaveCount(0);
    await expectStableSyntheticPage(page);
  });

  test("keeps setup first-run layout stable at narrow width", async ({ page }) => {
    await setNarrow(page);
    await page.goto("/");

    await expect(page.getByRole("button", { name: /推荐自动导入/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /连接已有服务/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /专家手动配置/ })).toBeVisible();
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
        status: top(".setup-shell__aside"),
        progress: top(".setup-stepper"),
        actionBarBottom: document.querySelector(".setup-flow__actions")?.getBoundingClientRect().bottom ?? Number.POSITIVE_INFINITY,
        action: top(".setup-flow__panel"),
        diagnostics: top(".setup-diagnostics-disclosure"),
        viewportHeight: window.innerHeight,
      };
    });
    expect(narrowOrder.status).toBeLessThan(narrowOrder.progress);
    expect(narrowOrder.progress).toBeLessThan(narrowOrder.action);
    expect(narrowOrder.action).toBeLessThan(narrowOrder.diagnostics);
    expect(narrowOrder.actionBarBottom).toBeLessThan(narrowOrder.viewportHeight);
    await expectStableSyntheticPage(page);
  });

  test("connects an external non-default loopback service and exposes a single ready CTA", async ({ page }) => {
    const server = await startMockChatlogServer({ rootDir: process.cwd(), port: 0 });
    await installTauriSetupConfigMock(page);

    try {
      await setDesktop(page);
      await page.goto("/");
      await page.getByRole("button", { name: /连接已有服务/ }).click();
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
    await page.getByRole("button", { name: /连接已有服务/ }).click();
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
    for (const label of ["会话", "搜索", "媒体", "朋友圈", "统计", "AI", "图谱"]) {
      await expect(page.getByRole("button", { name: `打开${label}` })).toBeVisible();
    }
    await expectDeveloperEntryHidden(page);
    await expect(page.locator(".workbench-frame__module-tabs")).toHaveCount(0);
    await expectStableSyntheticPage(page);
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

  test("opens a search result at its chat hit and returns to the result list", async ({ page }) => {
    await setDesktop(page);
    await expectSearchClosedLoop(page);

    await setNarrow(page);
    await expectSearchClosedLoop(page);
  });

  test("keeps scoped current-chat search constrained before conversations finish loading", async ({ page }) => {
    await setDesktop(page);
    const searchRequests: string[] = [];
    const sessionsResponse = page.waitForResponse("**/api/v1/sessions**");

    await page.route("**/api/v1/sessions**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1_200));
      await route.continue();
    });
    await page.route("**/api/v1/search**", async (route) => {
      searchRequests.push(route.request().url());
      await route.continue();
    });

    await page.goto("/search?scope=currentChat&chat=session_synthetic_001&codex-smoke=workbench-ready");
    const input = page.getByRole("textbox", { name: "搜索聊天记录" });
    await input.fill("Synthetic search result");
    await input.press("Enter");

    await expect.poll(() => searchRequests.length).toBe(1);
    expect(new URL(searchRequests[0]).searchParams.get("chats")).toBe("session_synthetic_001");
    await sessionsResponse;
  });

  test("opens a search result with keyboard activation", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/search?codex-smoke=workbench-ready");

    const input = page.getByRole("textbox", { name: "搜索聊天记录" });
    await input.fill("Synthetic search result");
    await input.press("Enter");

    const result = page.getByRole("button", { name: /Synthetic search result for UI state only/ });
    await expect(result).toBeVisible();
    await result.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("已定位搜索命中")).toBeVisible();
  });

  test("keeps late search responses from replacing the latest query", async ({ page }) => {
    await setDesktop(page);
    await page.route("**/api/v1/search**", async (route) => {
      const url = new URL(route.request().url());
      const keyword = url.searchParams.get("keyword") ?? "";
      if (keyword.includes("old")) {
        await page.waitForTimeout(900);
        await route.fulfill({ json: searchResponse([
          searchMessage({ localId: 3001, content: "Synthetic old stale result" }),
        ]) }).catch(() => undefined);
        return;
      }
      await route.fulfill({ json: searchResponse([
        searchMessage({ localId: 3002, content: "Synthetic latest result" }),
      ]) });
    });

    await page.goto("/search?codex-smoke=workbench-ready");
    const input = page.getByRole("textbox", { name: "搜索聊天记录" });
    await input.fill("old");
    await input.press("Enter");
    await input.fill("latest");
    await input.press("Enter");

    await expect(page.getByText("Synthetic latest result")).toBeVisible();
    await page.waitForTimeout(1_000);
    await expect(page.getByText("Synthetic old stale result")).toHaveCount(0);
  });

  test("does not append a stale load-more page after changing filters", async ({ page }) => {
    await setDesktop(page);
    await page.route("**/api/v1/search**", async (route) => {
      const url = new URL(route.request().url());
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const msgType = url.searchParams.get("msg_type");
      if (msgType === "3") {
        await route.fulfill({ json: searchResponse([
          searchMessage({ localId: 4101, content: "Synthetic image filtered result" }),
        ]) });
        return;
      }
      if (offset === 20) {
        await page.waitForTimeout(900);
        await route.fulfill({ json: searchResponse([
          searchMessage({ localId: 4020, content: "Synthetic stale page result" }),
        ], { totalCount: 40, offset: 20 }) }).catch(() => undefined);
        return;
      }
      await route.fulfill({
        json: searchResponse(
          Array.from({ length: 20 }, (_, index) =>
            searchMessage({ localId: 4000 + index, content: `Synthetic first page result ${index}` }),
          ),
          { totalCount: 40 },
        ),
      });
    });

    await page.goto("/search?codex-smoke=workbench-ready");
    const input = page.getByRole("textbox", { name: "搜索聊天记录" });
    await input.fill("paged");
    await input.press("Enter");
    await expect(page.getByText("Synthetic first page result 0")).toBeVisible();

    await page.getByRole("button", { name: "加载更多搜索结果" }).click();
    await page.getByRole("button", { name: "图片" }).click();

    await expect(page.getByText("Synthetic image filtered result")).toBeVisible();
    await page.waitForTimeout(1_000);
    await expect(page.getByText("Synthetic stale page result")).toHaveCount(0);
  });

  test("shows a recoverable message when the search anchor is missing from history", async ({ page }) => {
    await setDesktop(page);
    await page.route("**/api/v1/history**", async (route) => {
      await route.fulfill({ json: historyResponse([
        historyMessage({
          localId: 9001,
          timestamp: 1767254999,
          content: "Synthetic nearby nonmatching message",
        }),
      ]) });
    });

    await page.goto("/search?codex-smoke=workbench-ready");
    const input = page.getByRole("textbox", { name: "搜索聊天记录" });
    await input.fill("Synthetic search result");
    await input.press("Enter");
    await page.locator(".search-result-row").filter({ hasText: "Synthetic search result for UI state only" }).click();

    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("已打开会话，但未能精确定位命中消息")).toBeVisible();
    await expect(page.getByRole("button", { name: "返回搜索结果" })).toBeVisible();
  });

  test("keeps privacy-on search snippets and hit context masked", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/search?codex-smoke=workbench-ready");
    await enablePrivacyMode(page);

    const input = page.getByRole("textbox", { name: "搜索聊天记录" });
    await input.fill("合同");
    await input.press("Enter");

    await expect(page.getByText("Synthetic search result for UI state only")).toHaveCount(0);
    const result = page.locator(".search-result-row").first();
    await expect(result).toContainText(/\*{3,}/);
    await result.click();

    await expect(page).toHaveURL(/\/workbench/);
    await expect(page.getByText("Synthetic message for UI state only")).toHaveCount(0);
    await expect(page.locator(".message-row--search-hit")).toBeVisible();
    await assertNoForbiddenVisibleText(page);
  });

  test("settings route renders without synthetic privacy leakage", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/settings");

    await expect(page.getByText("设置", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "数据" })).toBeVisible();
    await page.getByRole("button", { name: "关于" }).click();
    await expect(page.getByRole("heading", { name: "关于" })).toBeVisible();
    await expect(page.getByRole("button", { name: "检查更新" })).toBeVisible();
    await expect(page.getByText("诊断摘要").first()).toBeVisible();
    await page.getByRole("button", { name: "检查更新" }).click();
    await expect(page.getByText("已是最新版本")).toBeVisible();
    await expectStableSyntheticPage(page);
  });
});

async function expectSearchClosedLoop(page: import("@playwright/test").Page) {
  await page.goto("/search?codex-smoke=workbench-ready");

  const input = page.getByRole("textbox", { name: "搜索聊天记录" });
  await input.fill("Synthetic search result");
  await input.press("Enter");

  const result = page.locator(".search-result-row").filter({ hasText: "Synthetic search result for UI state only" });
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/workbench/);
  await expect(page.getByText("已定位搜索命中")).toBeVisible();
  await expect(page.locator(".message-row--search-hit")).toBeVisible();
  await expect(page.locator("[data-local-id='1001']")).toBeVisible();

  await page.getByRole("button", { name: "返回搜索结果" }).click();
  await expect(page).toHaveURL(/\/search/);
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("aria-current", "true");
  await expectStableSyntheticPage(page);
}

function searchResponse(
  messages: ReturnType<typeof searchMessage>[],
  options: { totalCount?: number; offset?: number; limit?: number } = {},
) {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;
  return {
    total_count: options.totalCount ?? messages.length,
    count: messages.length,
    limit,
    offset,
    messages,
  };
}

function searchMessage(overrides: { localId?: number; content?: string } = {}) {
  return {
    ...historyMessage({
      localId: 1001,
      content: "Synthetic search result for UI state only",
      ...overrides,
    }),
    chat: "session_synthetic_001",
    username: "session_synthetic_001",
  };
}

function historyResponse(messages: ReturnType<typeof historyMessage>[]) {
  return {
    chat: "session_synthetic_001",
    username: "session_synthetic_001",
    is_group: false,
    chat_type: "private",
    total_count: messages.length,
    count: messages.length,
    limit: 50,
    offset: 0,
    messages,
  };
}

function historyMessage(
  overrides: { localId?: number; timestamp?: number; content?: string } = {},
) {
  const timestamp = overrides.timestamp ?? 1767254400;
  return {
    local_id: overrides.localId ?? 1001,
    timestamp,
    time: timestamp === 1767254400 ? "2026-01-01 08:00" : "2026-01-01 08:09",
    sender: "contact_synthetic_001",
    type: "text",
    content: overrides.content ?? "Synthetic message for UI state only",
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
