import { expect, type Locator, type Page } from "@playwright/test";

const WINDOW_CONTROL_MIN_SIZE = 32;
const NARROW_WINDOW_CONTROL_MIN_SIZE = 40;

function maximizeControl(page: Page): Locator {
  return page.getByRole("button", { name: /^(最大化窗口|还原窗口)$/ });
}

function windowControls(page: Page): Locator[] {
  return [
    page.getByRole("button", { name: "最小化窗口" }),
    maximizeControl(page),
    page.getByRole("button", { name: "关闭窗口" }),
  ];
}

function boxesOverlap(
  first: { x: number; y: number; width: number; height: number },
  second: { x: number; y: number; width: number; height: number },
) {
  return !(
    first.x + first.width <= second.x ||
    second.x + second.width <= first.x ||
    first.y + first.height <= second.y ||
    second.y + second.height <= first.y
  );
}

export async function expectWindowControlsVisible(page: Page) {
  const [minimize, maximize, close] = windowControls(page);

  await expect(minimize).toBeVisible({ timeout: 2_000 });
  await expect(maximize).toBeVisible({ timeout: 2_000 });
  await expect(close).toBeVisible({ timeout: 2_000 });
}

export async function expectWindowControlTargets(page: Page, narrow = false) {
  const minSize = narrow ? NARROW_WINDOW_CONTROL_MIN_SIZE : WINDOW_CONTROL_MIN_SIZE;

  for (const control of windowControls(page)) {
    const box = await control.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width).toBeGreaterThanOrEqual(minSize);
    expect(box?.height).toBeGreaterThanOrEqual(minSize);
  }
}

export async function expectWindowControlsDoNotOverlapMainContent(page: Page) {
  const titlebar = page.locator(".app-titlebar, .setup-shell__titlebar").first();
  const main = page.locator(".app-main, .setup-shell__main").first();
  const titlebarBox = await titlebar.boundingBox();
  const mainBox = await main.boundingBox();

  expect(titlebarBox).not.toBeNull();
  expect(mainBox).not.toBeNull();
  if (!titlebarBox || !mainBox) return;

  expect(titlebarBox.y + titlebarBox.height).toBeLessThanOrEqual(mainBox.y + 1);

  const protectedRegions = [
    page.locator(".app-main, .setup-shell__main").first(),
    page.locator(".workbench-rail").first(),
    page.locator(".app-command-cluster").first(),
  ];

  for (const control of windowControls(page)) {
    const controlBox = await control.boundingBox();
    expect(controlBox).not.toBeNull();
    if (!controlBox) continue;

    for (const region of protectedRegions) {
      if (await region.count() === 0) continue;
      const regionBox = await region.boundingBox();
      if (!regionBox) continue;
      expect(boxesOverlap(controlBox, regionBox)).toBe(false);
    }
  }
}

export async function expectWindowControlsKeyboardReachable(page: Page) {
  const expectedNames = new Set(["最小化窗口", "关闭窗口"]);
  const reachedNames = new Set<string>();
  let reachedMaximize = false;

  for (let index = 0; index < 30; index += 1) {
    await page.keyboard.press("Tab");
    const activeName = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute("aria-label") ?? active?.textContent?.trim() ?? "";
    });

    if (expectedNames.has(activeName)) {
      reachedNames.add(activeName);
    }
    if (activeName === "最大化窗口" || activeName === "还原窗口") {
      reachedMaximize = true;
    }
    if (reachedNames.size === expectedNames.size && reachedMaximize) {
      return;
    }
  }

  expect({
    minimize: reachedNames.has("最小化窗口"),
    maximizeOrRestore: reachedMaximize,
    close: reachedNames.has("关闭窗口"),
  }).toEqual({
    minimize: true,
    maximizeOrRestore: true,
    close: true,
  });
}
