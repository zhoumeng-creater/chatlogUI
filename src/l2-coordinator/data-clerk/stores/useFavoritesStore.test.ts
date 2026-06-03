import { beforeEach, describe, expect, it } from "vitest";
import { useFavoritesStore } from "./useFavoritesStore";

describe("useFavoritesStore", () => {
  beforeEach(() => {
    useFavoritesStore.getState().resetFavorites();
  });

  it("tracks filters, loading, ready state, and selected favorite", () => {
    useFavoritesStore.getState().setFilters({ query: "synthetic", favType: "text" });
    useFavoritesStore.getState().setFavoritesLoading();
    useFavoritesStore.getState().setFavorites({
      count: 1,
      items: [
        {
          id: "favorite_synthetic_001",
          type: "text",
          typeNum: 1,
          kindLabel: "文本",
          time: "2026-06-02 12:02",
          timestamp: 1800000002,
          preview: "Synthetic favorite preview",
          from: "member_synthetic_guest",
          chat: "Synthetic Group",
        },
      ],
    });
    useFavoritesStore.getState().selectFavorite("favorite_synthetic_001");

    expect(useFavoritesStore.getState()).toMatchObject({
      status: "ready",
      filters: { query: "synthetic", favType: "text", limit: 50 },
      selectedFavoriteId: "favorite_synthetic_001",
    });
    expect(useFavoritesStore.getState().selectedFavorite?.preview).toBe("Synthetic favorite preview");
  });

  it("records error state without dropping current filters", () => {
    useFavoritesStore.getState().setFilters({ query: "synthetic" });
    useFavoritesStore.getState().setFavoritesError("加载收藏失败");

    expect(useFavoritesStore.getState()).toMatchObject({
      status: "error",
      error: "加载收藏失败",
      filters: { query: "synthetic", favType: "", limit: 50 },
    });
  });
});
