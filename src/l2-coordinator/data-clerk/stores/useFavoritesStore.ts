import { create } from "zustand";
import type {
  AdaptedFavoriteItem,
  AdaptedFavoritesResponse,
} from "@l4/network/chatExtensionsAdapters";
import type { LoadStatus } from "./useChatStore";

export interface FavoriteFilters {
  query: string;
  favType: string;
  limit: number;
}

interface FavoritesState {
  filters: FavoriteFilters;
  status: LoadStatus;
  error: string | null;
  count: number;
  items: AdaptedFavoriteItem[];
  selectedFavoriteId: string | null;
  selectedFavorite: AdaptedFavoriteItem | null;
}

interface FavoritesActions {
  setFilters: (filters: Partial<FavoriteFilters>) => void;
  setFavoritesLoading: () => void;
  setFavorites: (favorites: AdaptedFavoritesResponse) => void;
  setFavoritesError: (error: string) => void;
  selectFavorite: (id: string | null) => void;
  resetFavorites: () => void;
}

type FavoritesStore = FavoritesState & FavoritesActions;

const initialFilters: FavoriteFilters = {
  query: "",
  favType: "",
  limit: 50,
};

const initialState: FavoritesState = {
  filters: initialFilters,
  status: "idle",
  error: null,
  count: 0,
  items: [],
  selectedFavoriteId: null,
  selectedFavorite: null,
};

export const useFavoritesStore = create<FavoritesStore>((set) => ({
  ...initialState,
  setFilters: (filters) =>
    set((state) => ({
      filters: {
        ...state.filters,
        ...filters,
      },
    })),
  setFavoritesLoading: () => set({ status: "loading", error: null }),
  setFavorites: (favorites) =>
    set((state) => {
      const selectedFavorite = favorites.items.find(
        (item) => item.id === state.selectedFavoriteId,
      ) ?? null;

      return {
        status: favorites.items.length === 0 ? "empty" : "ready",
        error: null,
        count: favorites.count,
        items: favorites.items,
        selectedFavorite,
      };
    }),
  setFavoritesError: (error) => set({ status: "error", error }),
  selectFavorite: (id) =>
    set((state) => ({
      selectedFavoriteId: id,
      selectedFavorite: state.items.find((item) => item.id === id) ?? null,
    })),
  resetFavorites: () => set(initialState),
}));
