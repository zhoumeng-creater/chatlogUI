import { create } from "zustand";
import type {
  AiState,
  AiActions,
  AiPhase,
  SemanticConfig,
  IndexStatusResponse,
  QADonePayload,
  QAEvidenceSummary,
  QAMessage,
  TopicsResponse,
  ContactProfileData,
  SemanticSearchResponse,
} from "@/l2-coordinator/api-docs/semantic";
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

interface AiInternalState {
  lastStablePhase: AiPhase;
}

type AiStore = AiState & AiActions & AiPreviewState & AiPreviewActions & AiInternalState;

const initialState: AiState & AiPreviewState & AiInternalState = {
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

  setPhase: (phase: AiPhase) =>
    set((state) => ({
      phase,
      lastStablePhase: phase === "error" ? state.lastStablePhase : phase,
    })),

  setConfig: (config: SemanticConfig) => set({ config, phase: "configured", lastStablePhase: "configured" }),

  setIndexStatus: (status: IndexStatusResponse) => set({ indexStatus: status }),

  addQAMessage: (msg: QAMessage) =>
    set((state) => ({
      qaMessages: [
        ...state.qaMessages.slice(-QA_MAX_HISTORY + 1),
        msg.isStreaming && !msg.completionStatus ? { ...msg, completionStatus: "streaming" } : msg,
      ],
    })),

  startQAStream: (activeQAStreamId: string) =>
    set({
      activeQAStreamId,
      qaStatus: "connecting",
      qaError: null,
      qaLoading: true,
      qaStreaming: true,
    }),

  appendQAToken: (streamId: string, msgId: string, token: string) =>
    set((state) => {
      if (streamId !== state.activeQAStreamId) return {};
      return {
        qaStatus: state.qaStatus === "connecting" ? "streaming" : state.qaStatus,
        qaStreaming: true,
        qaMessages: state.qaMessages.map((m) =>
          m.id === msgId
            ? { ...m, content: m.content + token, isStreaming: true, completionStatus: "streaming" }
            : m
        ),
      };
    }),

  completeQAStream: (streamId: string, msgId: string, payload: QADonePayload) => {
    let accepted = false;
    set((state) => {
      if (streamId !== state.activeQAStreamId) return {};
      accepted = true;
      const existing = state.qaMessages.find((message) => message.id === msgId);
      const answer = existing?.content || payload.answer;
      const completionStatus = answer.trim() ? "completed" : "empty";
      const completionMetadata = qaCompletionMetadata(payload);
      return {
        activeQAStreamId: null,
        qaLoading: false,
        qaStreaming: false,
        qaStatus: completionStatus,
        qaMessages: state.qaMessages.map((message) =>
          message.id === msgId
            ? {
                ...message,
                content: answer,
                isStreaming: false,
                completionStatus,
                evidence: safeEvidence(payload.evidence),
                evidenceCount: completionMetadata.sourceCount ?? payload.evidence.length,
                reason: payload.reason,
                metadata: safeQAMetadata(completionMetadata),
                sourceCount: completionMetadata.sourceCount ?? payload.evidence.length,
                window: completionMetadata.window,
                depth: completionMetadata.depth,
                rerankTried: completionMetadata.rerankTried,
                rerankApplied: completionMetadata.rerankApplied,
                rerankError: completionMetadata.rerankError,
              }
            : message
        ),
      };
    });
    return accepted;
  },

  failQAStream: (streamId: string, qaError: string) => {
    let accepted = false;
    set((state) => {
      if (streamId !== state.activeQAStreamId) return {};
      accepted = true;
      return {
        activeQAStreamId: null,
        qaLoading: false,
        qaStreaming: false,
        qaStatus: "failed",
        qaError,
        qaMessages: state.qaMessages.map((message) =>
          message.streamId === streamId
            ? { ...message, isStreaming: false, completionStatus: "failed" }
            : message
        ),
      };
    });
    return accepted;
  },

  stopQAStream: (streamId: string) => {
    let accepted = false;
    set((state) => {
      if (streamId !== state.activeQAStreamId) return {};
      accepted = true;
      return {
        activeQAStreamId: null,
        qaLoading: false,
        qaStreaming: false,
        qaStatus: "stopped",
        qaMessages: state.qaMessages.map((message) =>
          message.streamId === streamId || message.isStreaming
            ? { ...message, isStreaming: false, completionStatus: "stopped" }
            : message
        ),
      };
    });
    return accepted;
  },

  setQALoading: (loading: boolean) => set({ qaLoading: loading }),
  setQAStreaming: (streaming: boolean) => set({ qaStreaming: streaming }),
  setQAStatus: (qaStatus) =>
    set({
      qaStatus,
      qaStreaming: qaStatus === "connecting" || qaStatus === "streaming",
    }),
  setQAError: (qaError: string | null) => set({ qaError }),

  clearQAMessages: () =>
    set({ qaMessages: [], qaStatus: "idle", qaError: null, activeQAStreamId: null, qaLoading: false, qaStreaming: false }),

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

  setError: (error: string | null) =>
    set((state) => {
      if (error) {
        return {
          error,
          phase: "error",
          lastStablePhase: state.phase === "error" ? state.lastStablePhase : state.phase,
        };
      }
      return {
        error: null,
        phase: state.phase === "error" ? state.lastStablePhase : state.phase,
      };
    }),

  reset: () => set(initialState),
}));

function safeEvidence(evidence: Array<Record<string, unknown>>): QAEvidenceSummary[] {
  return evidence.map((entry, index) => {
    const score = numberValue(entry.score) ?? numberValue(entry.relevance_score);
    return {
      label: `Evidence ${index + 1}`,
      kind: stringValue(entry.type) || stringValue(entry.kind) || stringValue(entry.source_type) || undefined,
      ...(score === undefined ? {} : { score }),
    };
  });
}

function qaCompletionMetadata(payload: QADonePayload) {
  const metadata = payload.metadata ?? {};
  return {
    sourceCount: numberValue(payload.sourceCount) ?? numberValue(metadata.source_count) ?? numberValue(metadata.sourceCount),
    window: stringValue(payload.window) || stringValue(metadata.window),
    depth: stringValue(payload.depth) || stringValue(metadata.depth),
    rerankTried: booleanValue(payload.rerankTried) ?? booleanValue(metadata.rerank_tried) ?? booleanValue(metadata.rerankTried),
    rerankApplied: booleanValue(payload.rerankApplied) ?? booleanValue(metadata.rerank_applied) ?? booleanValue(metadata.rerankApplied),
    rerankError: stringValue(payload.rerankError) || stringValue(metadata.rerank_error) || stringValue(metadata.rerankError),
  };
}

function safeQAMetadata(payload: ReturnType<typeof qaCompletionMetadata>): Record<string, unknown> {
  return {
    sourceCount: payload.sourceCount,
    window: payload.window,
    depth: payload.depth,
    rerankTried: payload.rerankTried,
    rerankApplied: payload.rerankApplied,
    rerankError: payload.rerankError,
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
