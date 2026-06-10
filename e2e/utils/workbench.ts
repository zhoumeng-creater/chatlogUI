import { expect, type Page } from "@playwright/test";
import { assertNoForbiddenVisibleText } from "./privacy-scan";
import { hasPageHorizontalOverflow } from "./viewport";

const SETTINGS_STORAGE_KEY = "chatlog_alpha_settings";

export async function enableDeveloperEntryForTest(page: Page) {
  await page.addInitScript((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    const settings = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    window.localStorage.setItem(storageKey, JSON.stringify({
      ...settings,
      developerMode: true,
    }));
  }, SETTINGS_STORAGE_KEY);
}

export async function openSyntheticWorkbench(page: Page) {
  await page.goto("/workbench?codex-smoke=workbench-ready");
  await expect(page.getByLabel("会话列表").first()).toBeVisible();
}

export async function openWorkbenchModule(page: Page, label: string) {
  for (const accessibleName of [`打开${label}`, `打开${label}模块`, label]) {
    const exact = accessibleName === label;
    const buttons = page.getByRole("button", { name: accessibleName, exact });
    const count = await buttons.count();
    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      if (await button.isVisible()) {
        await button.click();
        return;
      }
    }
  }

  throw new Error(`Cannot find visible workbench navigation button for ${label}`);
}

export async function enablePrivacyMode(page: Page) {
  const button = page.getByRole("button", { name: "开启隐私模式" });
  if (await button.isVisible()) {
    await button.click();
  }
}

export async function expectDeveloperEntryHidden(page: Page) {
  await expect(page.getByRole("button", { name: "打开开发" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "打开开发模块" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "开发", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "开发者控制台" })).toHaveCount(0);
}

export async function expectStableSyntheticPage(page: Page) {
  await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
  await assertNoForbiddenVisibleText(page);
}
