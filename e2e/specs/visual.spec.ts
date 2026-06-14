import { expect, test } from "@playwright/test";
import { setDesktop, setNarrow } from "../utils/viewport";
import { expectGraphCanvasReady } from "../utils/graph";
import {
  enablePrivacyMode,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

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

    await openWorkbenchModule(page, "搜索");
    await expect(page.getByLabel("搜索工作区")).toBeVisible();
    await expect(page).toHaveScreenshot("search-workspace-desktop.png", {
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
    await expect(page.getByRole("dialog", { name: "打开原始资源" })).toBeVisible();
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
