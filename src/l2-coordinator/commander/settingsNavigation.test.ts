import { describe, expect, it } from "vitest";
import {
  buildSettingsRoute,
  deriveSettingsReturnAction,
  normalizeSettingsInitialCategory,
} from "./settingsNavigation";

describe("settingsNavigation", () => {
  it("returns to setup when Settings was opened from setup or DB is not ready", () => {
    expect(
      deriveSettingsReturnAction({
        source: "setup",
        dbReady: true,
      }),
    ).toEqual({
      label: "返回设置中心",
      target: "/",
      replace: true,
    });

    expect(
      deriveSettingsReturnAction({
        dbReady: false,
      }),
    ).toEqual({
      label: "返回设置中心",
      target: "/",
      replace: true,
    });
  });

  it("returns to canonical workspace routes for safe sources", () => {
    expect(deriveSettingsReturnAction({ source: "ai", dbReady: true })).toMatchObject({
      label: "返回 AI 工作台",
      target: "/ai",
    });
    expect(deriveSettingsReturnAction({ source: "graph", dbReady: true })).toMatchObject({
      label: "返回图谱",
      target: "/graph",
    });
    expect(deriveSettingsReturnAction({ source: "media", dbReady: true })).toMatchObject({
      label: "返回媒体",
      target: "/media",
    });
  });

  it("uses only safe return route keys and strips raw context from targets", () => {
    const unsafe = deriveSettingsReturnAction({
      source: "app-shell",
      returnRoute: "/ai?chat=wxid_synthetic_private&focus=Private%20Topic&query=secret",
      dbReady: true,
    });

    expect(unsafe.target).toBe("/ai");
    expect(unsafe.target).not.toContain("wxid_synthetic_private");
    expect(unsafe.target).not.toContain("Private");
    expect(unsafe.target).not.toContain("query");
  });

  it("falls back to workbench for direct Settings when DB is ready", () => {
    expect(deriveSettingsReturnAction({ dbReady: true })).toEqual({
      label: "返回工作台",
      target: "/workbench",
      replace: true,
    });
  });

  it("normalizes initial categories from safe section/source hints", () => {
    expect(normalizeSettingsInitialCategory({ section: "semantic", source: "ai" })).toBe("ai");
    expect(normalizeSettingsInitialCategory({ section: "diagnostics" })).toBe("advanced");
    expect(normalizeSettingsInitialCategory({ section: "about", source: "update" })).toBe("about");
    expect(normalizeSettingsInitialCategory({ source: "setup" })).toBe("data");
    expect(normalizeSettingsInitialCategory({ section: "wxid_synthetic_private" })).toBe("data");
  });

  it("builds safe Settings routes without serializing private context", () => {
    const route = buildSettingsRoute({
      source: "app-shell",
      returnRoute: "/graph?focus=Private%20Entity&chat=wxid_synthetic_private",
      section: "semantic",
    });

    expect(route).toBe("/settings?source=app-shell&return=graph&section=semantic");
    expect(route).not.toContain("wxid_synthetic_private");
    expect(route).not.toContain("Private");
  });

  it("supports update recovery Settings routes with safe return targets", () => {
    expect(
      buildSettingsRoute({
        source: "update",
        returnRoute: "/graph?focus=Private%20Entity&chat=wxid_synthetic_private",
        section: "about",
      }),
    ).toBe("/settings?source=update&return=graph&section=about");

    expect(deriveSettingsReturnAction({
      source: "update",
      returnRoute: "/graph?focus=Private%20Entity&chat=wxid_synthetic_private",
      dbReady: true,
    })).toEqual({
      label: "返回图谱",
      target: "/graph",
      replace: true,
    });

    expect(deriveSettingsReturnAction({
      source: "update",
      dbReady: true,
    })).toEqual({
      label: "留在关于与更新",
      target: "/settings?section=about",
      replace: true,
    });
  });
});
