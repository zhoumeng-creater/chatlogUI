import type { Page } from "@playwright/test";

export const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
export const NARROW_VIEWPORT = { width: 390, height: 820 };
export const COMPACT_VIEWPORT = { width: 320, height: 820 };

export async function setDesktop(page: Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
}

export async function setNarrow(page: Page) {
  await page.setViewportSize(NARROW_VIEWPORT);
}

export async function setCompact(page: Page) {
  await page.setViewportSize(COMPACT_VIEWPORT);
}

export async function setRootTextScale(page: Page, scale = 2) {
  const normalizedScale = Number.isFinite(scale) && scale > 0 ? scale : 2;
  await page.addStyleTag({
    content: `
      :root {
        font-size: ${Math.round(normalizedScale * 100)}% !important;
      }

      [data-text-scale-fixture],
      [data-text-scale-fixture] * {
        font-size: ${normalizedScale}rem !important;
        line-height: 1.35 !important;
      }
    `,
  });
}

export async function setZoomEquivalent400(page: Page) {
  await setCompact(page);
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
