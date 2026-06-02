import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import type {
  SetupMode,
  ConfigSource,
} from "@l2/data-clerk/types/setup";
import {
  importDataDirConfig,
  saveManagedServerConfig,
  loadManagedServerConfigSummary,
  validateManagedServerConfig,
  type ServerConfigDraft,
} from "@l4/system/chatlogConfig";
import {
  inspectPort,
  startManagedSidecar,
  stopManagedSidecar,
  toPortState,
} from "@l4/system/sidecarManager";
import { openDirectoryPicker } from "@l4/system/openDirectoryPicker";
import { fetchHealth, fetchDbReadiness } from "@l4/network/readiness";
import { createDiagnosticHttpOptions } from "./diagnosticEventBridge";
import { deriveSetupStep } from "./setupMachine";

function isProfileConfigValid(profile: ReturnType<typeof useSetupStore.getState>["profile"]): boolean {
  return Boolean(
    profile?.dataDir &&
    profile.hasDataKey &&
    profile.platform &&
    profile.version &&
    profile.fullVersion,
  );
}

function portFromAddress(value: string): number {
  return Number(value.split(":").pop()) || 5030;
}

function createSetupReadinessDiagnostics(correlationId: string) {
  return createDiagnosticHttpOptions({
    endpointFamily: "setup-readiness",
    correlationId,
    recoveryHint: "check-service",
  });
}

export interface SetupCommander {
  loadExistingProfile: () => Promise<void>;
  chooseMode: (mode: SetupMode) => void;
  importDataDirectory: (path: string) => Promise<void>;
  chooseAndImportDataDirectory: () => Promise<string | null>;
  saveManualConfig: (draft: ServerConfigDraft) => Promise<void>;
  inspectServicePort: () => Promise<void>;
  startManagedService: () => Promise<void>;
  connectExternalService: (baseUrl: string) => Promise<void>;
  checkReadiness: () => Promise<void>;
  stopManagedService: () => Promise<void>;
  openWorkbench: () => void;
}

