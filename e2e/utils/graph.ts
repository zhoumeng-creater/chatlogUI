import { expect, type Page } from "@playwright/test";
import { inflateSync } from "node:zlib";

export async function expectGraphCanvasReady(page: Page) {
  const canvas = page.locator(".graph-canvas__stage canvas").first();
  await expect(canvas).toBeVisible();

  await expect.poll(async () => countBrightPngPixels(await canvas.screenshot())).toBeGreaterThan(8);
}

function countBrightPngPixels(png: Buffer): number {
  const signature = "89504e470d0a1a0a";
  if (png.subarray(0, 8).toString("hex") !== signature) return 0;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const chunks: Buffer[] = [];

  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.subarray(offset + 4, offset + 8).toString("ascii");
    const data = png.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
    } else if (type === "IDAT") {
      chunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (width <= 0 || height <= 0 || bitDepth !== 8) return 0;
  const bytesPerPixel = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (bytesPerPixel === 0) return 0;

  const inflated = inflateSync(Buffer.concat(chunks));
  const rowLength = width * bytesPerPixel;
  let sourceOffset = 0;
  let previous = Buffer.alloc(rowLength);
  let brightPixels = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset] ?? 0;
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + rowLength));
    sourceOffset += rowLength;

    unfilterPngRow(row, previous, bytesPerPixel, filter);
    for (let x = 0; x < row.length; x += bytesPerPixel) {
      const alpha = colorType === 6 ? row[x + 3] ?? 0 : 255;
      const red = row[x] ?? 0;
      const green = row[x + 1] ?? 0;
      const blue = row[x + 2] ?? 0;
      if (alpha > 0 && red + green + blue > 90) brightPixels += 1;
    }
    previous = row;
  }

  return brightPixels;
}

function unfilterPngRow(row: Buffer, previous: Buffer, bytesPerPixel: number, filter: number) {
  for (let index = 0; index < row.length; index += 1) {
    const left = index >= bytesPerPixel ? row[index - bytesPerPixel] ?? 0 : 0;
    const up = previous[index] ?? 0;
    const upLeft = index >= bytesPerPixel ? previous[index - bytesPerPixel] ?? 0 : 0;
    const current = row[index] ?? 0;

    if (filter === 1) {
      row[index] = (current + left) & 0xff;
    } else if (filter === 2) {
      row[index] = (current + up) & 0xff;
    } else if (filter === 3) {
      row[index] = (current + Math.floor((left + up) / 2)) & 0xff;
    } else if (filter === 4) {
      row[index] = (current + paethPredictor(left, up, upLeft)) & 0xff;
    }
  }
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
}
