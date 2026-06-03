import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosticEvent } from "./diagnosticEvents";
import { fetchMediaBlob, fetchMediaInfo } from "./mediaResources";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("mediaResources", () => {
  it("fetches media metadata without exposing raw key in diagnostics", async () => {
    const events: DiagnosticEvent[] = [];
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        type: "image",
        key: "synthetic-image-key",
        name: "synthetic-image.png",
        size: 1234,
      }), { status: 200 }),
    );

    const info = await fetchMediaInfo(
      { endpointFamily: "image", key: "synthetic-image-key" },
      { diagnostics: { endpointFamily: "image" }, onDiagnosticEvent: (event) => events.push(event) },
    );

    expect(info).toMatchObject({ type: "image", key: "synthetic-image-key" });
    expect(events[0].attributes?.endpointFamily).toBe("image");
    expect(JSON.stringify(events[0])).not.toContain("synthetic-image-key");
  });

  it("fetches media blobs and emits safe diagnostics", async () => {
    const events: DiagnosticEvent[] = [];
    globalThis.fetch = vi.fn(async () =>
      new Response(new Blob(["image-bytes"], { type: "image/png" }), { status: 200 }),
    );

    const result = await fetchMediaBlob(
      { endpointFamily: "image", key: "synthetic-image-key" },
      { diagnostics: { endpointFamily: "image" }, onDiagnosticEvent: (event) => events.push(event) },
    );

    expect(result.mimeType).toBe("image/png");
    expect(result.blob.size).toBeGreaterThan(0);
    expect(events[0].attributes?.endpointFamily).toBe("image");
    expect(JSON.stringify(events[0])).not.toContain("synthetic-image-key");
  });
});
