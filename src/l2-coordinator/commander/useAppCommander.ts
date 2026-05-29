import { useCallback, useRef } from "react";
import { useAppStore } from "@/l2-coordinator/data-clerk/stores/useAppStore";
import { useSettingsStore } from "@/l2-coordinator/data-clerk/stores/useSettingsStore";
import { translateError } from "@/l2-coordinator/diplomat/errorTranslator";
import { killPort, spawnSidecar, detectWxPath, openDirectoryPicker } from "@l4/system";
import { fetchDbStatus, fetchDbReady } from "@l4/network";
import { HEALTH_CHECK_INTERVAL_MS, HEALTH_CHECK_TIMEOUT_MS, HEALTH_CHECK_SUCCESS_COUNT } from "@/utils/constants";
import { resolveBootDataPath } from "./appBoot";

const DB_READY_POLL_INTERVAL_MS = 2000;
const DB_READY_TIMEOUT_MS = 120000;
let bootInFlight = false;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useAppCommander() {
  const { setPhase, setError, clearError, setSidecarStatus, setDbStatus, setWxDataPath, appPhase, errorMessage } =
    useAppStore();
  const abortRef = useRef(false);

  const pollHealthCheck = useCallback(async (): Promise<boolean> => {
    let successCount = 0;
    const startTime = Date.now();

    while (successCount < HEALTH_CHECK_SUCCESS_COUNT) {
      if (abortRef.current) return false;
      if (Date.now() - startTime > HEALTH_CHECK_TIMEOUT_MS) {
        setError("引擎启动超时，请检查系统资源");
        return false;
      }

      const result = await fetchDbStatus();

      if (result.ok) {
        successCount++;
      } else {
        successCount = 0;
      }

      await sleep(HEALTH_CHECK_INTERVAL_MS);
    }

    return true;
  }, [setError]);

  const pollDbReady = useCallback(async (): Promise<boolean> => {
    setDbStatus("connecting");
    const startTime = Date.now();

    let running = true;
    while (running) {
      if (abortRef.current) return false;
      if (Date.now() - startTime > DB_READY_TIMEOUT_MS) {
        setError("数据库连接超时，请检查数据目录");
        return false;
      }
      running = Date.now() - startTime < DB_READY_TIMEOUT_MS;

      const result = await fetchDbReady();
      if (result.ready) {
        setDbStatus("ready");
        return true;
      }

      await sleep(DB_READY_POLL_INTERVAL_MS);
    }
    return false;
  }, [setDbStatus, setError]);

  const boot = useCallback(async () => {
    if (bootInFlight) return;
    bootInFlight = true;
    abortRef.current = false;

    try {
      const settings = useSettingsStore.getState().settings;
      const candidates = await detectWxPath();
      const dataPath = resolveBootDataPath({
        settingsPath: settings.wxDataPath,
        candidates,
      });

      if (!dataPath) {
        setWxDataPath(null);
        setPhase("db_not_found");
        return;
      }

      setWxDataPath(dataPath);

      setPhase("killing_port");
      await killPort();

      setPhase("spawning_sidecar");
      setSidecarStatus("starting");
      await spawnSidecar({
        dataDir: dataPath,
        dataKey: settings.dataKey,
      });

      setPhase("health_check");
      const healthy = await pollHealthCheck();

      if (healthy) {
        setSidecarStatus("running");
      } else {
        return;
      }

      setPhase("db_connecting");
      const dbReady = await pollDbReady();
      if (!dbReady) return;

      setPhase("ready");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(translateError(message));
    } finally {
      bootInFlight = false;
    }
  }, [setPhase, setError, setSidecarStatus, setWxDataPath, pollHealthCheck, pollDbReady]);

  const chooseWxDataPath = useCallback(async () => {
    const selected = await openDirectoryPicker();
    if (!selected) return;

    const settingsStore = useSettingsStore.getState();
    settingsStore.updateSettings({ wxDataPath: selected });
    settingsStore.saveToStorage();
    setWxDataPath(selected);
    clearError();
    await boot();
  }, [boot, clearError, setWxDataPath]);

  const retry = useCallback(() => {
    clearError();
    boot();
  }, [clearError, boot]);

  const shutdown = useCallback(async () => {
    abortRef.current = true;
    useAppStore.getState().reset();
  }, []);

  return {
    status: appPhase,
    error: errorMessage,
    boot,
    retry,
    chooseWxDataPath,
    shutdown,
  };
}
