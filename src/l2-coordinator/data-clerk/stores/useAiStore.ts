import { create } from "zustand";
import type { AiState, AiActions, AiPhase, SemanticConfig, IndexStatusResponse, QAMessage, TopicsResponse, ContactProfileData, SemanticSearchResponse } from "@/l2-coordinator/api-docs/semantic";
import { QA_MAX_HISTORY } from "@/utils/constants";
import type { SemanticIndexPreviewView, SemanticPreviewKind } from "@l4/network";

export type SemanticPreviewLoadStatus = "idle" | "loading" | "ready" | "empty" | "error";

interface AiPreviewState {
  previewStatus: SemanticPreviewLoadStatus;
  preview: SemanticIndexPreviewView | null;
  previewKind: SemanticPreviewKind;
  previewLimit: number;
  previewOffset: number;
  previewError: string | null;
}

interface AiPreviewActions {
  setPreviewLoading: () => void;
  setPreview: (preview: SemanticIndexPreviewView) => void;
  setPreviewError: (error: string | null) => void;
  setPreviewKind: (kind: SemanticPreviewKind) => void;
  setPreviewLimit: (limit: number) => void;
  setPreviewOffset: (offset: number) => void;
}

type AiStore = AiState & AiActions & AiPreviewState & AiPreviewActions;

const initialState: AiState & AiPreviewState = {
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
  previewStatus: "idle",
  preview: null,
  previewKind: "all",
  previewLimit: 20,
  previewOffset: 0,
  previewError: null,
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

  setPreviewLoading: () => set({ previewStatus: "loading", previewError: null }),
  setPreview: (preview: SemanticIndexPreviewView) =>
    set({
      preview,
      previewStatus: preview.rows.length > 0 ? "ready" : "empty",
      previewError: null,
      previewKind: preview.kind,
      previewLimit: preview.limit,
      previewOffset: preview.offset,
    }),
  setPreviewError: (previewError: string | null) =>
    set({ previewError, previewStatus: previewError ? "error" : "idle" }),
  setPreviewKind: (previewKind: SemanticPreviewKind) =>
    set({ previewKind, previewOffset: 0, preview: null, previewStatus: "idle", previewError: null }),
  setPreviewLimit: (previewLimit: number) =>
    set({ previewLimit: Math.max(1, Math.min(100, Math.round(previewLimit))), previewOffset: 0 }),
  setPreviewOffset: (previewOffset: number) =>
    set({ previewOffset: Math.max(0, Math.round(previewOffset)), previewStatus: "idle" }),

  setError: (error: string | null) => set({ error, phase: error ? "error" : undefined }),

  reset: () => set(initialState),
}));
