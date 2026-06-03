import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDiagnosticEventStore } from "@/l2-coordinator/data-clerk/stores/useDiagnosticEventStore";
import { useFavoritesStore } from "@/l2-coordinator/data-clerk/stores/useFavoritesStore";
import { loadFavoritesIntoStore } from "./useFavoritesCommander";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  useFavoritesStore.getState().resetFavorites();
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

describe("useFavoritesCommander actions", () => {
  it("loads favorites into the store through safe diagnostics", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({
        count: 1,
        items: [
          {
            id: "favorite_synthetic_001",
            type: "text",
            type_num: 1,
            time: "2026-06-02 12:02",
            timestamp: 1800000002,
            preview: "Synthetic favorite preview",
            from: "member_synthetic_guest",
            chat: "Synthetic Group",
          },
        ],
      }), { status: 200 }),
    );

    await loadFavoritesIntoStore({ query: "Synthetic favorite preview" });

    expect(useFavoritesStore.getState().status).toBe("ready");
    expect(useFavoritesStore.getState().items[0].kindLabel).toBe("文本");
    expect(useDiagnosticEventStore.getState().items[0].attributes?.endpointFamily).toBe("favorites");
    expect(JSON.stringify(useDiagnosticEventStore.getState().items)).not.toContain(
      "Synthetic favorite preview",
    );
  });
});
