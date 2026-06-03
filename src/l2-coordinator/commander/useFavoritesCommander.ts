import { useCallback } from "react";
import { useFavoritesStore, type FavoriteFilters } from "@l2/data-clerk/stores/useFavoritesStore";
import { fetchFavorites } from "@l4/network";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

export async function loadFavoritesIntoStore(filters: Partial<FavoriteFilters> = {}): Promise<void> {
  const store = useFavoritesStore.getState();
  const nextFilters = {
    ...store.filters,
    ...filters,
  };

  useFavoritesStore.getState().setFilters(nextFilters);
  useFavoritesStore.getState().setFavoritesLoading();

  try {
    const favorites = await fetchFavorites(
      {
        limit: nextFilters.limit,
        favType: nextFilters.favType || undefined,
        query: nextFilters.query || undefined,
      },
      createDiagnosticHttpOptions({
        endpointFamily: "favorites",
        method: "GET",
        recoveryHint: "retry",
      }),
    );

    useFavoritesStore.getState().setFavorites(favorites);
  } catch {
    useFavoritesStore.getState().setFavoritesError("加载收藏失败");
  }
}

export function useFavoritesCommander() {
  const store = useFavoritesStore();

  const loadFavorites = useCallback(
    (filters: Partial<FavoriteFilters> = {}) => loadFavoritesIntoStore(filters),
    [],
  );

  return {
    ...store,
    loadFavorites,
  };
}
