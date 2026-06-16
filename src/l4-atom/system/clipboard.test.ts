import { afterEach, describe, expect, it, vi } from "vitest";
import { copyTextToClipboard } from "./clipboard";

const originalNavigator = globalThis.navigator;
const originalDocument = globalThis.document;

describe("copyTextToClipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: originalDocument,
      configurable: true,
    });
  });

  it("falls back to a textarea copy when navigator clipboard is denied", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    const textarea = {
      value: "",
      style: {},
      setAttribute: vi.fn(),
      select: vi.fn(),
    };
    const documentMock = {
      createElement: vi.fn(() => textarea),
      body: {
        appendChild: vi.fn(),
        removeChild: vi.fn(),
      },
      execCommand: vi.fn(() => true),
    };

    Object.defineProperty(globalThis, "navigator", {
      value: { clipboard: { writeText } },
      configurable: true,
    });
    Object.defineProperty(globalThis, "document", {
      value: documentMock,
      configurable: true,
    });

    await expect(copyTextToClipboard("Synthetic media summary")).resolves.toBe(true);

    expect(writeText).toHaveBeenCalledWith("Synthetic media summary");
    expect(documentMock.createElement).toHaveBeenCalledWith("textarea");
    expect(textarea.value).toBe("Synthetic media summary");
    expect(documentMock.execCommand).toHaveBeenCalledWith("copy");
    expect(documentMock.body.removeChild).toHaveBeenCalledWith(textarea);
  });
});
