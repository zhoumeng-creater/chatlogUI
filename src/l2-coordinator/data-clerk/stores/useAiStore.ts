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
  lastStablePhase: "idle",
  config: null,
  indexStatus: null,
  qaMessages: [],
  qaLoading: false,
  qaStreaming: false,
  qaStatus: "idle",
  qaError: null,
  activeQAStreamId: null,
  searchQuery: "",
  searchResults: null,
  searchLoading: false,
  searchError: null,
  discoveryWindow: "30d",
  discoverySearchScope: "contact",
  discoveryDepth: "standard",
  discoverySourceLimit: 50,
  discoveryRerank: true,
  previewTalker: "",
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

export const useAiStore = create<AiStore>((set, get) => ({
  ...initialState,

  setPhase: (phase: AiPhase) =>
    set((state) => ({
      phase,
      lastStablePhase: phase === "error" ? state.lastStablePhase : phase,
    })),

  setConfig: (config: SemanticConfig) =>
    set({ config, phase: "configured", lastStablePhase: "configured" }),

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

  appendQATokenForStream: (streamId: string, msgId: string, token: string) =>
    set((state) => {
      if (state.activeQAStreamId !== streamId) return state;
      return {
        qaStatus: state.qaStatus === "connecting" ? "streaming" : state.qaStatus,
        qaStreaming: true,
        qaMessages: state.qaMessages.map((message) =>
          message.id === msgId
            ? { ...message, content: message.content + token }
            : message,
        ),
      };
    }),

  completeQAMessage: (msgId, completion) =>
    set((state) => ({
      qaMessages: state.qaMessages.map((message) =>
        message.id === msgId
          ? {
              ...message,
              content: completion.content,
              isStreaming: false,
              completionStatus: completion.completionStatus ?? "completed",
              evidence: completion.evidence ?? message.evidence ?? [],
              reason: completion.reason ?? message.reason ?? "",
              sourceCount: completion.sourceCount ?? message.sourceCount ?? 0,
              metadata: {
                ...(message.metadata ?? {}),
                ...(completion.metadata ?? {}),
              },
            }
          : message,
      ),
    })),

  completeQAMessageForStream: (streamId, msgId, completion) =>
    set((state) => {
      if (state.activeQAStreamId !== streamId) return state;
      const completionStatus =
        completion.completionStatus ?? (completion.content.trim() ? "completed" : "empty");
      return {
        activeQAStreamId: null,
        qaStatus: completionStatus === "empty" ? "empty" : "completed",
        qaStreaming: false,
        qaLoading: false,
        qaError: null,
        qaMessages: state.qaMessages.map((message) =>
          message.id === msgId
            ? {
                ...message,
                content: completion.content,
                isStreaming: false,
                completionStatus,
                evidence: completion.evidence ?? message.evidence ?? [],
                reason: completion.reason ?? message.reason ?? "",
                sourceCount: completion.sourceCount ?? message.sourceCount ?? 0,
                metadata: {
                  ...(message.metadata ?? {}),
                  ...(completion.metadata ?? {}),
                },
              }
            : message,
        ),
      };
    }),

  setQALoading: (loading: boolean) => set({ qaLoading: loading }),
  setQAStreaming: (streaming: boolean) => set({ qaStreaming: streaming }),
  setQAStatus: (qaStatus) =>
    set({
      qaStatus,
      qaStreaming: qaStatus === "connecting" || qaStatus === "streaming",
    }),
  setQAError: (qaError: string | null) => set({ qaError }),
  setActiveQAStream: (activeQAStreamId: string) => set({ activeQAStreamId }),
  clearActiveQAStream: (streamId?: string) =>
    set((state) => ({
      activeQAStreamId:
        streamId === undefined || state.activeQAStreamId === streamId
          ? null
          : state.activeQAStreamId,
    })),
  isActiveQAStream: (streamId: string) => get().activeQAStreamId === streamId,
  stopQAStream: (streamId: string, msgId: string) =>
    set((state) => {
      if (state.activeQAStreamId !== streamId) return state;
      return {
        activeQAStreamId: null,
        qaStatus: "stopped",
        qaStreaming: false,
        qaLoading: false,
        qaError: null,
        qaMessages: state.qaMessages.map((message) =>
          message.id === msgId
            ? { ...message, isStreaming: false, completionStatus: "stopped" }
            : message,
        ),
      };
    }),
  failQAStream: (streamId: string, msgId: string, error: string) =>
    set((state) => {
      if (state.activeQAStreamId !== streamId) return state;
      return {
        activeQAStreamId: null,
        qaStatus: "failed",
        qaStreaming: false,
        qaLoading: false,
        qaError: error,
        qaMessages: state.qaMessages.map((message) =>
          message.id === msgId
            ? {
                ...message,
                isStreaming: false,
                completionStatus: "failed",
                reason: error,
              }
            : message,
        ),
      };
    }),

  clearQAMessages: () =>
    set({ qaMessages: [], qaStatus: "idle", qaError: null, activeQAStreamId: null }),

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setSearchResults: (results: SemanticSearchResponse | null) =>
    set({ searchResults: results, searchLoading: false, searchError: null }),
  setSearchLoading: (loading: boolean) => set({ searchLoading: loading }),
  setSearchError: (searchError: string | null) => set({ searchError, searchLoading: false }),
  setDiscoveryWindow: (discoveryWindow: string) => set({ discoveryWindow }),
  setDiscoverySearchScope: (discoverySearchScope) => set({ discoverySearchScope }),
  setDiscoveryDepth: (discoveryDepth: string) => set({ discoveryDepth }),
  setDiscoverySourceLimit: (discoverySourceLimit: number) =>
    set({ discoverySourceLimit: clampInteger(discoverySourceLimit, 1, 100) }),
  setDiscoveryRerank: (discoveryRerank: boolean) => set({ discoveryRerank }),
  setPreviewTalker: (previewTalker: string) =>
    set({
      previewTalker,
      previewOffset: 0,
      preview: null,
      previewStatus: "idle",
      previewError: null,
    }),

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

  setError: (error: string | null) =>
    set((state) => {
      if (error) {
        const lastStablePhase = state.phase === "error" ? state.lastStablePhase : state.phase;
        return { error, phase: "error", lastStablePhase };
      }
      const phase = state.phase === "error"
        ? state.lastStablePhase || "idle"
        : state.phase || state.lastStablePhase || "idle";
      return {
        error: null,
        phase,
        lastStablePhase: phase === "error" ? "idle" : phase,
      };
    }),

  reset: () => set(initialState),
}));

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}