export function useSetupCommander(): SetupCommander {
  const navigate = useNavigate();
  const setMode = useSetupStore((s) => s.setMode);
  const setCurrentStep = useSetupStore((s) => s.setCurrentStep);
  const setProfile = useSetupStore((s) => s.setProfile);
  const setPortState = useSetupStore((s) => s.setPortState);
  const setReadiness = useSetupStore((s) => s.setReadiness);
  const setLoading = useSetupStore((s) => s.setLoading);
  const setError = useSetupStore((s) => s.setError);

  const syncStep = useCallback(() => {
    const state = useSetupStore.getState();
    const snapshot = {
      mode: state.mode,
      source: (state.profile?.source ?? "none") as ConfigSource,
      profileComplete: state.profile !== null,
      configValid: isProfileConfigValid(state.profile),
      portState: state.portState,
      httpReady: state.httpReady,
      dbReady: state.dbReady,
    };
    setCurrentStep(deriveSetupStep(snapshot));
  }, [setCurrentStep]);

  const loadExistingProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const summary = await loadManagedServerConfigSummary();
      if (summary) {
        setProfile(summary);
        setMode(summary.mode);
        syncStep();
      }
    } catch {
      // no existing profile
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setMode, setProfile, syncStep]);

  const chooseMode = useCallback(
    (mode: SetupMode) => {
      setMode(mode);
      if (mode === "external") {
        setProfile({
          mode: "external",
          source: "external-service",
          configDir: null,
          dataDir: null,
          workDir: null,
          httpAddr: "127.0.0.1:5030",
          port: 5030,
          platform: null,
          version: null,
          fullVersion: null,
          hasDataKey: false,
          hasImgKey: false,
          lastValidatedAt: null,
        });
        setCurrentStep("service");
      } else {
        setCurrentStep("config");
      }
    },
    [setCurrentStep, setMode, setProfile],
  );

  const importDataDirectory = useCallback(
    async (path: string) => {
      setLoading(true);
      setError(null);
      try {
        const summary = await importDataDirConfig(path);
        setProfile(summary);
        syncStep();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setProfile, syncStep],
  );

  const chooseAndImportDataDirectory = useCallback(async () => {
    const dir = await openDirectoryPicker();
    if (!dir) return null;
    await importDataDirectory(dir);
    return dir;
  }, [importDataDirectory]);

  const saveManualConfig = useCallback(
    async (draft: ServerConfigDraft) => {
      setLoading(true);
      setError(null);
      try {
        const errors = await validateManagedServerConfig(draft);
        if (errors.length > 0) {
          setError(errors.map((e) => e.message).join("; "));
          return;
        }
        const summary = await saveManagedServerConfig(draft);
        setProfile(summary);
        syncStep();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setProfile, syncStep],
  );

  const inspectServicePort = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = useSetupStore.getState().profile;
      const result = await inspectPort(profile?.port ?? 5030);
      setPortState(toPortState(result));
      syncStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPortState, syncStep]);

  const startManagedService = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = useSetupStore.getState().profile;
      if (!profile) {
        setError("未找到配置");
        return;
      }
      const inspection = await inspectPort(profile.port);
      const inspectedPortState = toPortState(inspection);
      setPortState(inspectedPortState);
      if (inspectedPortState === "external-chatlog") {
        setError("5030 端口已有外部 chatlog_alpha 服务。请切换到外部服务模式连接，或手动停止该服务后再启动托管服务。");
        syncStep();
        return;
      }
      if (inspectedPortState === "occupied") {
        setError("5030 端口被其他进程占用。请关闭该进程或修改服务端口后再启动。");
        syncStep();
        return;
      }
      if (inspectedPortState === "owned") {
        const healthy = await fetchHealth(
          profile.httpAddr,
          createSetupReadinessDiagnostics("managed-owned-health"),
        );
        setReadiness({ httpReady: healthy });
        if (healthy) {
          const dbResult = await fetchDbReadiness(
            profile.httpAddr,
            createSetupReadinessDiagnostics("managed-owned-db"),
          );
          setReadiness({ dbReady: dbResult.ready });
        }
        syncStep();
        return;
      }
      await startManagedSidecar({
        mode: "managed",
        configDir: profile.configDir,
        dataDir: profile.dataDir,
        workDir: profile.workDir,
        httpAddr: profile.httpAddr,
      });
      setPortState("owned");
      const healthy = await fetchHealth(
        profile.httpAddr,
        createSetupReadinessDiagnostics("managed-start-health"),
      );
      setReadiness({ httpReady: healthy });
      if (healthy) {
        const dbResult = await fetchDbReadiness(
          profile.httpAddr,
          createSetupReadinessDiagnostics("managed-start-db"),
        );
        setReadiness({ dbReady: dbResult.ready });
      }
      syncStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setPortState, setReadiness, syncStep]);

  const connectExternalService = useCallback(
    async (baseUrl: string) => {
      setLoading(true);
      setError(null);
      try {
        const healthy = await fetchHealth(
          baseUrl,
          createSetupReadinessDiagnostics("external-health"),
        );
        if (!healthy) {
          setError("无法连接到外部服务");
          return;
        }
        setReadiness({ httpReady: true });
        const dbResult = await fetchDbReadiness(
          baseUrl,
          createSetupReadinessDiagnostics("external-db"),
        );
        setReadiness({ dbReady: dbResult.ready });
        setProfile({
          mode: "external",
          source: "external-service",
          configDir: null,
          dataDir: null,
          workDir: null,
          httpAddr: baseUrl,
          port: portFromAddress(baseUrl),
          platform: null,
          version: null,
          fullVersion: null,
          hasDataKey: false,
          hasImgKey: false,
          lastValidatedAt: new Date().toISOString(),
        });
        syncStep();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, setProfile, setReadiness, syncStep],
  );

  const checkReadiness = useCallback(async () => {
    const profile = useSetupStore.getState().profile;
    const baseUrl = profile?.httpAddr ?? "http://127.0.0.1:5030";
    try {
      const healthy = await fetchHealth(
        baseUrl,
        createSetupReadinessDiagnostics("setup-check-health"),
      );
      setReadiness({ httpReady: healthy });

        if (healthy) {
          const dbResult = await fetchDbReadiness(
            baseUrl,
            createSetupReadinessDiagnostics("setup-check-db"),
          );
          setReadiness({ dbReady: dbResult.ready });
      }
      syncStep();
    } catch {
      setReadiness({ httpReady: false });
      syncStep();
    }
  }, [setReadiness, syncStep]);

  const stopManagedService = useCallback(async () => {
    try {
      await stopManagedSidecar();
      setPortState("free");
      setReadiness({ httpReady: false, dbReady: false });
      syncStep();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [setError, setPortState, setReadiness, syncStep]);

  const openWorkbench = useCallback(() => {
    navigate("/workbench", { replace: true });
  }, [navigate]);

  return {
    loadExistingProfile,
    chooseMode,
    importDataDirectory,
    chooseAndImportDataDirectory,
    saveManualConfig,
    inspectServicePort,
    startManagedService,
    connectExternalService,
    checkReadiness,
    stopManagedService,
    openWorkbench,
  };
}
