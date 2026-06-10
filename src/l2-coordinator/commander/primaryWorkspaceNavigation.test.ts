import { describe, expect, it } from "vitest";
import {
  buildPrimaryWorkspaceNavItems,
  getPrimaryWorkspaceAliasRedirect,
  PRIMARY_WORKSPACE_DESTINATIONS,
  resolvePrimaryWorkspaceDestinationFromPath,
  type PrimaryWorkspaceDestination,
} from "./primaryWorkspaceNavigation";

describe("primaryWorkspaceNavigation", () => {
  it("keeps the ready workspace rail to ordinary user destinations only", () => {
    const destinations = PRIMARY_WORKSPACE_DESTINATIONS.map((item) => item.destination);

    expect(destinations).toEqual([
      "workbench",
      "search",
      "media",
      "sns",
      "analytics",
      "ai",
      "graph",
    ]);
    expect(destinations).not.toContain("settings");
    expect(destinations).not.toContain("developer");
    expect(destinations).not.toContain("diagnostics");
  });

  it("provides one canonical route per primary workspace destination", () => {
    expect(PRIMARY_WORKSPACE_DESTINATIONS.map((item) => item.href)).toEqual([
      "/workbench",
      "/search",
      "/media",
      "/sns",
      "/analytics",
      "/ai",
      "/graph",
    ]);
  });

  it("marks exactly one primary workspace item active", () => {
    const activeDestinations: PrimaryWorkspaceDestination[] = [
      "workbench",
      "search",
      "media",
      "sns",
      "analytics",
      "ai",
      "graph",
    ];

    for (const destination of activeDestinations) {
      const items = buildPrimaryWorkspaceNavItems(destination);
      expect(items.filter((item) => item.active).map((item) => item.destination)).toEqual([destination]);
    }
  });

  it("resolves canonical routes and old workbench aliases to the same destination", () => {
    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench")).toBe("workbench");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/search")).toBe("search");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/analytics")).toBe("analytics");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/media")).toBe("media");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/sns")).toBe("sns");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/ai")).toBe("ai");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/graph")).toBe("graph");

    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench/search")).toBe("search");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench/stats")).toBe("analytics");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench/media")).toBe("media");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench/sns")).toBe("sns");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench/ai")).toBe("ai");
    expect(resolvePrimaryWorkspaceDestinationFromPath("/workbench/graph")).toBe("graph");
  });

  it("redirects legacy workbench module paths instead of treating them as second primary entrances", () => {
    expect(getPrimaryWorkspaceAliasRedirect("/workbench/search")).toBe("/search");
    expect(getPrimaryWorkspaceAliasRedirect("/workbench/stats")).toBe("/analytics");
    expect(getPrimaryWorkspaceAliasRedirect("/workbench/media")).toBe("/media");
    expect(getPrimaryWorkspaceAliasRedirect("/workbench/sns")).toBe("/sns");
    expect(getPrimaryWorkspaceAliasRedirect("/workbench/ai")).toBe("/ai");
    expect(getPrimaryWorkspaceAliasRedirect("/workbench/graph")).toBe("/graph");
    expect(getPrimaryWorkspaceAliasRedirect("/workbench")).toBeNull();
  });
});
