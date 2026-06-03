import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaStore } from "./useMediaStore";

describe("useMediaStore", () => {
  beforeEach(() => {
    useMediaStore.getState().resetMedia();
  });

  it("tracks preview loading and ready states", () => {
    useMediaStore.getState().setPreviewLoading({
      attachmentId: "attachment-1",
      kind: "image",
      title: "图片",
    });

    expect(useMediaStore.getState().preview).toMatchObject({
      status: "loading",
      attachmentId: "attachment-1",
      kind: "image",
      title: "图片",
    });

    useMediaStore.getState().setPreviewReady({
      objectUrl: "blob:synthetic-media",
      mimeType: "image/png",
    });

    expect(useMediaStore.getState().preview).toMatchObject({
      status: "ready",
      objectUrl: "blob:synthetic-media",
      mimeType: "image/png",
    });
  });

  it("revokes object URLs when preview closes", () => {
    const originalRevoke = URL.revokeObjectURL;
    const revokeObjectURL = vi.fn();
    URL.revokeObjectURL = revokeObjectURL;

    try {
      useMediaStore.getState().setPreviewLoading({
        attachmentId: "attachment-1",
        kind: "image",
        title: "图片",
      });
      useMediaStore.getState().setPreviewReady({
        objectUrl: "blob:synthetic-media",
        mimeType: "image/png",
      });
      useMediaStore.getState().closePreview();
    } finally {
      URL.revokeObjectURL = originalRevoke;
    }

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:synthetic-media");
    expect(useMediaStore.getState().preview.status).toBe("idle");
  });
});
