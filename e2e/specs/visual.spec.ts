import { expect, test } from "@playwright/test";
import { setDesktop, setNarrow } from "../utils/viewport";
import { expectGraphCanvasReady } from "../utils/graph";
import { enablePrivacyMode, openSyntheticWorkbench, openWorkbenchModule } from "../utils/workbench";

test.describe("visual regression synthetic states", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  test("captures desktop workbench and advanced module states", async ({ page }) => {
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

    await openWorkbenchModule(page, "图谱");
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
  });
});
