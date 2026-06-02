import { useCallback, useEffect } from "react";
import { useUpdateStore } from "@/l2-coordinator/data-clerk/stores/useUpdateStore";
import { UPDATE_CHECK_DELAY_MS } from "@/utils/constants";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import type { DownloadEvent, Update } from "@tauri-apps/plugin-updater";
import type {
  DiagnosticEventLevel,
  DiagnosticRecoveryHint,
} from "@l4/network/diagnosticEvents";
import { recordLocalDiagnosticEvent } from "./diagnosticEventBridge";

let automaticUpdateCheckStarted = false;
let availableUpdate: Update | null = null;
let downloadedUpdate: Update | null = null;

interface UpdateDiagnosticEventInput {
  level: DiagnosticEventLevel;
  category: string;
  summary: string;
  recoveryHint?: DiagnosticRecoveryHint;
}

function isUpdaterEnabled(): boolean {
  return import.meta.env.PROD && import.meta.env.VITE_ENABLE_UPDATER === "true";
}

export function recordUpdateDiagnosticEvent(input: UpdateDiagnosticEventInput) {
  return recordLocalDiagnosticEvent({
    source: "updater",
    level: input.level,
    category: input.category,
    summary: input.summary,
    recoveryHint: input.recoveryHint,
    attributes: {
      target: "app-update",
    },
  });
}

function formatUpdateError(error: unknown, fallback: string): string {
  return maskDiagnosticText(error instanceof Error ? error.message : fallback, {
    privacyMode: true,
  });
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
      recordUpdateDiagnosticEvent({
        level: "info",
        category: "update.disabled",
        summary: "Updater is disabled for the current build",
        recoveryHint: "open-settings",
      });
      return false;
    }

    useUpdateStore.getState().setStatus("checking");
    recordUpdateDiagnosticEvent({
      level: "debug",
      category: "update.check.start",
      summary: "Signed update check started",
      recoveryHint: "none",
    });

    try {
      const update = await checkSignedUpdate();

      if (update) {
        await replaceAvailableUpdate(update);
        useUpdateStore.getState().setVersion(update.version, update.body ?? "");
        recordUpdateDiagnosticEvent({
          level: "info",
          category: "update.available",
          summary: "Signed update is available",
          recoveryHint: "none",
        });
        return true;
      }

      await replaceAvailableUpdate(null);
      useUpdateStore.getState().setStatus("idle");
      recordUpdateDiagnosticEvent({
        level: "info",
        category: "update.none",
        summary: "Signed update check completed with no available update",
        recoveryHint: "none",
      });
      return false;
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "检查更新失败",
      );
      recordUpdateDiagnosticEvent({
        level: "error",
        category: "update.check.failed",
        summary: `Update check failed: ${formatUpdateError(error, "检查更新失败")}`,
        recoveryHint: "open-settings",
      });
      return false;
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    if (!isUpdaterEnabled()) {
      useUpdateStore.getState().setError("当前构建未启用自动更新");
      recordUpdateDiagnosticEvent({
        level: "warn",
        category: "update.download.disabled",
        summary: "Updater download was requested while updater is disabled",
        recoveryHint: "open-settings",
      });
      return;
    }

    useUpdateStore.getState().setStatus("downloading");
    recordUpdateDiagnosticEvent({
      level: "info",
      category: "update.download.start",
      summary: "Signed update download started",
      recoveryHint: "none",
    });

    try {
      const update = availableUpdate ?? (await checkSignedUpdate());
      if (!update) {
        useUpdateStore.getState().setStatus("idle");
        recordUpdateDiagnosticEvent({
          level: "warn",
          category: "update.download.unavailable",
          summary: "Update download was requested but no update is available",
          recoveryHint: "retry",
        });
        return;
      }

      await update.download(updateDownloadProgress, { timeout: 120_000 });

      downloadedUpdate = update;
      availableUpdate = null;
      useUpdateStore.getState().setStatus("ready");
      recordUpdateDiagnosticEvent({
        level: "info",
        category: "update.download.ready",
        summary: "Signed update download completed",
        recoveryHint: "none",
      });
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "下载更新失败",
      );
      recordUpdateDiagnosticEvent({
        level: "error",
        category: "update.download.failed",
        summary: `Update download failed: ${formatUpdateError(error, "下载更新失败")}`,
        recoveryHint: "retry",
      });
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    if (!isUpdaterEnabled()) {
      useUpdateStore.getState().setError("当前构建未启用自动更新");
      recordUpdateDiagnosticEvent({
        level: "warn",
        category: "update.install.disabled",
        summary: "Updater install was requested while updater is disabled",
        recoveryHint: "open-settings",
      });
      return;
    }

    try {
      const update = downloadedUpdate ?? (await checkSignedUpdate());
      if (update) {
        recordUpdateDiagnosticEvent({
          level: "info",
          category: "update.install.start",
          summary: "Signed update install was requested",
          recoveryHint: "none",
        });
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
      recordUpdateDiagnosticEvent({
        level: "error",
        category: "update.install.failed",
        summary: `Update install failed: ${formatUpdateError(error, "安装更新失败，请手动下载")}`,
        recoveryHint: "open-settings",
      });
    }
  }, []);

  const dismissUpdate = useCallback(async () => {
    await closeUpdate(availableUpdate);
    await closeUpdate(downloadedUpdate);
    availableUpdate = null;
    downloadedUpdate = null;
    useUpdateStore.getState().reset();
    recordUpdateDiagnosticEvent({
      level: "info",
      category: "update.dismiss",
      summary: "Update notification dismissed",
      recoveryHint: "none",
    });
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
