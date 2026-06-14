import { expect, type Page } from "@playwright/test";

export async function expectGraphCanvasReady(page: Page) {
  const moduleSurface = page.getByLabel("知识图谱模块");
  await expect(moduleSurface).toBeVisible();

  const canvas = page.locator(".graph-canvas__stage canvas").first();
  await expect(canvas).toBeVisible();

  const box = await canvas.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(320);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(240);

  await expect.poll(async () => canvas.evaluate((node) => {
    const graphCanvas = node as HTMLCanvasElement;
    const gl = graphCanvas.getContext("webgl2") ?? graphCanvas.getContext("webgl");
    if (!gl) return 0;

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (width <= 0 || height <= 0) return 0;

    const pixels = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let brightPixels = 0;
    const pixelStride = Math.max(4, Math.floor((pixels.length / 4) / 8192) * 4);
    for (let index = 0; index < pixels.length; index += pixelStride) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const alpha = pixels[index + 3] ?? 0;
      if (alpha > 0 && red + green + blue > 90) brightPixels += 1;
    }
    return brightPixels;
  })).toBeGreaterThan(8);

  await expect.poll(async () => moduleSurface.evaluate((node) => {
    const element = node as HTMLElement;
    return Math.ceil(element.scrollWidth - element.clientWidth);
  })).toBeLessThanOrEqual(1);
}
