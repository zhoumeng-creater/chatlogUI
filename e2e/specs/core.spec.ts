import { expect, test } from "@playwright/test";
import { assertNoForbiddenVisibleText } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  expectWindowControlsDoNotOverlapMainContent,
  expectWindowControlsVisible,
  expectWindowControlTargets,
} from "../utils/window-controls";
import {
  expectPrimaryWorkspaceRail,
  expectStableSyntheticPage,
  openSyntheticWorkbench,
  openSyntheticWorkspace,
} from "../utils/workbench";

test.describe("core synthetic routes", () => {
  test("renders setup center with local diagnostics summary", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/");

    await expect(page.getByText("连接本地聊天数据服务")).toBeVisible();
    await expect(page.getByText("诊断信息")).toBeVisible();
    await expect(page.getByText("诊断摘要").first()).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("renders workbench ready shell at desktop width", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    await expectPrimaryWorkspaceRail(page);
    await expect(page.getByText("会话详情")).toBeVisible();
    await expect(page.locator(".workbench-frame__module-tabs")).toHaveCount(0);
    await expectStableSyntheticPage(page);
  });

  test("renders workbench ready shell at narrow width", async ({ page }) => {
    await setNarrow(page);
    await openSyntheticWorkbench(page);

    await expect(page.getByLabel("会话列表")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("dashboard alias reaches the same synthetic workbench shell", async ({ page }) => {
    await setDesktop(page);
    await page.goto("/dashboard?codex-smoke=workbench-ready");

    await expect(page).toHaveURL(/\/workbench/);
    await expectPrimaryWorkspaceRail(page);
    await assertNoForbiddenVisibleText(page);
  });

  const canonicalRoutes = [
    ["/search", "搜索"],
    ["/analytics", "统计"],
    ["/media", "媒体"],
    ["/sns", "朋友圈"],
    ["/ai", "AI"],
    ["/graph", "图谱"],
  ] as const;

  for (const [href, heading] of canonicalRoutes) {
    test(`canonical ${href} route exposes the shared primary rail`, async ({ page }) => {
      await setDesktop(page);
      await openSyntheticWorkspace(page, href);

      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expectPrimaryWorkspaceRail(page);
      await expectStableSyntheticPage(page);
    });
  }

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
