import { useCallback } from "react";
import { useMediaStore } from "@l2/data-clerk/stores/useMediaStore";
import { fetchMediaBlob } from "@l4/network";
import type { MediaAttachment } from "@l4/network/mediaAdapters";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";

export async function openMediaPreview(attachment: MediaAttachment): Promise<void> {
  useMediaStore.getState().setPreviewLoading({
    attachmentId: attachment.id,
    kind: attachment.kind,
    title: attachment.label,
  });

  if (!attachment.fetchRef.key) {
    useMediaStore.getState().setPreviewError("该媒体缺少可读取的资源引用");
    return;
  }

  try {
    const result = await fetchMediaBlob(
      {
        endpointFamily: attachment.fetchRef.endpointFamily,
        key: attachment.fetchRef.key,
      },
      createDiagnosticHttpOptions({
        endpointFamily: attachment.fetchRef.endpointFamily,
        method: "GET",
        recoveryHint: "retry",
      }),
    );

    const objectUrl = URL.createObjectURL(result.blob);
    if (!isCurrentPreview(attachment.id)) {
      URL.revokeObjectURL?.(objectUrl);
      return;
    }

    useMediaStore.getState().setPreviewReady({
      objectUrl,
      mimeType: result.mimeType,
    });
  } catch {
    if (!isCurrentPreview(attachment.id)) return;
    useMediaStore.getState().setPreviewError("加载媒体失败");
  }
}

export function closeMediaPreview(): void {
  useMediaStore.getState().closePreview();
}

export function useMediaCommander() {
  const store = useMediaStore();
  const openPreview = useCallback((attachment: MediaAttachment) => openMediaPreview(attachment), []);
  const closePreview = useCallback(() => closeMediaPreview(), []);

  return {
    ...store,
    openPreview,
    closePreview,
  };
}

function isCurrentPreview(attachmentId: string): boolean {
  return useMediaStore.getState().preview.attachmentId === attachmentId;
}
