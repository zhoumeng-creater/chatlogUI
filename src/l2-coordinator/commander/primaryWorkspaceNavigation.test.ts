import { describe, expect, it } from "vitest";
import {
  buildPrimaryWorkspaceRailItems,
  getPrimaryWorkspaceRoute,
  primaryWorkspaceDestinations,
  type PrimaryWorkspaceId,
} from "./primaryWorkspaceNavigation";

describe("primaryWorkspaceNavigation", () => {
  it("defines the only ordinary-user ready workspace destinations", () => {
    expect(primaryWorkspaceDestinations.map((item) => item.id)).toEqual([
      "workbench",
      "search",
      "media",
      "sns",
      "analytics",
      "ai",
      "graph",
    ]);
    expect(primaryWorkspaceDestinations.map((item) => item.id)).not.toContain("settings");
    expect(primaryWorkspaceDestinations.map((item) => item.id)).not.toContain("developer");
  });

  it("maps every primary destination to one canonical route", () => {
    const routes: Record<PrimaryWorkspaceId, string> = {
      workbench: "/workbench",
      search: "/search",
      media: "/media",
      sns: "/sns",
      analytics: "/analytics",
      ai: "/ai",
      graph: "/graph",
    };

    for (const [id, route] of Object.entries(routes) as Array<[PrimaryWorkspaceId, string]>) {
      expect(getPrimaryWorkspaceRoute(id)).toBe(route);
    }
  });

  it("marks exactly one rail item active without adding settings or developer", () => {
    const items = buildPrimaryWorkspaceRailItems("analytics");

    expect(items.map((item) => item.id)).toEqual([
      "workbench",
      "search",
      "media",
      "sns",
      "analytics",
      "ai",
      "graph",
    ]);
    expect(items.filter((item) => item.active).map((item) => item.id)).toEqual(["analytics"]);
    expect(items.every((item) => item.route === getPrimaryWorkspaceRoute(item.id))).toBe(true);
  });
});
