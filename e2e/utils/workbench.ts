import { expect, type Page } from "@playwright/test";
import { assertNoForbiddenVisibleText } from "./privacy-scan";
import { hasPageHorizontalOverflow } from "./viewport";

export async function openSyntheticWorkbench(page: Page) {
  await page.goto("/workbench?codex-smoke=workbench-ready");
  await expect(page.getByLabel("会话列表").first()).toBeVisible();
}

export async function openWorkbenchModule(page: Page, label: string) {
  const railButtons = page.getByRole("button", { name: `打开${label}模块` });
  const count = await railButtons.count();
  for (let index = 0; index < count; index += 1) {
    const button = railButtons.nth(index);
    if (await button.isVisible()) {
      await button.click();
      return;
    }
  }

  await page.getByRole("button", { name: label, exact: true }).click();
}

export async function enablePrivacyMode(page: Page) {
  const button = page.getByRole("button", { name: "开启隐私模式" });
  if (await button.isVisible()) {
    await button.click();
  }
}

export async function expectStableSyntheticPage(page: Page) {
  await expect.poll(() => hasPageHorizontalOverflow(page)).toBe(false);
  await assertNoForbiddenVisibleText(page);
}
