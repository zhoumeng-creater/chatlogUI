import { create } from "zustand";
import type { AiState, AiActions, AiPhase, SemanticConfig, IndexStatusResponse, QAMessage, TopicsResponse, ContactProfileData, SemanticSearchResponse } from "@/l2-coordinator/api-docs/semantic";
import { QA_MAX_HISTORY } from "@/utils/constants";

type AiStore = AiState & AiActions;

const initialState: AiState = {
  phase: "idle",
  config: null,
  indexStatus: null,
  qaMessages: [],
  qaLoading: false,
  qaStreaming: false,
  qaStatus: "idle",
  qaError: null,
  searchQuery: "",
  searchResults: null,
  searchLoading: false,
  searchError: null,
  topics: null,
  topicsLoading: false,
  topicsError: null,
  profile: null,
  profileLoading: false,
  profileError: null,
  error: null,
};

export const useAiStore = create<AiStore>((set) => ({
  ...initialState,

  setPhase: (phase: AiPhase) => set({ phase }),

  setConfig: (config: SemanticConfig) => set({ config, phase: "configured" }),

  setIndexStatus: (status: IndexStatusResponse) => set({ indexStatus: status }),

  addQAMessage: (msg: QAMessage) =>
    set((state) => ({
      qaMessages: [...state.qaMessages.slice(-QA_MAX_HISTORY + 1), msg],
    })),

  appendQAToken: (msgId: string, token: string) =>
    set((state) => ({
      qaMessages: state.qaMessages.map((m) =>
        m.id === msgId ? { ...m, content: m.content + token } : m
      ),
    })),

  setQALoading: (loading: boolean) => set({ qaLoading: loading }),
  setQAStreaming: (streaming: boolean) => set({ qaStreaming: streaming }),
  setQAStatus: (qaStatus) =>
    set({
      qaStatus,
      qaStreaming: qaStatus === "connecting" || qaStatus === "streaming",
    }),
  setQAError: (qaError: string | null) => set({ qaError }),

  clearQAMessages: () => set({ qaMessages: [], qaStatus: "idle", qaError: null }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSearchResults: (results: SemanticSearchResponse | null) =>
    set({ searchResults: results, searchLoading: false, searchError: null }),
  setSearchLoading: (loading: boolean) => set({ searchLoading: loading }),
  setSearchError: (searchError: string | null) => set({ searchError, searchLoading: false }),

  setTopics: (topics: TopicsResponse | null) => set({ topics, topicsLoading: false, topicsError: null }),
  setTopicsLoading: (loading: boolean) => set({ topicsLoading: loading }),
  setTopicsError: (topicsError: string | null) => set({ topicsError, topicsLoading: false }),
  setProfile: (profile: ContactProfileData | null) => set({ profile, profileLoading: false, profileError: null }),
  setProfileLoading: (loading: boolean) => set({ profileLoading: loading }),
  setProfileError: (profileError: string | null) => set({ profileError, profileLoading: false }),

  setError: (error: string | null) => set({ error, phase: error ? "error" : undefined }),

  reset: () => set(initialState),
}));
