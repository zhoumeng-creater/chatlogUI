import { beforeEach, describe, expect, it } from "vitest";
import { useGraphStore } from "./useGraphStore";

describe("useGraphStore", () => {
  beforeEach(() => {
    useGraphStore.getState().reset();
  });

  it("tracks a two-step confirmation gate for advanced graph mutations", () => {
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();

    useGraphStore.getState().requestAdvancedConfirmation("business");
    expect(useGraphStore.getState().advancedConfirmationPending).toBe("business");
    expect(useGraphStore.getState().ingestStatus).toBe("idle");

    useGraphStore.getState().cancelAdvancedConfirmation();
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();

    useGraphStore.getState().requestAdvancedConfirmation("qa");
    useGraphStore.getState().setQALoading();
    expect(useGraphStore.getState().advancedConfirmationPending).toBeNull();
  });

  it("tracks workbench tabs, filters, graph query data, and selected inspector item", () => {
    useGraphStore.getState().setActiveTab("timeline");
    useGraphStore.getState().setGraphFilters({
      keyword: "Alice",
      timeWindow: "7d",
      entityFilter: "person",
      relationFilter: "owns",
      limit: 120,
      start: "2026-06-01",
      end: "2026-06-04",
    });
    useGraphStore.getState().setSelectedGraphItem("relation-2");
    useGraphStore.getState().setQuery({
      entities: [],
      relations: [],
      events: [],
      facts: [],
    });

    expect(useGraphStore.getState()).toMatchObject({
      activeTab: "timeline",
      keyword: "Alice",
      timeWindow: "7d",
      entityFilter: "person",
      relationFilter: "owns",
      limit: 120,
      start: "2026-06-01",
      end: "2026-06-04",
      selectedGraphItemId: "relation-2",
      query: {
        entities: [],
        relations: [],
        events: [],
        facts: [],
      },
    });

    useGraphStore.getState().clearGraphFilters();
    expect(useGraphStore.getState()).toMatchObject({
      keyword: "",
      timeWindow: "",
      entityFilter: "",
      relationFilter: "",
      limit: 80,
      start: "",
      end: "",
      selectedGraphItemId: "relation-2",
    });
  });
});
