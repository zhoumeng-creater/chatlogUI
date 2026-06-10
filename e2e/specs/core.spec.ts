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
      { path: "/sns", nav: "朋友圈", text: "浏览 timeline、通知和搜索结果" },
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
