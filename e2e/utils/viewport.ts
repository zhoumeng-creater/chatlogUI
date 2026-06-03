import type { Page } from "@playwright/test";

export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
export const NARROW_VIEWPORT = { width: 390, height: 820 };

export async function setDesktop(page: Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
}

export async function setNarrow(page: Page) {
  await page.setViewportSize(NARROW_VIEWPORT);
}

export async function hasPageHorizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const viewportWidth = window.innerWidth;
    return (
      root.scrollWidth > viewportWidth + 1 ||
      body.scrollWidth > viewportWidth + 1
    );
  });
}
