import { expect, test } from "@playwright/test";
import { setDesktop } from "../utils/viewport";
import { expectGraphCanvasReady } from "../utils/graph";
import {
  expectStableSyntheticPage,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

test.describe("advanced synthetic modules", () => {
  test.beforeEach(async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
  });

  test("opens media and SNS modules with synthetic fixture data", async ({ page }) => {
    await openWorkbenchModule(page, "媒体");
    await expect(page.getByRole("complementary", { name: "媒体与扩展" }).first()).toBeVisible();
    await expect(page.getByText("媒体与扩展").first()).toBeVisible();
    await expectStableSyntheticPage(page);

    await openWorkbenchModule(page, "朋友圈");
    await expect(page.getByRole("complementary", { name: "朋友圈" }).first()).toBeVisible();
    await expect(page.getByText("Synthetic SNS image post content")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("opens Developer DB/API/Hook/MCP surfaces", async ({ page }) => {
    await openWorkbenchModule(page, "开发");
    await expect(page.getByRole("complementary", { name: "开发者工具" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "DB Explorer" })).toBeVisible();
    await page.getByRole("button", { name: /MSG0\.db message/ }).click();
    await expect(page.getByText("SyntheticMessages")).toBeVisible();

    await page.getByRole("button", { name: "API Runner" }).click();
    await expect(page.getByLabel("本机 API 调试器")).toBeVisible();
    await expect(page.getByText("local-sidecar allowlist")).toBeVisible();

    await page.getByRole("button", { name: "Hook" }).click();
    await expect(page.getByLabel("Hook 事件流")).toBeVisible();
    await page.getByRole("button", { name: "监听" }).click();
    await expect(page.getByText("Hook Events")).toBeVisible();

    await page.getByRole("button", { name: "MCP" }).click();
    await expect(page.getByText("MCP Inventory")).toBeVisible();
    await expect(page.getByLabel("MCP 工具")).toBeVisible();
    await expectStableSyntheticPage(page);
  });

  test("opens semantic preview and graph visualization flows", async ({ page }) => {
    await openWorkbenchModule(page, "AI");
    await expect(page.getByRole("button", { name: "预览" })).toBeVisible();
    await page.getByRole("button", { name: "预览" }).click();
    await expect(page.getByLabel("语义索引预览")).toBeVisible();
    await expect(page.getByText("synthetic-embedding-model")).toBeVisible();

    await openWorkbenchModule(page, "图谱");
    await expect(page.getByLabel("知识图谱模块")).toBeVisible();
    await expect(page.getByRole("button", { name: "打开可视化" })).toBeEnabled();
    await page.getByRole("button", { name: "打开可视化" }).click();
    await expect(page.getByLabel("知识图谱可视化")).toBeVisible();
    await expectGraphCanvasReady(page);
    const canvasBox = await page.locator(".graph-canvas__stage canvas").first().boundingBox();
    expect(canvasBox?.width ?? 0).toBeGreaterThanOrEqual(520);
    await expectStableSyntheticPage(page);
  });
});
