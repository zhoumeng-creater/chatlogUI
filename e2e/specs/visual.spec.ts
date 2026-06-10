import { expect, test } from "@playwright/test";
import { setDesktop, setNarrow } from "../utils/viewport";
import { expectGraphCanvasReady } from "../utils/graph";
import {
  enableDeveloperEntryForTest,
  enablePrivacyMode,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

test.describe("visual regression synthetic states", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("captures desktop workbench and advanced module states", async ({ page }) => {
    await enableDeveloperEntryForTest(page);
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await expect(page).toHaveScreenshot("workbench-ready-desktop.png", {
      fullPage: true,
    });

    await openWorkbenchModule(page, "开发");
    await page.getByRole("button", { name: "Hook" }).click();
    await expect(page).toHaveScreenshot("developer-hook-desktop.png", {
      fullPage: true,
    });

    await openWorkbenchModule(page, "AI");
    await expect(page.getByLabel("语义索引中心")).toBeVisible();
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
    await expect(page.getByRole("complementary", { name: "问答证据" })).toBeVisible();
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
    await expect(page.getByLabel("知识图谱可视化")).toBeVisible();
    await expectGraphCanvasReady(page);
    await expect(page).toHaveScreenshot("graph-visualization-desktop.png", {
      fullPage: true,
    });
  });

  test("captures narrow privacy-on workbench state", async ({ page }) => {
    await setNarrow(page);
    await openSyntheticWorkbench(page);
    await enablePrivacyMode(page);

    await expect(page).toHaveScreenshot("workbench-privacy-narrow.png", {
      fullPage: true,
    });

    await openWorkbenchModule(page, "AI");
    await page.getByRole("button", { name: "AI 设置" }).click();
    await expect(page.getByText("语义设置")).toBeVisible();
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
});
