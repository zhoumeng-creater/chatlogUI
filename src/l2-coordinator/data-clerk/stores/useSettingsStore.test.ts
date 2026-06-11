import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SETTINGS_DEFAULTS } from "@/l2-coordinator/api-docs/settings";
import { useSettingsStore } from "./useSettingsStore";

describe("useSettingsStore", () => {
  beforeEach(() => {
    useSettingsStore.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports storage failures instead of pretending Settings were saved", () => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error("synthetic storage unavailable");
      }),
    });

    useSettingsStore.getState().updateSettings({ theme: "dark" });

    expect(useSettingsStore.getState().saveToStorage()).toBe(false);
  });

  it("reports successful Settings persistence", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem,
    });

    useSettingsStore.getState().updateSettings({ theme: "dark" });

    expect(useSettingsStore.getState().saveToStorage()).toBe(true);
    expect(setItem).toHaveBeenCalledOnce();
  });

  it("saves only allowlisted Settings fields after loading legacy storage", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(() => JSON.stringify({
        theme: "dark",
        wxDataPath: "E:/WeChat",
        dataKey: "synthetic-data-key",
        sidecarPort: 8080,
        secret: "synthetic-secret",
        accessToken: "synthetic-access-token",
      })),
      setItem,
    });

    useSettingsStore.getState().loadFromStorage();
    expect(useSettingsStore.getState().saveToStorage()).toBe(true);

    const persisted = readLastPersistedSettings(setItem);
    expect(persisted.theme).toBe("dark");
    expect(persisted.wxDataPath).toBe("E:/WeChat");
    expect(persisted).not.toHaveProperty("dataKey");
    expect(persisted).not.toHaveProperty("sidecarPort");
    expect(persisted).not.toHaveProperty("secret");
    expect(persisted).not.toHaveProperty("accessToken");
  });

  it("sanitizes the in-memory Settings object before saving", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem,
    });
    useSettingsStore.setState({
      settings: {
        ...SETTINGS_DEFAULTS,
        theme: "dark",
        secret: "synthetic-secret",
        sidecarPort: 8080,
      } as never,
    });

    expect(useSettingsStore.getState().saveToStorage()).toBe(true);

    const persisted = readLastPersistedSettings(setItem);
    expect(persisted.theme).toBe("dark");
    expect(persisted).not.toHaveProperty("secret");
    expect(persisted).not.toHaveProperty("sidecarPort");
  });

  it("keeps privacy toggles from re-saving unknown legacy fields", () => {
    const setItem = vi.fn();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem,
    });
    useSettingsStore.setState({
      settings: {
        ...SETTINGS_DEFAULTS,
        privacyOn: false,
        accessToken: "synthetic-token",
        sidecarPort: 8080,
      } as never,
    });

    useSettingsStore.getState().togglePrivacy();

    const persisted = readLastPersistedSettings(setItem);
    expect(persisted.privacyOn).toBe(true);
    expect(persisted).not.toHaveProperty("accessToken");
    expect(persisted).not.toHaveProperty("sidecarPort");
  });
});

function readLastPersistedSettings(setItem: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const lastCall = setItem.mock.calls[setItem.mock.calls.length - 1];
  return JSON.parse(String(lastCall?.[1])) as Record<string, unknown>;
}
