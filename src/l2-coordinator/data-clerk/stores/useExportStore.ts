import { create } from "zustand";
import type {
  BusinessExportArtifact,
  BusinessExportError,
  BusinessExportJob,
  BusinessExportExtension,
} from "@/l2-coordinator/commander/businessExportModel";

export interface BusinessExportResultSummary {
  fileName: string;
  extension: BusinessExportExtension;
  bytesWritten: number;
  locationSummary: string;
}

interface ExportState {
  currentJob: BusinessExportJob | null;
  transientArtifact: BusinessExportArtifact | null;
  safeResultSummary: BusinessExportResultSummary | null;
  stopWaitingMessage: string | null;
  beginExport: (job: BusinessExportJob, artifact: BusinessExportArtifact) => void;
  startWriting: (jobId: string) => void;
  completeExport: (jobId: string, summary: BusinessExportResultSummary) => void;
  failExport: (jobId: string, error: BusinessExportError) => void;
  cancelExport: (jobId: string) => void;
  resetExport: () => void;
}

export const useExportStore = create<ExportState>((set) => ({
  currentJob: null,
  transientArtifact: null,
  safeResultSummary: null,
  stopWaitingMessage: null,

  beginExport: (job, artifact) => set({
    currentJob: {
      ...job,
      status: job.status === "partial" ? "partial" : "confirming",
      error: null,
    },
    transientArtifact: artifact,
    safeResultSummary: null,
    stopWaitingMessage: null,
  }),

  startWriting: (jobId) => set((state) => {
    if (state.currentJob?.id !== jobId) return {};
    return {
      currentJob: { ...state.currentJob, status: "writing", error: null },
      stopWaitingMessage: null,
    };
  }),

  completeExport: (jobId, summary) => set((state) => {
    if (state.currentJob?.id !== jobId) return {};
    return {
      currentJob: { ...state.currentJob, status: "completed", error: null },
      transientArtifact: null,
      safeResultSummary: summary,
      stopWaitingMessage: null,
    };
  }),

  failExport: (jobId, error) => set((state) => {
    if (state.currentJob?.id !== jobId) return {};
    return {
      currentJob: { ...state.currentJob, status: "failed", error },
      transientArtifact: null,
      safeResultSummary: null,
      stopWaitingMessage: null,
    };
  }),

  cancelExport: (jobId) => set((state) => {
    if (state.currentJob?.id !== jobId) return {};
    const writing = state.currentJob.status === "writing";
    return {
      currentJob: {
        ...state.currentJob,
        status: writing ? "cancelling" : "cancelled",
        error: null,
      },
      transientArtifact: writing ? state.transientArtifact : null,
      safeResultSummary: null,
      stopWaitingMessage: writing ? "已停止等待，文件写入可能仍在系统中完成。" : null,
    };
  }),

  resetExport: () => set({
    currentJob: null,
    transientArtifact: null,
    safeResultSummary: null,
    stopWaitingMessage: null,
  }),
}));
