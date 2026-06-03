import { create } from "zustand";
import type { MediaAttachmentKind } from "@l4/network/mediaAdapters";

export type MediaPreviewStatus = "idle" | "loading" | "ready" | "error";

export interface MediaPreviewState {
  status: MediaPreviewStatus;
  attachmentId: string | null;
  kind: MediaAttachmentKind | null;
  title: string;
  objectUrl: string | null;
  mimeType: string;
  error: string | null;
}

interface MediaStoreState {
  preview: MediaPreviewState;
}

interface MediaStoreActions {
  setPreviewLoading: (input: {
    attachmentId: string;
    kind: MediaAttachmentKind;
    title: string;
  }) => void;
  setPreviewReady: (input: { objectUrl: string; mimeType: string }) => void;
  setPreviewError: (error: string) => void;
  closePreview: () => void;
  resetMedia: () => void;
}

type MediaStore = MediaStoreState & MediaStoreActions;

const idlePreview: MediaPreviewState = {
  status: "idle",
  attachmentId: null,
  kind: null,
  title: "",
  objectUrl: null,
  mimeType: "",
  error: null,
};

export const useMediaStore = create<MediaStore>((set, get) => ({
  preview: idlePreview,
  setPreviewLoading: (input) =>
    set((state) => {
      revokeObjectUrl(state.preview.objectUrl);
      return {
        preview: {
          status: "loading",
          attachmentId: input.attachmentId,
          kind: input.kind,
          title: input.title,
          objectUrl: null,
          mimeType: "",
          error: null,
        },
      };
    }),
  setPreviewReady: (input) =>
    set((state) => ({
      preview: {
        ...state.preview,
        status: "ready",
        objectUrl: input.objectUrl,
        mimeType: input.mimeType,
        error: null,
      },
    })),
  setPreviewError: (error) =>
    set((state) => ({
      preview: {
        ...state.preview,
        status: "error",
        error,
      },
    })),
  closePreview: () => {
    revokeObjectUrl(get().preview.objectUrl);
    set({ preview: idlePreview });
  },
  resetMedia: () => {
    revokeObjectUrl(get().preview.objectUrl);
    set({ preview: idlePreview });
  },
}));

function revokeObjectUrl(objectUrl: string | null): void {
  if (!objectUrl) return;
  URL.revokeObjectURL?.(objectUrl);
}
