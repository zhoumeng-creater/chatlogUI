import { expect, type Page } from "@playwright/test";

export async function expectGraphCanvasReady(page: Page) {
  const canvas = page.locator(".graph-canvas__stage canvas").first();
  await expect(canvas).toBeVisible();

  await expect.poll(async () => canvas.evaluate((node) => {
    const graphCanvas = node as HTMLCanvasElement;
    const gl = graphCanvas.getContext("webgl2") ?? graphCanvas.getContext("webgl");
    if (!gl) return 0;

    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
    if (width <= 0 || height <= 0) return 0;

    const sampleWidth = Math.min(96, width);
    const sampleHeight = Math.min(96, height);
    const x = Math.max(0, Math.floor((width - sampleWidth) / 2));
    const y = Math.max(0, Math.floor((height - sampleHeight) / 2));
    const pixels = new Uint8Array(sampleWidth * sampleHeight * 4);
    gl.readPixels(x, y, sampleWidth, sampleHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    let brightPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index] ?? 0;
      const green = pixels[index + 1] ?? 0;
      const blue = pixels[index + 2] ?? 0;
      const alpha = pixels[index + 3] ?? 0;
      if (alpha > 0 && red + green + blue > 90) brightPixels += 1;
    }
    return brightPixels;
  })).toBeGreaterThan(8);
}
