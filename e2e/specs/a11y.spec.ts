import { expect, test } from "@playwright/test";
import { expectNoCriticalA11yViolations } from "../utils/a11y";
import { assertNoForbiddenVisibleText, installPrivacyLeakGuard } from "../utils/privacy-scan";
import { setDesktop, setNarrow } from "../utils/viewport";
import {
  enablePrivacyMode,
  openSyntheticWorkbench,
  openWorkbenchModule,
} from "../utils/workbench";

test.describe("accessibility and keyboard gate", () => {
  test("passes axe critical/serious checks on representative routes", async ({ page }) => {
    await setDesktop(page);
    await openSyntheticWorkbench(page);
    await expectNoCriticalA11yViolations(page);

    await openWorkbenchModule(page, "开发");
    await expect(page.getByRole("complementary", { name: "开发者工具" }).first()).toBeVisible();
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

    await openWorkbenchModule(page, "开发");
    await page.getByRole("button", { name: "Hook" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel("Hook 事件流")).toBeVisible();
    await page.getByRole("button", { name: "监听" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText("Hook Events")).toBeVisible();

    await openWorkbenchModule(page, "图谱");
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

    const developerButton = page.getByRole("button", { name: "开发", exact: true });
    await developerButton.scrollIntoViewIfNeeded();
    await developerButton.focus();
    await page.keyboard.press("Enter");

    const drawer = page.getByRole("dialog", { name: "开发者工具" });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole("button", { name: "关闭侧栏" })).toBeFocused();

    await page.keyboard.press("Shift+Tab");
    await expect.poll(() =>
      drawer.evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(developerButton).toBeFocused();
  });
});
