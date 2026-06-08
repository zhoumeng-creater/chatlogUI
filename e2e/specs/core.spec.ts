import { expect, test } from "@playwright/test";
import { assertNoForbiddenVisibleText } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  expectWindowControlsDoNotOverlapMainContent,
  expectWindowControlsVisible,
  expectWindowControlTargets,
} from "../utils/window-controls";
import { expectStableSyntheticPage, openSyntheticWorkbench } from "../utils/workbench";

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

    await expect(page.getByRole("button", { name: "打开统计模块" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开媒体模块" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开朋友圈模块" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开开发模块" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开AI模块" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开图谱模块" })).toBeVisible();
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

    await expect(page.getByLabel("工作台导航")).toBeVisible();
    await expect(page.getByRole("button", { name: "打开会话模块" })).toBeVisible();
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
