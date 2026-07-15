import { beforeEach, describe, expect, it, vi } from "vitest";

const listenMock = vi.hoisted(() => vi.fn());
const canListenToTauriEventsMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/event", () => ({
  listen: listenMock,
}));

vi.mock("./tauriRuntime", () => ({
  canListenToTauriEvents: canListenToTauriEventsMock,
}));

import {
  BUSINESS_EXPORT_CLEANUP_NOTICE,
  listenBusinessExportCleanupRequired,
} from "./listenBusinessExportCleanupRequired";

describe("listenBusinessExportCleanupRequired", () => {
  beforeEach(() => {
    listenMock.mockReset();
    canListenToTauriEventsMock.mockReset();
  });

  it("maps the native code to fixed safe recovery copy and ignores arbitrary payload details", async () => {
    const unlisten = vi.fn();
    listenMock.mockImplementation(async (_eventName, handler) => {
      handler({
        payload: {
          code: "cleanup_incomplete",
          path: "C:\\Users\\Synthetic\\private-export.json",
        },
      });
      return unlisten;
    });
    canListenToTauriEventsMock.mockReturnValue(true);
    const onNotice = vi.fn();

    await expect(listenBusinessExportCleanupRequired(onNotice)).resolves.toBe(unlisten);

    expect(listenMock).toHaveBeenCalledWith(
      "business-export-cleanup-required",
      expect.any(Function),
    );
    expect(onNotice).toHaveBeenCalledWith(BUSINESS_EXPORT_CLEANUP_NOTICE);
    expect(BUSINESS_EXPORT_CLEANUP_NOTICE).not.toMatch(/Users|Synthetic|\\\\|\//i);
  });

  it("is a no-op outside the Tauri runtime", async () => {
    canListenToTauriEventsMock.mockReturnValue(false);
    const onNotice = vi.fn();

    const unlisten = await listenBusinessExportCleanupRequired(onNotice);
    unlisten();

    expect(listenMock).not.toHaveBeenCalled();
    expect(onNotice).not.toHaveBeenCalled();
  });
});
