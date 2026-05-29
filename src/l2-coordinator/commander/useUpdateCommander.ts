import { useCallback, useEffect } from "react";
import { useUpdateStore } from "@/l2-coordinator/data-clerk/stores/useUpdateStore";
import { UPDATE_CHECK_DELAY_MS } from "@/utils/constants";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";

let automaticUpdateCheckStarted = false;
let availableUpdate: Update | null = null;
let downloadedUpdate: Update | null = null;

function isUpdaterEnabled(): boolean {
  return import.meta.env.PROD && import.meta.env.VITE_ENABLE_UPDATER === "true";
}

async function closeUpdate(update: Update | null): Promise<void> {
  if (!update) return;
  try {
    await update.close();
  } catch {
    // The native updater resource may already be closed after installation.
  }
}

async function replaceAvailableUpdate(update: Update | null): Promise<void> {
  if (availableUpdate !== update) {
    await closeUpdate(availableUpdate);
  }
  availableUpdate = update;
}

async function checkSignedUpdate(): Promise<Update | null> {
  const { check } = await import("@tauri-apps/plugin-updater");
  return check({ timeout: 30_000 });
}

function updateDownloadProgress(event: DownloadEvent) {
  if (event.event === "Started") {
    useUpdateStore.getState().setProgress(0, event.data.contentLength ?? 0);
    return;
  }

  if (event.event === "Progress") {
    const { downloadedBytes, totalBytes } = useUpdateStore.getState();
    useUpdateStore
      .getState()
      .setProgress(downloadedBytes + event.data.chunkLength, totalBytes);
  }
}

export function useUpdateCommander() {
  const store = useUpdateStore();

  const checkUpdate = useCallback(async (): Promise<boolean> => {
    if (!isUpdaterEnabled()) {
      useUpdateStore.getState().setStatus("idle");
      return false;
    }

    useUpdateStore.getState().setStatus("checking");

    try {
      const update = await checkSignedUpdate();

      if (update) {
        await replaceAvailableUpdate(update);
        useUpdateStore.getState().setVersion(update.version, update.body ?? "");
        return true;
      }

      await replaceAvailableUpdate(null);
      useUpdateStore.getState().setStatus("idle");
      return false;
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "检查更新失败",
      );
      return false;
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!isUpdaterEnabled()) {
      useUpdateStore.getState().setError("当前构建未启用自动更新");
      return;
    }

    useUpdateStore.getState().setStatus("downloading");

    try {
      const update = availableUpdate ?? (await checkSignedUpdate());
      if (!update) {
        useUpdateStore.getState().setStatus("idle");
        return;
      }

      await update.download(updateDownloadProgress, { timeout: 120_000 });

      downloadedUpdate = update;
      availableUpdate = null;
      useUpdateStore.getState().setStatus("ready");
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "下载更新失败",
      );
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    if (!isUpdaterEnabled()) {
      useUpdateStore.getState().setError("当前构建未启用自动更新");
      return;
    }

    try {
      const update = downloadedUpdate ?? (await checkSignedUpdate());
      if (update) {
        if (downloadedUpdate) {
          await update.install();
        } else {
          await update.downloadAndInstall(updateDownloadProgress, { timeout: 120_000 });
        }
        downloadedUpdate = null;
      }
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "安装更新失败，请手动下载",
      );
    }
  }, []);

  const dismissUpdate = useCallback(async () => {
    await closeUpdate(availableUpdate);
    await closeUpdate(downloadedUpdate);
    availableUpdate = null;
    downloadedUpdate = null;
    useUpdateStore.getState().reset();
  }, []);

  return {
    status: store.status,
    version: store.version,
    notes: store.notes,
    progress: store.progress,
    totalBytes: store.totalBytes,
    downloadedBytes: store.downloadedBytes,
    errorMessage: store.errorMessage,
    checkUpdate,
    downloadUpdate,
    installAndRestart,
    dismissUpdate,
  };
}

export function useUpdateLifecycle() {
  const { checkUpdate } = useUpdateCommander();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (automaticUpdateCheckStarted) return;
      automaticUpdateCheckStarted = true;
      checkUpdate();
    }, UPDATE_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [checkUpdate]);
}
