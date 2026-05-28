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
  searchQuery: "",
  searchResults: null,
  searchLoading: false,
  topics: null,
  topicsLoading: false,
  profile: null,
  profileLoading: false,
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

  clearQAMessages: () => set({ qaMessages: [] }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSearchResults: (results: SemanticSearchResponse | null) =>
    set({ searchResults: results, searchLoading: false }),
  setSearchLoading: (loading: boolean) => set({ searchLoading: loading }),

  setTopics: (topics: TopicsResponse | null) => set({ topics, topicsLoading: false }),
  setTopicsLoading: (loading: boolean) => set({ topicsLoading: loading }),
  setProfile: (profile: ContactProfileData | null) => set({ profile, profileLoading: false }),
  setProfileLoading: (loading: boolean) => set({ profileLoading: loading }),

  setError: (error: string | null) => set({ error, phase: error ? "error" : undefined }),

  reset: () => set(initialState),
}));
