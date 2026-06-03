import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";
import { useMediaStore } from "@/l2-coordinator/data-clerk/stores/useMediaStore";
import type { MediaAttachment } from "@l4/network/mediaAdapters";
import { closeMediaPreview, openMediaPreview } from "./useMediaCommander";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  useMediaStore.getState().resetMedia();
  useDiagnosticEventStore.setState({
    items: [],
    filters: {
      source: "all",
      level: "all",
      privacy: "all",
      endpointFamily: "all",
      failedOnly: false,
      timeRange: "all",
    },
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("useMediaCommander actions", () => {
  it("opens media preview with object URL and safe diagnostics", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:synthetic-preview");
    URL.revokeObjectURL = vi.fn();
    globalThis.fetch = vi.fn(async () =>
      new Response(new Blob(["image-bytes"], { type: "image/png" }), { status: 200 }),
    );

    try {
      await openMediaPreview(attachment());
      closeMediaPreview();
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }

    expect(useMediaStore.getState().preview.status).toBe("idle");
    expect(useDiagnosticEventStore.getState().items[0].attributes?.endpointFamily).toBe("image");
    expect(JSON.stringify(useDiagnosticEventStore.getState().items)).not.toContain(
      "synthetic-image-key",
    );
  });

  it("ignores stale preview responses and revokes their object URL", async () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const first = deferred<Response>();
    const second = deferred<Response>();
    const revokeSpy = vi.fn();

    URL.createObjectURL = vi
      .fn()
      .mockReturnValueOnce("blob:second-preview")
      .mockReturnValueOnce("blob:first-preview");
    URL.revokeObjectURL = revokeSpy;
    globalThis.fetch = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    try {
      const firstOpen = openMediaPreview(attachment("attachment-1", "synthetic-image-key-a"));
      const secondOpen = openMediaPreview(attachment("attachment-2", "synthetic-image-key-b"));

      second.resolve(new Response(new Blob(["second"], { type: "image/png" }), { status: 200 }));
      await secondOpen;
      first.resolve(new Response(new Blob(["first"], { type: "image/png" }), { status: 200 }));
      await firstOpen;
    } finally {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }

    expect(useMediaStore.getState().preview).toMatchObject({
      attachmentId: "attachment-2",
      objectUrl: "blob:second-preview",
      status: "ready",
    });
    expect(revokeSpy).toHaveBeenCalledWith("blob:first-preview");
  });
});

function attachment(
  id = "attachment-1",
  key = "synthetic-image-key",
): MediaAttachment {
  return {
    id,
    kind: "image",
    source: "history",
    endpointFamily: "image",
    label: "图片",
    fetchRef: {
      endpointFamily: "image",
      key,
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
