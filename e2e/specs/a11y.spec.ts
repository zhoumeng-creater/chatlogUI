import { expect, test, type Locator, type Page } from "@playwright/test";
import { expectNoCriticalA11yViolations } from "../utils/a11y";
import { expectGraphCanvasReady } from "../utils/graph";
import { assertNoForbiddenVisibleText, installPrivacyLeakGuard } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  expectWindowControlsKeyboardReachable,
  expectWindowControlsVisible,
} from "../utils/window-controls";
import {
  enablePrivacyMode,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

async function isTooltipVisuallyShown(tooltip: Locator) {
  return tooltip.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return style.display !== "none" &&
      style.visibility !== "hidden" &&
      Number(style.opacity || "1") > 0.5;
  });
}

async function expectCommandTooltipInsideViewport(page: Page, buttonName: string) {
  const button = page.getByRole("button", { name: buttonName, exact: true });
  await expect(button).toBeVisible();
  await button.focus();

  const describedBy = await button.getAttribute("aria-describedby");
  expect(describedBy).toBeTruthy();

  const tooltip = page.locator(`#${describedBy}`);
  await expect(tooltip).toBeVisible();

  const box = await tooltip.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}

test.describe("accessibility and keyboard gate", () => {
  test("passes axe critical/serious checks on representative routes", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await expectNoCriticalA11yViolations(page);

    await openWorkbenchModule(page, "搜索");
    await expect(page.getByLabel("搜索工作区")).toBeVisible();
    await expectNoCriticalA11yViolations(page);

    await page.goto("/settings");
    await expect(page.getByText("设置", { exact: true }).first()).toBeVisible();
    await expectNoCriticalA11yViolations(page);
  });

  test("keeps rail, tabs, stream controls, and graph explicit-load keyboard reachable", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "开启隐私模式" })).toBeFocused();

    await page.getByRole("button", { name: "打开图谱" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "图谱" })).toBeVisible();

    await page.getByRole("button", { name: /Synthetic Entity Alpha mentioned Synthetic Topic Alpha/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary", { name: "图谱详情" })).toContainText("已支持");
    await page.getByRole("tab", { name: "可视化" }).focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "打开可视化" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("知识图谱可视化")).toBeVisible();
    await page.getByRole("tab", { name: "问答" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "图谱问答面板" })).toBeVisible();
  });

  test("does not expose forbidden accessible names in narrow privacy mode", async ({ page }) => {
    const privacyGuard = installPrivacyLeakGuard(page);

    await setNarrow(page);
    await openSyntheticWorkbench(page);
    await enablePrivacyMode(page);
    await openWorkbenchModule(page, "朋友圈");

    await assertNoForbiddenVisibleText(page);
    privacyGuard.assertNoLeaks();
  });

  test("keeps semantic QA evidence reachable and dismissible by keyboard", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await openWorkbenchModule(page, "AI");

    await page.locator(".qa-input__textarea").fill("synthetic completed qa a11y");
    await page.getByRole("button", { name: /发送/ }).click();
    const evidenceButton = page.getByRole("button", { name: "证据" });
    await expect(evidenceButton).toBeVisible();

    await evidenceButton.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("complementary", { name: "问答证据" })).toBeVisible();
    await expect(page.getByRole("button", { name: "关闭证据" })).toBeFocused();
    await expectNoCriticalA11yViolations(page);

    await page.keyboard.press("Escape");
    await expect(page.getByRole("complementary", { name: "问答证据" })).toHaveCount(0);
  });

  test("traps and restores focus for narrow inspector drawers", async ({ page }) => {
    await setNarrow(page);
    await openSyntheticWorkbench(page);

    const conversationButton = page.getByRole("button", { name: /Synthetic Session Alpha/ }).first();
    await conversationButton.focus();
    await page.keyboard.press("Enter");

    const detailsButton = page.getByRole("button", { name: "会话详情", exact: true });
    await expect(detailsButton).toBeVisible();
    await detailsButton.focus();
    await page.keyboard.press("Enter");

    const drawer = page.getByRole("dialog", { name: "会话详情" });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole("button", { name: "关闭侧栏" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect.poll(() =>
      drawer.evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(detailsButton).toBeFocused();
  });

  test("keeps desktop shell window controls keyboard reachable", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    await expectWindowControlsVisible(page);
    await expectWindowControlsKeyboardReachable(page);

    await page.keyboard.press("Tab");
    await expect.poll(() =>
      page.evaluate(() => document.activeElement?.textContent?.trim() ?? ""),
    ).not.toBe("");
  });

  test("links tooltip-enabled icon commands to an accessible description", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    const settingsButton = page.getByRole("button", { name: "设置", exact: true });
    await expect(settingsButton).toBeVisible();
    await expect(settingsButton).toHaveAttribute("aria-describedby", /.+/, { timeout: 2_000 });

    const describedBy = await settingsButton.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const tooltip = page.locator(`#${describedBy}`);
    await expect(tooltip).toHaveAttribute("role", "tooltip");

    await settingsButton.focus();
    await expect(tooltip).toBeVisible();
    await expectNoCriticalA11yViolations(page);
  });

  test("keeps titlebar command tooltips inside the viewport", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await expectCommandTooltipInsideViewport(page, "设置");
    await expectCommandTooltipInsideViewport(page, "最小化窗口");
    await expectCommandTooltipInsideViewport(page, "关闭窗口");

    await setNarrow(page);
    await openSyntheticWorkbench(page);
    await expectCommandTooltipInsideViewport(page, "设置");
    await expectCommandTooltipInsideViewport(page, "最小化窗口");
    await expectCommandTooltipInsideViewport(page, "关闭窗口");
  });

  test("keeps migrated graph command tooltips and timeline entries keyboard-operable", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await openWorkbenchModule(page, "图谱");

    await page.getByRole("tab", { name: "可视化" }).click();
    await page.getByRole("button", { name: "打开可视化" }).click();
    await expect(page.getByLabel("知识图谱可视化")).toBeVisible();
    await expectGraphCanvasReady(page);

    await expectCommandTooltipInsideViewport(page, "刷新图谱");
    await expectCommandTooltipInsideViewport(page, "自动旋转");

    const timelineToggle = page.getByRole("button", { name: "时间轴", exact: true });
    await timelineToggle.focus();
    await page.keyboard.press("Enter");
    await expect(timelineToggle).toHaveAttribute("aria-pressed", "true");

    await expectCommandTooltipInsideViewport(page, "关闭时间轴");
    const timelineEntry = page.getByRole("button", { name: /Synthetic graph event/ }).first();
    await expect(timelineEntry).toBeVisible();
    await timelineEntry.focus();
    await page.keyboard.press("Enter");
    await expect(timelineEntry).toHaveAttribute("aria-pressed", "true");
  });

  test("delays pointer tooltip reveal while keeping command focus explanation available", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);

    const settingsButton = page.getByRole("button", { name: "设置", exact: true });
    const tooltip = page.locator('[role="tooltip"]').filter({ hasText: "设置" }).first();

    await expect(settingsButton).toBeVisible();
    await expect(tooltip).toHaveCount(1);

    await settingsButton.hover();
    await page.waitForTimeout(100);
    expect(await isTooltipVisuallyShown(tooltip)).toBe(false);

    await page.waitForTimeout(450);
    expect(await isTooltipVisuallyShown(tooltip)).toBe(true);

    await page.mouse.move(0, 0);
    await settingsButton.focus();
    expect(await isTooltipVisuallyShown(tooltip)).toBe(true);
  });
});
