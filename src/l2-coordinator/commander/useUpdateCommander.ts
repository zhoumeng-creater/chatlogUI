import { useCallback, useEffect } from "react";
import { useUpdateStore } from "@/l2-coordinator/data-clerk/stores/useUpdateStore";
import { fetchUpdateJson } from "@l4/network/fetchUpdateJson";
import { UPDATE_CHECK_DELAY_MS } from "@/utils/constants";
import type { UpdateManifest } from "@/l2-coordinator/api-docs/update";

export function useUpdateCommander() {
  const store = useUpdateStore();

  const checkUpdate = useCallback(async (): Promise<boolean> => {
    useUpdateStore.getState().setStatus("checking");

    try {
      const manifest: UpdateManifest = await fetchUpdateJson();
      const currentVersion = "0.1.0";

      if (manifest.version !== currentVersion) {
        useUpdateStore.getState().setVersion(manifest.version, manifest.notes);
        return true;
      }

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
    useUpdateStore.getState().setStatus("downloading");

    try {
      const manifest = await fetchUpdateJson();
      const platform = getPlatformKey();
      const entry = manifest.platforms[platform];
      if (!entry) {
        useUpdateStore.getState().setError("当前平台无可用更新包");
        return;
      }

      const response = await fetch(entry.url);
      if (!response.ok) {
        throw new Error(`下载失败: HTTP ${response.status}`);
      }

      const total = parseInt(response.headers.get("content-length") ?? "0", 10);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("无法读取下载流");
      }

      const chunks: Uint8Array[] = [];
      let downloaded = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        downloaded += value.length;
        useUpdateStore.getState().setProgress(downloaded, total);
      }

      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = getInstallerFilename(platform);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      useUpdateStore.getState().setStatus("ready");
    } catch (error) {
      useUpdateStore.getState().setError(
        error instanceof Error ? error.message : "下载更新失败",
      );
    }
  }, []);

  const installAndRestart = useCallback(async () => {
    try {
      const { checkUpdate: tauriCheckUpdate } = await import(
        "@tauri-apps/plugin-updater"
      );
      const result = await tauriCheckUpdate();
      if (result?.available) {
        await result.downloadAndInstall();
      }
    } catch {
      useUpdateStore.getState().setError("安装更新失败，请手动下载");
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    useUpdateStore.getState().reset();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate();
    }, UPDATE_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [checkUpdate]);

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

function getPlatformKey(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("mac os")) {
    return ua.includes("arm") || ua.includes("aarch64")
      ? "darwin-aarch64"
      : "darwin-x86_64";
  }
  return "windows-x86_64";
}

function getInstallerFilename(platform: string): string {
  if (platform.startsWith("darwin")) {
    return `chatlog_alpha_${platform}.dmg`;
  }
  return `chatlog_alpha_${platform}.msi`;
}
